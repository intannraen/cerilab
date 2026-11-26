import { Timestamp } from 'firebase/firestore';

export const BOOK_CATEGORIES = [
  'Filsafat',
  'Desain & Seni',
  'Arsitektur',
  'Teknologi',
  'Sastra',
  'Sejarah',
  'Sains',
] as const;

export type BookCategory = (typeof BOOK_CATEGORIES)[number];

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: BookCategory;
  publishedYear: number;
  pages: number;
  synopsis: string;
  coverUrl: string;
  totalCopies: number;
  availableCopies: number;
  loanDurationDays: number;
  digitalReadExcerpt: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export interface BookInput {
  title: string;
  author: string;
  isbn: string;
  category: BookCategory;
  publishedYear: number;
  pages: number;
  synopsis: string;
  coverUrl: string;
  totalCopies: number;
  availableCopies: number;
  loanDurationDays: number;
  digitalReadExcerpt: string;
}

export type UserRole = 'member' | 'librarian';

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  memberCode: string;
  role: UserRole;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export type LoanStatus = 'borrowed' | 'returned';

export interface Loan {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  bookCoverUrl: string;
  status: LoanStatus;
  borrowedAt: Timestamp;
  dueAt: Timestamp;
  returnedAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export type NotificationType = 'overdue' | 'due_soon';

export interface LibraryNotification {
  id: string;
  userId: string;
  loanId: string;
  bookId: string;
  bookTitle: string;
  type: NotificationType;
  daysOverdue: number;
  message: string;
  isRead: boolean;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
}

export type ActiveTab = 'catalog' | 'loans' | 'notifications' | 'librarian';
