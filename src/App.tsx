/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from './firebase';
import {
  borrowBookOnline,
  createBook,
  deleteBook,
  ensureUserProfile,
  extendLoanDueDate,
  markNotificationRead,
  returnBorrowedBook,
  seedStarterBooksIfEmpty,
  simulateLoanOverdue,
  syncOverdueNotifications,
  toggleMemberLibrarianRole,
  updateBook,
} from './services/libraryService';
import {
  ActiveTab,
  Book,
  BookInput,
  LibraryNotification,
  Loan,
  UserProfile,
  UserRole,
} from './types/library';
import { Header } from './components/Header';
import { CatalogView } from './components/CatalogView';
import { BookDetailModal } from './components/BookDetailModal';
import { DigitalReaderModal } from './components/DigitalReaderModal';
import { LoansHistoryView } from './components/LoansHistoryView';
import { NotificationsView } from './components/NotificationsView';
import { LibrarianView } from './components/LibrarianView';
import { AuthPortalModal } from './components/AuthPortalModal';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';

interface ToastBanner {
  id: number;
  type: 'success' | 'error';
  message: string;
}

const PORTAL_STORAGE_KEY = 'cerilib_portal_mode';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('catalog');
  const [portalMode, setPortalMode] = useState<UserRole>(() => {
    const saved = window.sessionStorage.getItem(PORTAL_STORAGE_KEY);
    return saved === 'librarian' ? 'librarian' : 'member';
  });

  const [authReady, setAuthReady] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialPortal, setAuthInitialPortal] = useState<UserRole>('member');
  const [authError, setAuthError] = useState<string | null>(null);
  const [pendingNonLibrarianEmail, setPendingNonLibrarianEmail] = useState<string | null>(null);

  const [books, setBooks] = useState<Book[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(true);
  const [allLoans, setAllLoans] = useState<Loan[]>([]);
  const [loadingLoans, setLoadingLoans] = useState(false);
  const [notifications, setNotifications] = useState<LibraryNotification[]>([]);
  const [allMembers, setAllMembers] = useState<UserProfile[]>([]);

  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [readingBook, setReadingBook] = useState<Book | null>(null);
  const [isBorrowing, setIsBorrowing] = useState(false);
  const [returningLoanId, setReturningLoanId] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [toast, setToast] = useState<ToastBanner | null>(null);

  const autoSeededRef = useRef(false);
  const syncInProgressRef = useRef(false);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ id: Date.now(), type, message });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const updatePortalMode = useCallback((mode: UserRole) => {
    setPortalMode(mode);
    window.sessionStorage.setItem(PORTAL_STORAGE_KEY, mode);
  }, []);

  // 1. Auth Listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const profile = await ensureUserProfile(user);
          setUserProfile(profile);
          // Safety: non-librarians can never stay in librarian portal mode
          if (profile.role !== 'librarian') {
            updatePortalMode('member');
          }
        } catch (err) {
          console.error(err);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
        setAllLoans([]);
        setNotifications([]);
        setAllMembers([]);
      }
      setAuthReady(true);
    });
    return () => unsub();
  }, [updatePortalMode]);

  // 2. Public Books Listener
  useEffect(() => {
    const booksRef = collection(db, 'books');
    const unsub = onSnapshot(
      booksRef,
      (snapshot) => {
        const list: Book[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Book, 'id'>),
        }));
        list.sort((a, b) => a.title.localeCompare(b.title, 'id'));
        setBooks(list);
        setLoadingBooks(false);
      },
      (error) => {
        setLoadingBooks(false);
        handleFirestoreError(error, OperationType.LIST, 'books');
      },
    );
    return () => unsub();
  }, []);

  // Keep selectedBook fresh when books snapshot updates
  useEffect(() => {
    if (!selectedBook) return;
    const updated = books.find((b) => b.id === selectedBook.id);
    if (updated) setSelectedBook(updated);
  }, [books, selectedBook]);

  // 3. Auto-seed starter books once if librarian signs in to empty catalog
  useEffect(() => {
    if (
      authReady &&
      userProfile?.role === 'librarian' &&
      !loadingBooks &&
      books.length === 0 &&
      !autoSeededRef.current
    ) {
      autoSeededRef.current = true;
      setIsSeeding(true);
      void seedStarterBooksIfEmpty()
        .then((count) => {
          if (count > 0) {
            showToast('success', `${count} buku awal dimuat ke katalog CeriLib.`);
          }
        })
        .finally(() => setIsSeeding(false));
    }
  }, [authReady, userProfile, loadingBooks, books.length, showToast]);

  // 4. Loans Listener (Scoped by role)
  useEffect(() => {
    if (!authReady || !userProfile) return;

    setLoadingLoans(true);
    const loansQuery =
      userProfile.role === 'librarian'
        ? collection(db, 'loans')
        : query(collection(db, 'loans'), where('userId', '==', userProfile.uid));

    const unsub = onSnapshot(
      loansQuery,
      (snapshot) => {
        const list: Loan[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Loan, 'id'>),
        }));
        setAllLoans(list);
        setLoadingLoans(false);
      },
      (error) => {
        setLoadingLoans(false);
        handleFirestoreError(error, OperationType.LIST, 'loans');
      },
    );
    return () => unsub();
  }, [authReady, userProfile]);

  // 5. Notifications Listener (Scoped by role)
  useEffect(() => {
    if (!authReady || !userProfile) return;

    const notifQuery =
      userProfile.role === 'librarian'
        ? collection(db, 'notifications')
        : query(
            collection(db, 'notifications'),
            where('userId', '==', userProfile.uid),
          );

    const unsub = onSnapshot(
      notifQuery,
      (snapshot) => {
        const list: LibraryNotification[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<LibraryNotification, 'id'>),
        }));
        setNotifications(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'notifications');
      },
    );
    return () => unsub();
  }, [authReady, userProfile]);

  // 6. Members Listener (Librarian only)
  useEffect(() => {
    if (!authReady || userProfile?.role !== 'librarian') {
      setAllMembers([]);
      return;
    }

    const unsub = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const list: UserProfile[] = snapshot.docs.map(
          (d) => d.data() as UserProfile,
        );
        list.sort((a, b) => a.displayName.localeCompare(b.displayName, 'id'));
        setAllMembers(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'users');
      },
    );
    return () => unsub();
  }, [authReady, userProfile]);

  // 7. Automatic Overdue Notification Engine
  const runOverdueCheck = useCallback(async (): Promise<number> => {
    if (!userProfile || syncInProgressRef.current) return 0;
    syncInProgressRef.current = true;
    try {
      return await syncOverdueNotifications(
        allLoans,
        notifications,
        userProfile.uid,
        userProfile.role === 'librarian',
      );
    } finally {
      syncInProgressRef.current = false;
    }
  }, [userProfile, allLoans, notifications]);

  useEffect(() => {
    if (!authReady || !userProfile || allLoans.length === 0) return;
    void runOverdueCheck();
  }, [authReady, userProfile, allLoans, runOverdueCheck]);

  useEffect(() => {
    if (!authReady || !userProfile) return;
    const interval = window.setInterval(() => {
      void runOverdueCheck();
    }, 30000);
    return () => window.clearInterval(interval);
  }, [authReady, userProfile, runOverdueCheck]);

  // Derived data for current user
  const userLoans = useMemo(() => {
    if (!userProfile) return [];
    return allLoans.filter((l) => l.userId === userProfile.uid);
  }, [allLoans, userProfile]);

  const userNotifications = useMemo(() => {
    if (!userProfile) return [];
    return notifications.filter((n) => n.userId === userProfile.uid);
  }, [notifications, userProfile]);

  const unreadUserNotifications = useMemo(
    () => userNotifications.filter((n) => !n.isRead),
    [userNotifications],
  );

  const unreadOverdueForUser = useMemo(
    () => userNotifications.filter((n) => !n.isRead && n.type === 'overdue'),
    [userNotifications],
  );

  // Auth Portal Handlers
  const openAuthModal = useCallback((portal: UserRole = 'member') => {
    setAuthInitialPortal(portal);
    setAuthError(null);
    setPendingNonLibrarianEmail(null);
    setAuthModalOpen(true);
  }, []);

  const handleSignInWithRole = async (selectedPortal: UserRole) => {
    setIsAuthenticating(true);
    setAuthError(null);
    setPendingNonLibrarianEmail(null);
    try {
      const credential = await signInWithPopup(auth, googleProvider);
      const profile = await ensureUserProfile(credential.user);
      setUserProfile(profile);

      if (selectedPortal === 'librarian') {
        if (profile.role === 'librarian') {
          updatePortalMode('librarian');
          setAuthModalOpen(false);
          showToast('success', `Selamat datang di Ruang Pustakawan, ${profile.displayName}.`);
        } else {
          // User authenticated with Google, but is not a librarian
          updatePortalMode('member');
          setPendingNonLibrarianEmail(profile.email);
        }
      } else {
        updatePortalMode('member');
        setActiveTab('catalog');
        setAuthModalOpen(false);
        showToast('success', `Masuk sebagai Anggota (${profile.displayName}).`);
      }
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : 'Gagal masuk dengan akun Google.';
      if (!msg.includes('popup-closed-by-user')) {
        setAuthError(msg);
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleContinueAsMember = () => {
    updatePortalMode('member');
    setPendingNonLibrarianEmail(null);
    setAuthModalOpen(false);
    setActiveTab('catalog');
    showToast('success', 'Masuk ke portal Anggota Biasa.');
  };

  const handleSignOut = async () => {
    await signOut(auth);
    updatePortalMode('member');
    setActiveTab('catalog');
    showToast('success', 'Anda telah keluar dari sesi CeriLib.');
  };

  const handleBorrowBook = async (book: Book, durationDays: number) => {
    if (!userProfile) {
      openAuthModal('member');
      return;
    }
    setIsBorrowing(true);
    try {
      await borrowBookOnline({ book, user: userProfile, durationDays });
      showToast(
        'success',
        `Berhasil meminjam "${book.title}" selama ${durationDays} hari.`,
      );
      setSelectedBook(null);
    } catch (error) {
      showToast(
        'error',
        error instanceof Error ? error.message : 'Gagal meminjam buku.',
      );
    } finally {
      setIsBorrowing(false);
    }
  };

  const handleReturnBook = async (loan: Loan) => {
    setReturningLoanId(loan.id);
    try {
      await returnBorrowedBook(loan, notifications);
      showToast('success', `Buku "${loan.bookTitle}" telah dikembalikan.`);
    } catch (error) {
      showToast(
        'error',
        error instanceof Error ? error.message : 'Gagal mengembalikan buku.',
      );
    } finally {
      setReturningLoanId(null);
    }
  };

  const handleReturnLoanById = async (loanId: string) => {
    const loan = allLoans.find((l) => l.id === loanId);
    if (loan) await handleReturnBook(loan);
  };

  const handleMarkNotificationRead = async (notificationId: string) => {
    await markNotificationRead(notificationId);
  };

  const handleMarkAllUserNotificationsRead = async () => {
    for (const n of unreadUserNotifications) {
      await markNotificationRead(n.id);
    }
    showToast('success', 'Semua notifikasi ditandai sudah dibaca.');
  };

  const handleSeedStarterCatalog = async () => {
    setIsSeeding(true);
    try {
      const count = await seedStarterBooksIfEmpty();
      if (count > 0) {
        showToast('success', `${count} buku koleksi awal berhasil dimuat.`);
      } else {
        showToast('success', 'Koleksi katalog sudah terisi.');
      }
    } finally {
      setIsSeeding(false);
    }
  };

  const handleCreateBook = async (input: BookInput) => {
    await createBook(input);
    showToast('success', `Buku "${input.title}" ditambahkan ke katalog.`);
  };

  const handleUpdateBook = async (bookId: string, input: BookInput) => {
    await updateBook(bookId, input);
    showToast('success', `Perubahan pada "${input.title}" disimpan.`);
  };

  const handleDeleteBook = async (bookId: string) => {
    await deleteBook(bookId);
    showToast('success', 'Buku berhasil dihapus dari katalog.');
  };

  const handleSimulateOverdue = async (loanId: string) => {
    await simulateLoanOverdue(loanId, 2);
    showToast(
      'success',
      'Jatuh tempo dimundurkan 2 hari. Notifikasi keterlambatan otomatis segera aktif.',
    );
  };

  const handleExtendLoan = async (loan: Loan) => {
    await extendLoanDueDate(loan, 3);
    showToast('success', `Masa pinjam "${loan.bookTitle}" diperpanjang 3 hari.`);
  };

  const handleToggleLibrarian = async (member: UserProfile, grant: boolean) => {
    if (!firebaseUser) return;
    await toggleMemberLibrarianRole(member, grant, firebaseUser.uid);
    showToast(
      'success',
      grant
        ? `${member.displayName} kini memiliki akses Pustakawan.`
        : `Akses Pustakawan untuk ${member.displayName} dicabut.`,
    );
  };

  const isLibrarianSession =
    portalMode === 'librarian' && userProfile?.role === 'librarian';

  return (
    <>
      {isLibrarianSession && userProfile ? (
        <LibrarianView
          userProfile={userProfile}
          books={books}
          allLoans={allLoans}
          notifications={notifications}
          allMembers={allMembers}
          onCreateBook={handleCreateBook}
          onUpdateBook={handleUpdateBook}
          onDeleteBook={handleDeleteBook}
          onSeedStarterCatalog={handleSeedStarterCatalog}
          onReturnLoan={handleReturnBook}
          onSimulateOverdue={handleSimulateOverdue}
          onExtendLoan={handleExtendLoan}
          onRunOverdueSweep={runOverdueCheck}
          onMarkNotificationRead={handleMarkNotificationRead}
          onToggleLibrarian={handleToggleLibrarian}
          onSwitchToMemberView={() => {
            updatePortalMode('member');
            setActiveTab('catalog');
          }}
          onSignOut={handleSignOut}
        />
      ) : (
        <div className="min-h-screen flex flex-col bg-[#FAF6F2] text-[#2A1A1F]">
          <Header
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            userProfile={userProfile}
            unreadNotificationsCount={unreadUserNotifications.length}
            isAuthenticating={isAuthenticating}
            onOpenAuthModal={openAuthModal}
            onSwitchToLibrarianWorkspace={() => updatePortalMode('librarian')}
            onSignOut={handleSignOut}
          />

          {/* Automatic Overdue Alert Banner when member has unread overdue loans */}
          {unreadOverdueForUser.length > 0 && activeTab !== 'notifications' && (
            <div className="bg-[#FEF2F2] border-b border-[#FECACA]">
              <div className="max-w-6xl mx-auto px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-[#B91C1C]">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span className="font-medium">
                    Peringatan Otomatis: Anda memiliki{' '}
                    <span className="font-mono tabular-nums font-semibold">
                      {unreadOverdueForUser.length}
                    </span>{' '}
                    peminjaman buku yang melewati batas pengembalian.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('notifications')}
                  className="text-xs font-semibold text-[#B91C1C] underline underline-offset-4 hover:text-[#991B1B] self-start sm:self-auto cursor-pointer"
                >
                  Lihat Notifikasi
                </button>
              </div>
            </div>
          )}

          <main className="flex-1">
            {activeTab === 'catalog' && (
              <CatalogView
                books={books}
                loadingBooks={loadingBooks}
                userProfile={userProfile}
                activeUserLoans={userLoans}
                onSelectBook={setSelectedBook}
                onReadBook={setReadingBook}
                onOpenAuthModal={openAuthModal}
                onSeedStarterCatalog={handleSeedStarterCatalog}
                isSeeding={isSeeding}
              />
            )}

            {activeTab === 'loans' && (
              <LoansHistoryView
                userProfile={userProfile}
                loans={userLoans}
                books={books}
                loadingLoans={loadingLoans}
                returningLoanId={returningLoanId}
                onReturnBook={handleReturnBook}
                onReadBook={setReadingBook}
                onBrowseCatalog={() => setActiveTab('catalog')}
                onSignIn={() => openAuthModal('member')}
              />
            )}

            {activeTab === 'notifications' && (
              <NotificationsView
                userProfile={userProfile}
                notifications={userNotifications}
                loans={userLoans}
                onMarkRead={handleMarkNotificationRead}
                onMarkAllRead={handleMarkAllUserNotificationsRead}
                onReturnLoanById={handleReturnLoanById}
                onSignIn={() => openAuthModal('member')}
              />
            )}
          </main>

          <footer className="border-t border-[#EADFD9] bg-[#FAF6F2] mt-16">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6E585F]">
              <p>
                CeriLib Perpustakaan Digital · Peminjaman Daring & Pengelolaan Koleksi Minimalis
              </p>
              <div className="flex items-center gap-5">
                <button
                  type="button"
                  onClick={() => setActiveTab('catalog')}
                  className="hover:text-[#2A1A1F] cursor-pointer"
                >
                  Katalog
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('loans')}
                  className="hover:text-[#2A1A1F] cursor-pointer"
                >
                  Riwayat Pinjam
                </button>
                <button
                  type="button"
                  onClick={() => openAuthModal('librarian')}
                  className="hover:text-[#8F2D45] cursor-pointer"
                >
                  Portal Pustakawan
                </button>
              </div>
            </div>
          </footer>

          <BookDetailModal
            book={selectedBook}
            userProfile={userProfile}
            activeLoanForBook={userLoans.find(
              (l) => l.bookId === selectedBook?.id && l.status === 'borrowed',
            )}
            isBorrowing={isBorrowing}
            onClose={() => setSelectedBook(null)}
            onBorrow={handleBorrowBook}
            onReadBook={(book) => {
              setSelectedBook(null);
              setReadingBook(book);
            }}
            onSignIn={() => openAuthModal('member')}
          />

          <DigitalReaderModal
            book={readingBook}
            onClose={() => setReadingBook(null)}
          />
        </div>
      )}

      {/* Dual-Portal Authentication Modal */}
      <AuthPortalModal
        isOpen={authModalOpen}
        initialPortal={authInitialPortal}
        isAuthenticating={isAuthenticating}
        authError={authError}
        pendingNonLibrarianEmail={pendingNonLibrarianEmail}
        onClose={() => setAuthModalOpen(false)}
        onSignInWithRole={handleSignInWithRole}
        onContinueAsMember={handleContinueAsMember}
      />

      {/* Action Toast Feedback */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-5 right-5 z-50 max-w-sm bg-white border rounded-xl px-4 py-3 shadow-lg flex items-center gap-3 text-xs ${
            toast.type === 'error'
              ? 'border-[#FECACA] text-[#B91C1C]'
              : 'border-[#EADFD9] text-[#2A1A1F]'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertTriangle className="w-4 h-4 shrink-0 text-[#B91C1C]" />
          ) : (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#15803D]" />
          )}
          <span className="flex-1 leading-snug">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Tutup pesan"
            className="text-[#6E585F] hover:text-[#2A1A1F] cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
}
