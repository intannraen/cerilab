import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import {
  BOOTSTRAPPED_LIBRARIAN_EMAIL,
  db,
  handleFirestoreError,
  OperationType,
} from '../firebase';
import { STARTER_BOOKS } from '../data/starterBooks';
import {
  BOOK_CATEGORIES,
  Book,
  BookCategory,
  BookInput,
  LibraryNotification,
  Loan,
  UserProfile,
} from '../types/library';

function clampString(value: string, maxLen: number): string {
  return value.trim().slice(0, maxLen);
}

function clampInt(value: number, min: number, max: number): number {
  const n = Math.round(Number(value));
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function validateCategory(cat: string): BookCategory {
  if ((BOOK_CATEGORIES as readonly string[]).includes(cat)) {
    return cat as BookCategory;
  }
  return 'Filsafat';
}

export function sanitizeBookInput(input: BookInput): BookInput {
  const totalCopies = clampInt(input.totalCopies, 1, 999);
  const availableCopies = clampInt(input.availableCopies, 0, totalCopies);
  return {
    title: clampString(input.title, 140) || 'Judul Buku',
    author: clampString(input.author, 100) || 'Penulis',
    isbn: clampString(input.isbn, 32) || '000-000',
    category: validateCategory(input.category),
    publishedYear: clampInt(input.publishedYear, 1400, 2100),
    pages: clampInt(input.pages, 1, 10000),
    synopsis: clampString(input.synopsis, 1500) || 'Ringkasan koleksi digital.',
    coverUrl: clampString(input.coverUrl, 500),
    totalCopies,
    availableCopies,
    loanDurationDays: clampInt(input.loanDurationDays, 1, 60),
    digitalReadExcerpt: clampString(input.digitalReadExcerpt, 4000),
  };
}

export function formatIndonesianDate(ts: Timestamp | Date | number | null | undefined): string {
  if (!ts) return '—';
  const date =
    ts instanceof Timestamp ? ts.toDate() : ts instanceof Date ? ts : new Date(ts);
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function getLoanTiming(loan: Loan, nowMs: number = Date.now()) {
  const dueMs = loan.dueAt?.toMillis?.() ?? nowMs;
  if (loan.status === 'returned') {
    return {
      isOverdue: false,
      isDueSoon: false,
      daysOverdue: 0,
      daysRemaining: 0,
    };
  }
  const diffMs = dueMs - nowMs;
  if (diffMs < 0) {
    const daysOverdue = Math.max(1, Math.ceil(Math.abs(diffMs) / 86400000));
    return {
      isOverdue: true,
      isDueSoon: false,
      daysOverdue,
      daysRemaining: 0,
    };
  }
  const daysRemaining = Math.ceil(diffMs / 86400000);
  const isDueSoon = diffMs <= 24 * 60 * 60 * 1000;
  return {
    isOverdue: false,
    isDueSoon,
    daysOverdue: 0,
    daysRemaining,
  };
}

export async function ensureUserProfile(user: User): Promise<UserProfile> {
  const userPath = `users/${user.uid}`;
  const userRef = doc(db, 'users', user.uid);
  const librarianRef = doc(db, 'librarians', user.uid);

  let isInLibrariansTable = false;
  try {
    const libSnap = await getDoc(librarianRef);
    isInLibrariansTable = libSnap.exists();
  } catch {
    // Non-librarians may not exist in /librarians
    isInLibrariansTable = false;
  }

  const isBootstrapped =
    user.emailVerified &&
    user.email?.toLowerCase() === BOOTSTRAPPED_LIBRARIAN_EMAIL.toLowerCase();
  const effectiveRole = isBootstrapped || isInLibrariansTable ? 'librarian' : 'member';

  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      const codeSuffix = user.uid.slice(0, 6).toUpperCase();
      const newProfile = {
        uid: user.uid,
        displayName: clampString(user.displayName || user.email?.split('@')[0] || 'Anggota', 100),
        email: clampString(user.email || 'anggota@cerilib.id', 160),
        memberCode: `CL-${codeSuffix}`,
        role: effectiveRole,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(userRef, newProfile);
      const createdSnap = await getDoc(userRef);
      return createdSnap.data() as UserProfile;
    }

    const existing = snap.data() as UserProfile;
    if (isBootstrapped && existing.role !== 'librarian') {
      await updateDoc(userRef, {
        role: 'librarian',
        updatedAt: serverTimestamp(),
      });
      return { ...existing, role: 'librarian' };
    }
    return {
      ...existing,
      role: effectiveRole === 'librarian' ? 'librarian' : existing.role,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, userPath);
  }
}

export async function seedStarterBooksIfEmpty(): Promise<number> {
  const path = 'books';
  try {
    const existingSnap = await getDocs(collection(db, 'books'));
    if (!existingSnap.empty) {
      return 0;
    }

    const batch = writeBatch(db);
    for (const starter of STARTER_BOOKS) {
      const { id, ...bookFields } = starter;
      const clean = sanitizeBookInput(bookFields);
      batch.set(doc(db, 'books', id), {
        ...clean,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
    return STARTER_BOOKS.length;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function createBook(input: BookInput): Promise<string> {
  const clean = sanitizeBookInput(input);
  const newBookRef = doc(collection(db, 'books'));
  try {
    await setDoc(newBookRef, {
      ...clean,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return newBookRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `books/${newBookRef.id}`);
  }
}

export async function updateBook(bookId: string, input: BookInput): Promise<void> {
  const clean = sanitizeBookInput(input);
  const bookRef = doc(db, 'books', bookId);
  try {
    await updateDoc(bookRef, {
      ...clean,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `books/${bookId}`);
  }
}

export async function deleteBook(bookId: string): Promise<void> {
  const bookRef = doc(db, 'books', bookId);
  try {
    await deleteDoc(bookRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `books/${bookId}`);
  }
}

export async function borrowBookOnline(params: {
  book: Book;
  user: UserProfile;
  durationDays: number;
}): Promise<string> {
  const { book, user, durationDays } = params;
  const safeDuration = clampInt(durationDays, 1, 60);
  const loanRef = doc(collection(db, 'loans'));
  const bookRef = doc(db, 'books', book.id);
  const dueDate = new Date(Date.now() + safeDuration * 24 * 60 * 60 * 1000);

  try {
    await runTransaction(db, async (tx) => {
      const freshBookSnap = await tx.get(bookRef);
      if (!freshBookSnap.exists()) {
        throw new Error('Buku tidak ditemukan di katalog.');
      }
      const freshBook = freshBookSnap.data();
      const currentAvailable = Number(freshBook.availableCopies ?? 0);
      if (currentAvailable < 1) {
        throw new Error('Semua salinan buku sedang dipinjam.');
      }

      tx.set(loanRef, {
        userId: user.uid,
        userName: clampString(user.displayName, 100),
        userEmail: clampString(user.email, 160),
        bookId: book.id,
        bookTitle: clampString(freshBook.title || book.title, 140),
        bookAuthor: clampString(freshBook.author || book.author, 100),
        bookCoverUrl: clampString(freshBook.coverUrl || book.coverUrl || '', 500),
        status: 'borrowed',
        borrowedAt: serverTimestamp(),
        dueAt: Timestamp.fromDate(dueDate),
        returnedAt: null,
        updatedAt: serverTimestamp(),
      });

      tx.update(bookRef, {
        availableCopies: currentAvailable - 1,
        updatedAt: serverTimestamp(),
      });
    });

    return loanRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `loans/${loanRef.id}`);
  }
}

export async function returnBorrowedBook(
  loan: Loan,
  relatedNotifications: LibraryNotification[] = [],
): Promise<void> {
  const loanRef = doc(db, 'loans', loan.id);
  const bookRef = doc(db, 'books', loan.bookId);

  try {
    await runTransaction(db, async (tx) => {
      const freshLoanSnap = await tx.get(loanRef);
      if (!freshLoanSnap.exists()) {
        throw new Error('Catatan peminjaman tidak ditemukan.');
      }
      if (freshLoanSnap.data().status !== 'borrowed') {
        throw new Error('Buku ini sudah dikembalikan sebelumnya.');
      }

      const freshBookSnap = await tx.get(bookRef);
      if (freshBookSnap.exists()) {
        const bookData = freshBookSnap.data();
        const currentAvailable = Number(bookData.availableCopies ?? 0);
        const totalCopies = Number(bookData.totalCopies ?? 1);
        const incremented = Math.min(totalCopies, currentAvailable + 1);
        tx.update(bookRef, {
          availableCopies: incremented,
          updatedAt: serverTimestamp(),
        });
      }

      tx.update(loanRef, {
        status: 'returned',
        returnedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    // Mark related notifications as read automatically upon return
    for (const notif of relatedNotifications) {
      if (notif.loanId === loan.id && !notif.isRead) {
        await markNotificationRead(notif.id);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `loans/${loan.id}`);
  }
}

export async function simulateLoanOverdue(loanId: string, daysPastDue: number = 2): Promise<void> {
  const loanRef = doc(db, 'loans', loanId);
  const pastDate = new Date(Date.now() - daysPastDue * 24 * 60 * 60 * 1000);
  try {
    await updateDoc(loanRef, {
      dueAt: Timestamp.fromDate(pastDate),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `loans/${loanId}`);
  }
}

export async function extendLoanDueDate(loan: Loan, extraDays: number = 3): Promise<void> {
  const loanRef = doc(db, 'loans', loan.id);
  const baseMs = Math.max(Date.now(), loan.dueAt.toMillis());
  const nextDue = new Date(baseMs + extraDays * 24 * 60 * 60 * 1000);
  try {
    await updateDoc(loanRef, {
      dueAt: Timestamp.fromDate(nextDue),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `loans/${loan.id}`);
  }
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const notifRef = doc(db, 'notifications', notificationId);
  try {
    await updateDoc(notifRef, {
      isRead: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `notifications/${notificationId}`);
  }
}

export async function syncOverdueNotifications(
  loans: Loan[],
  existingNotifications: LibraryNotification[],
  actingUserId: string,
  isLibrarian: boolean,
): Promise<number> {
  const nowMs = Date.now();
  const existingById = new Map<string, LibraryNotification>();
  for (const notif of existingNotifications) {
    existingById.set(notif.id, notif);
  }

  let createdOrUpdated = 0;

  for (const loan of loans) {
    if (loan.status !== 'borrowed') continue;
    if (!isLibrarian && loan.userId !== actingUserId) continue;

    const timing = getLoanTiming(loan, nowMs);
    if (timing.isOverdue) {
      const notifId = `notif_${loan.id}_overdue`;
      const existing = existingById.get(notifId);
      const dueStr = formatIndonesianDate(loan.dueAt);
      const message = clampString(
        `Pengembalian buku "${loan.bookTitle}" terlambat ${timing.daysOverdue} hari dari batas waktu (${dueStr}). Harap segera kembalikan melalui menu Peminjaman.`,
        500,
      );

      try {
        if (!existing) {
          await setDoc(doc(db, 'notifications', notifId), {
            userId: loan.userId,
            loanId: loan.id,
            bookId: loan.bookId,
            bookTitle: clampString(loan.bookTitle, 140),
            type: 'overdue',
            daysOverdue: clampInt(timing.daysOverdue, 1, 3650),
            message,
            isRead: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          createdOrUpdated++;
        } else if (existing.daysOverdue !== timing.daysOverdue) {
          await updateDoc(doc(db, 'notifications', notifId), {
            daysOverdue: clampInt(timing.daysOverdue, 1, 3650),
            message,
            updatedAt: serverTimestamp(),
          });
          createdOrUpdated++;
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `notifications/${notifId}`);
      }
    } else if (timing.isDueSoon) {
      const notifId = `notif_${loan.id}_due_soon`;
      if (!existingById.has(notifId)) {
        const dueStr = formatIndonesianDate(loan.dueAt);
        const message = clampString(
          `Pengingat otomatis: Buku "${loan.bookTitle}" akan jatuh tempo dalam kurang dari 24 jam (${dueStr}).`,
          500,
        );
        try {
          await setDoc(doc(db, 'notifications', notifId), {
            userId: loan.userId,
            loanId: loan.id,
            bookId: loan.bookId,
            bookTitle: clampString(loan.bookTitle, 140),
            type: 'due_soon',
            daysOverdue: 0,
            message,
            isRead: false,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          createdOrUpdated++;
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, `notifications/${notifId}`);
        }
      }
    }
  }

  return createdOrUpdated;
}

export async function toggleMemberLibrarianRole(
  targetUser: UserProfile,
  grantLibrarian: boolean,
  actingLibrarianUid: string,
): Promise<void> {
  const userRef = doc(db, 'users', targetUser.uid);
  const librarianRef = doc(db, 'librarians', targetUser.uid);

  try {
    if (grantLibrarian) {
      await setDoc(librarianRef, {
        uid: targetUser.uid,
        email: clampString(targetUser.email, 160),
        grantedBy: actingLibrarianUid,
        createdAt: serverTimestamp(),
      });
      await updateDoc(userRef, {
        role: 'librarian',
        updatedAt: serverTimestamp(),
      });
    } else {
      await deleteDoc(librarianRef);
      await updateDoc(userRef, {
        role: 'member',
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `librarians/${targetUser.uid}`);
  }
}
