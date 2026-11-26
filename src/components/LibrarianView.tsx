import { FormEvent, useMemo, useState } from 'react';
import {
  BOOK_CATEGORIES,
  Book,
  BookCategory,
  BookInput,
  LibraryNotification,
  Loan,
  UserProfile,
} from '../types/library';
import {
  formatIndonesianDate,
  getLoanTiming,
} from '../services/libraryService';
import { BookCover } from './BookCover';
import {
  AlertCircle,
  AlertTriangle,
  Bell,
  BellRing,
  BookOpen,
  Check,
  CheckCircle2,
  Clock,
  Library,
  LogOut,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react';

interface LibrarianViewProps {
  userProfile: UserProfile;
  books: Book[];
  allLoans: Loan[];
  notifications: LibraryNotification[];
  allMembers: UserProfile[];
  onCreateBook: (input: BookInput) => Promise<void>;
  onUpdateBook: (bookId: string, input: BookInput) => Promise<void>;
  onDeleteBook: (bookId: string) => Promise<void>;
  onSeedStarterCatalog: () => Promise<void>;
  onReturnLoan: (loan: Loan) => Promise<void>;
  onSimulateOverdue: (loanId: string) => Promise<void>;
  onExtendLoan: (loan: Loan) => Promise<void>;
  onRunOverdueSweep: () => Promise<number>;
  onMarkNotificationRead: (notificationId: string) => Promise<void>;
  onToggleLibrarian: (member: UserProfile, grant: boolean) => Promise<void>;
  onSwitchToMemberView: () => void;
  onSignOut: () => void;
}

type LibrarianSection = 'books' | 'circulation' | 'notifications' | 'members';

const EMPTY_BOOK_FORM: BookInput = {
  title: '',
  author: '',
  isbn: '',
  category: 'Filsafat',
  publishedYear: 2025,
  pages: 240,
  synopsis: '',
  coverUrl: '',
  totalCopies: 3,
  availableCopies: 3,
  loanDurationDays: 7,
  digitalReadExcerpt: '',
};

export function LibrarianView({
  userProfile,
  books,
  allLoans,
  notifications,
  allMembers,
  onCreateBook,
  onUpdateBook,
  onDeleteBook,
  onSeedStarterCatalog,
  onReturnLoan,
  onSimulateOverdue,
  onExtendLoan,
  onRunOverdueSweep,
  onMarkNotificationRead,
  onToggleLibrarian,
  onSwitchToMemberView,
  onSignOut,
}: LibrarianViewProps) {
  const [activeSection, setActiveSection] = useState<LibrarianSection>('books');
  const [bookSearch, setBookSearch] = useState('');
  const [bookCategoryFilter, setBookCategoryFilter] = useState<string>('Semua');

  const [showFormModal, setShowFormModal] = useState(false);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [formState, setFormState] = useState<BookInput>(EMPTY_BOOK_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [sweepMessage, setSweepMessage] = useState<string | null>(null);
  const [isSweeping, setIsSweeping] = useState(false);

  const metrics = useMemo(() => {
    const now = Date.now();
    const totalCopies = books.reduce((sum, b) => sum + b.totalCopies, 0);
    const availableCopies = books.reduce((sum, b) => sum + b.availableCopies, 0);
    const activeLoans = allLoans.filter((l) => l.status === 'borrowed');
    const overdueLoans = activeLoans.filter((l) => getLoanTiming(l, now).isOverdue);
    const outOfStockCount = books.filter((b) => b.availableCopies === 0).length;

    return {
      totalTitles: books.length,
      totalCopies,
      availableCopies,
      activeLoansCount: activeLoans.length,
      overdueLoansCount: overdueLoans.length,
      outOfStockCount,
    };
  }, [books, allLoans]);

  const filteredBooks = useMemo(() => {
    const q = bookSearch.trim().toLowerCase();
    return books.filter((b) => {
      const matchCat =
        bookCategoryFilter === 'Semua' || b.category === bookCategoryFilter;
      const matchQuery =
        !q ||
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.isbn.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [books, bookSearch, bookCategoryFilter]);

  const sortedLoans = useMemo(() => {
    const now = Date.now();
    return [...allLoans]
      .map((loan) => ({ loan, timing: getLoanTiming(loan, now) }))
      .sort((a, b) => {
        if (a.loan.status !== b.loan.status) {
          return a.loan.status === 'borrowed' ? -1 : 1;
        }
        return (b.loan.borrowedAt?.toMillis?.() ?? 0) - (a.loan.borrowedAt?.toMillis?.() ?? 0);
      });
  }, [allLoans]);

  const sortedNotifications = useMemo(() => {
    return [...notifications].sort((a, b) => {
      if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
      const aMs = a.updatedAt?.toMillis?.() ?? a.createdAt?.toMillis?.() ?? 0;
      const bMs = b.updatedAt?.toMillis?.() ?? b.createdAt?.toMillis?.() ?? 0;
      return bMs - aMs;
    });
  }, [notifications]);

  const unreadNotifCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications],
  );

  const openCreateModal = () => {
    setEditingBookId(null);
    setFormState(EMPTY_BOOK_FORM);
    setShowFormModal(true);
  };

  const openEditModal = (book: Book) => {
    setEditingBookId(book.id);
    setFormState({
      title: book.title,
      author: book.author,
      isbn: book.isbn,
      category: book.category,
      publishedYear: book.publishedYear,
      pages: book.pages,
      synopsis: book.synopsis,
      coverUrl: book.coverUrl,
      totalCopies: book.totalCopies,
      availableCopies: book.availableCopies,
      loanDurationDays: book.loanDurationDays,
      digitalReadExcerpt: book.digitalReadExcerpt,
    });
    setShowFormModal(true);
  };

  const handleSubmitForm = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (editingBookId) {
        await onUpdateBook(editingBookId, formState);
      } else {
        await onCreateBook(formState);
      }
      setShowFormModal(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunSweep = async () => {
    setIsSweeping(true);
    setSweepMessage(null);
    try {
      const updated = await onRunOverdueSweep();
      setSweepMessage(
        updated > 0
          ? `${updated} notifikasi keterlambatan/jatuh tempo diperbarui otomatis.`
          : 'Pemeriksaan selesai. Semua notifikasi keterlambatan sudah sinkron.',
      );
    } finally {
      setIsSweeping(false);
    }
  };

  const sidebarItems: {
    id: LibrarianSection;
    label: string;
    icon: typeof Library;
    count?: number;
  }[] = [
    { id: 'books', label: 'Manajemen Koleksi', icon: Library, count: books.length },
    {
      id: 'circulation',
      label: 'Sirkulasi & Terlambat',
      icon: Clock,
      count: metrics.activeLoansCount,
    },
    {
      id: 'notifications',
      label: 'Log Notifikasi',
      icon: Bell,
      count: unreadNotifCount > 0 ? unreadNotifCount : undefined,
    },
    { id: 'members', label: 'Anggota & Akses', icon: Users, count: allMembers.length },
  ];

  const sectionTitles: Record<LibrarianSection, { title: string; subtitle: string }> = {
    books: {
      title: 'Manajemen Koleksi Buku',
      subtitle: 'Tambah, perbarui, pantau stok eksemplar, dan kelola katalog CeriLib.',
    },
    circulation: {
      title: 'Sirkulasi & Pemantauan Tenggat',
      subtitle: 'Pantau seluruh peminjaman aktif, proses pengembalian, dan uji keterlambatan otomatis.',
    },
    notifications: {
      title: 'Notifikasi Keterlambatan Anggota',
      subtitle: 'Daftar peringatan otomatis yang dihasilkan sistem untuk pinjaman lewat jatuh tempo.',
    },
    members: {
      title: 'Daftar Anggota & Hak Akses',
      subtitle: 'Kelola keanggotaan dan penugasan peran pustakawan.',
    },
  };

  return (
    <div className="min-h-screen bg-[#FAF6F2] text-[#2A1A1F] flex flex-col lg:flex-row">
      {/* Dedicated Librarian Sidebar */}
      <aside className="lg:w-64 shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-[#EADFD9] flex flex-col justify-between">
        <div>
          <div className="px-5 py-4 border-b border-[#EADFD9] flex items-center justify-between lg:block">
            <img
              src="/assets/aistudio/CeriLib_Cherry_Orbit_Logo_db8db79e.png"
              alt="CeriLib"
              referrerPolicy="no-referrer"
              className="h-9 w-auto object-contain"
            />
            <p className="text-[11px] font-medium text-[#8F2D45] lg:mt-1.5">
              Ruang Kerja Pustakawan
            </p>
          </div>

          <nav
            aria-label="Navigasi pustakawan"
            className="p-3 flex lg:flex-col gap-1 overflow-x-auto"
          >
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const active = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveSection(item.id)}
                  className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#8F2D45] text-white'
                      : 'text-[#6E585F] hover:text-[#2A1A1F] hover:bg-[#FAF6F2]'
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </span>
                  {item.count !== undefined && (
                    <span
                      className={`font-mono tabular-nums text-[11px] ${
                        active ? 'text-white/90' : 'text-[#6E585F]'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="hidden lg:block p-4 border-t border-[#EADFD9] space-y-3">
          <div className="px-1">
            <p className="text-xs font-semibold text-[#2A1A1F] truncate">
              {userProfile.displayName}
            </p>
            <p className="text-[11px] text-[#6E585F] font-mono truncate">
              {userProfile.email}
            </p>
          </div>

          <div className="space-y-1.5">
            <button
              type="button"
              onClick={onSwitchToMemberView}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-[#DECFC8] text-xs font-medium text-[#2A1A1F] hover:bg-[#FAF6F2] transition-colors cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#8F2D45]" />
              <span>Lihat Katalog Anggota</span>
            </button>
            <button
              type="button"
              onClick={onSignOut}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-[#6E585F] hover:text-[#B91C1C] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Keluar Akun</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Librarian Workspace Viewport */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Contextual Top Bar */}
        <header className="bg-white border-b border-[#EADFD9] px-5 sm:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[11px] text-[#6E585F] mb-0.5">
              Pustakawan / {sectionTitles[activeSection].title}
            </p>
            <h1 className="font-display text-xl sm:text-2xl font-semibold text-[#2A1A1F]">
              {sectionTitles[activeSection].title}
            </h1>
            <p className="text-xs text-[#6E585F] mt-0.5">
              {sectionTitles[activeSection].subtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onSwitchToMemberView}
              className="lg:hidden px-3 py-2 rounded-lg border border-[#DECFC8] text-xs font-medium text-[#2A1A1F] hover:bg-[#FAF6F2] cursor-pointer"
            >
              Katalog Anggota
            </button>
            {books.length === 0 && (
              <button
                type="button"
                onClick={onSeedStarterCatalog}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#DECFC8] bg-white text-xs font-medium text-[#2A1A1F] hover:bg-[#F3EAE6] transition-colors whitespace-nowrap cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-[#8F2D45]" />
                <span>Muat 6 Koleksi Awal</span>
              </button>
            )}
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#8F2D45] text-white text-xs font-medium hover:bg-[#762237] transition-colors whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Buku Baru</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-5 sm:p-8 space-y-6 max-w-6xl w-full">
          {/* Summary KPI Strip */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-[#EADFD9] rounded-xl p-4">
              <p className="text-xs text-[#6E585F]">Total Judul Koleksi</p>
              <p className="font-mono tabular-nums text-2xl font-semibold text-[#2A1A1F] mt-1">
                {metrics.totalTitles}
              </p>
              <p className="text-[11px] text-[#6E585F] font-mono tabular-nums mt-1">
                {metrics.totalCopies} total eksemplar
              </p>
            </div>
            <div className="bg-white border border-[#EADFD9] rounded-xl p-4">
              <p className="text-xs text-[#6E585F]">Eksemplar Tersedia</p>
              <p className="font-mono tabular-nums text-2xl font-semibold text-[#15803D] mt-1">
                {metrics.availableCopies}
              </p>
              <p className="text-[11px] text-[#6E585F] font-mono tabular-nums mt-1">
                {metrics.outOfStockCount} judul stok habis
              </p>
            </div>
            <div className="bg-white border border-[#EADFD9] rounded-xl p-4">
              <p className="text-xs text-[#6E585F]">Sedang Dipinjam</p>
              <p className="font-mono tabular-nums text-2xl font-semibold text-[#8F2D45] mt-1">
                {metrics.activeLoansCount}
              </p>
              <p className="text-[11px] text-[#6E585F] mt-1">Sirkulasi berjalan</p>
            </div>
            <div className="bg-white border border-[#EADFD9] rounded-xl p-4">
              <p className="text-xs text-[#6E585F]">Melewati Tenggat</p>
              <p
                className={`font-mono tabular-nums text-2xl font-semibold mt-1 ${
                  metrics.overdueLoansCount > 0 ? 'text-[#B91C1C]' : 'text-[#2A1A1F]'
                }`}
              >
                {metrics.overdueLoansCount}
              </p>
              <p className="text-[11px] text-[#6E585F] mt-1">Butuh pengembalian</p>
            </div>
          </section>

          {/* SECTION 1: Collection Management */}
          {activeSection === 'books' && (
            <section className="space-y-4">
              {/* Filter Bar */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="relative flex-1 max-w-md">
                  <Search
                    aria-hidden="true"
                    className="w-4 h-4 text-[#6E585F] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                  />
                  <input
                    type="search"
                    value={bookSearch}
                    onChange={(e) => setBookSearch(e.target.value)}
                    placeholder="Cari judul, penulis, atau ISBN..."
                    className="w-full pl-10 pr-4 py-2 bg-white border border-[#DECFC8] rounded-lg text-sm text-[#2A1A1F] placeholder:text-[#9A858C] focus:outline-none focus:border-[#8F2D45]"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  {['Semua', ...BOOK_CATEGORIES].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setBookCategoryFilter(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                        bookCategoryFilter === cat
                          ? 'bg-[#8F2D45] text-white'
                          : 'bg-white border border-[#EADFD9] text-[#6E585F] hover:text-[#2A1A1F]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white border border-[#EADFD9] rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#EADFD9] bg-[#FAF6F2] text-xs font-medium text-[#6E585F]">
                        <th className="py-3.5 px-5">Koleksi Buku</th>
                        <th className="py-3.5 px-4">Kategori</th>
                        <th className="py-3.5 px-4">ISBN</th>
                        <th className="py-3.5 px-4 text-right">Ketersediaan</th>
                        <th className="py-3.5 px-4 text-right">Batas Pinjam</th>
                        <th className="py-3.5 px-5 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F3EAE6] text-sm">
                      {filteredBooks.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-sm text-[#6E585F]">
                            {books.length === 0
                              ? 'Belum ada koleksi buku. Klik "Tambah Buku Baru" atau "Muat 6 Koleksi Awal".'
                              : 'Tidak ada koleksi yang sesuai dengan filter pencarian.'}
                          </td>
                        </tr>
                      ) : (
                        filteredBooks.map((book) => (
                          <tr key={book.id} className="hover:bg-[#FAF6F2]/60 transition-colors">
                            <td className="py-3.5 px-5">
                              <div className="flex items-center gap-3.5">
                                <div className="w-10 shrink-0">
                                  <BookCover
                                    src={book.coverUrl}
                                    title={book.title}
                                    category={book.category}
                                    className="rounded-md"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <p className="font-medium text-[#2A1A1F] truncate max-w-[260px]">
                                    {book.title}
                                  </p>
                                  <p className="text-xs text-[#6E585F] mt-0.5 truncate max-w-[260px]">
                                    {book.author} ·{' '}
                                    <span className="font-mono tabular-nums">
                                      {book.publishedYear}
                                    </span>
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-xs text-[#8F2D45] font-medium whitespace-nowrap">
                              {book.category}
                            </td>
                            <td className="py-3.5 px-4 font-mono tabular-nums text-xs text-[#6E585F] whitespace-nowrap">
                              {book.isbn}
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono tabular-nums text-xs whitespace-nowrap">
                              <span
                                className={
                                  book.availableCopies > 0
                                    ? 'text-[#15803D] font-medium'
                                    : 'text-[#B91C1C] font-medium'
                                }
                              >
                                {book.availableCopies}/{book.totalCopies}
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-mono tabular-nums text-xs text-[#6E585F] whitespace-nowrap">
                              {book.loanDurationDays} hari
                            </td>
                            <td className="py-3.5 px-5 text-right whitespace-nowrap">
                              {confirmDeleteId === book.id ? (
                                <div className="inline-flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      await onDeleteBook(book.id);
                                      setConfirmDeleteId(null);
                                    }}
                                    className="px-2.5 py-1 rounded-md bg-[#B91C1C] text-white text-xs font-medium hover:bg-[#991B1B] cursor-pointer"
                                  >
                                    Hapus
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="px-2.5 py-1 rounded-md border border-[#DECFC8] text-xs text-[#6E585F] hover:bg-[#F3EAE6] cursor-pointer"
                                  >
                                    Batal
                                  </button>
                                </div>
                              ) : (
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => openEditModal(book)}
                                    aria-label={`Edit ${book.title}`}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#2A1A1F] hover:bg-[#F3EAE6] transition-colors cursor-pointer"
                                  >
                                    <Pencil className="w-3.5 h-3.5 text-[#6E585F]" />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteId(book.id)}
                                    aria-label={`Hapus ${book.title}`}
                                    className="p-1.5 rounded-lg text-[#6E585F] hover:text-[#B91C1C] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* SECTION 2: Circulation & Overdue Controls */}
          {activeSection === 'circulation' && (
            <section className="space-y-4">
              <div className="bg-white border border-[#EADFD9] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-base font-semibold text-[#2A1A1F]">
                    Pemeriksaan Keterlambatan Otomatis
                  </h2>
                  <p className="text-xs text-[#6E585F] mt-1">
                    Sistem memantau tenggat setiap 30 detik secara otomatis. Anda dapat memicu pemindaian manual atau menguji skenario terlambat pada pinjaman aktif.
                  </p>
                  {sweepMessage && (
                    <p className="text-xs font-medium text-[#15803D] mt-2">{sweepMessage}</p>
                  )}
                </div>
                <button
                  type="button"
                  disabled={isSweeping}
                  onClick={handleRunSweep}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#8F2D45] text-white text-xs font-medium hover:bg-[#762237] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <BellRing className="w-4 h-4" />
                  <span>{isSweeping ? 'Memeriksa...' : 'Periksa & Kirim Notifikasi'}</span>
                </button>
              </div>

              <div className="bg-white border border-[#EADFD9] rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-[#EADFD9] bg-[#FAF6F2] text-xs font-medium text-[#6E585F]">
                        <th className="py-3.5 px-5">Peminjam</th>
                        <th className="py-3.5 px-4">Buku</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Jatuh Tempo</th>
                        <th className="py-3.5 px-4 whitespace-nowrap">Status</th>
                        <th className="py-3.5 px-5 text-right whitespace-nowrap">Aksi Sirkulasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F3EAE6] text-sm">
                      {sortedLoans.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-sm text-[#6E585F]">
                            Belum ada transaksi peminjaman.
                          </td>
                        </tr>
                      ) : (
                        sortedLoans.map(({ loan, timing }) => (
                          <tr key={loan.id} className="hover:bg-[#FAF6F2]/60 transition-colors">
                            <td className="py-4 px-5">
                              <p className="font-medium text-[#2A1A1F]">{loan.userName}</p>
                              <p className="text-xs text-[#6E585F] font-mono">{loan.userEmail}</p>
                            </td>
                            <td className="py-4 px-4">
                              <p className="font-medium text-[#2A1A1F]">{loan.bookTitle}</p>
                            </td>
                            <td className="py-4 px-4 font-mono tabular-nums text-xs text-[#2A1A1F] whitespace-nowrap">
                              {formatIndonesianDate(loan.dueAt)}
                            </td>
                            <td className="py-4 px-4 whitespace-nowrap">
                              {loan.status === 'returned' ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#15803D]">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Dikembalikan</span>
                                </span>
                              ) : timing.isOverdue ? (
                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#B91C1C]">
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  <span className="font-mono tabular-nums">
                                    Terlambat {timing.daysOverdue} hari
                                  </span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8F2D45]">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span className="font-mono tabular-nums">
                                    Sisa {timing.daysRemaining} hari
                                  </span>
                                </span>
                              )}
                            </td>
                            <td className="py-4 px-5 text-right whitespace-nowrap">
                              {loan.status === 'borrowed' ? (
                                <div className="inline-flex items-center gap-2">
                                  {!timing.isOverdue && (
                                    <button
                                      type="button"
                                      onClick={() => onSimulateOverdue(loan.id)}
                                      className="px-2.5 py-1.5 rounded-lg border border-[#FECACA] text-[#B91C1C] text-xs font-medium hover:bg-[#FEF2F2] transition-colors cursor-pointer"
                                    >
                                      Uji Terlambat (-2h)
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => onExtendLoan(loan)}
                                    className="px-2.5 py-1.5 rounded-lg border border-[#DECFC8] text-[#2A1A1F] text-xs font-medium hover:bg-[#F3EAE6] transition-colors cursor-pointer"
                                  >
                                    +3 Hari
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onReturnLoan(loan)}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#8F2D45] text-white text-xs font-medium hover:bg-[#762237] transition-colors cursor-pointer"
                                  >
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>Kembalikan</span>
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-[#9A858C]">Selesai</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          )}

          {/* SECTION 3: Notifications Log */}
          {activeSection === 'notifications' && (
            <section className="space-y-3">
              {sortedNotifications.length === 0 ? (
                <div className="bg-white border border-[#EADFD9] rounded-xl p-10 text-center text-sm text-[#6E585F]">
                  Belum ada notifikasi keterlambatan yang terkirim ke anggota.
                </div>
              ) : (
                sortedNotifications.map((notif) => (
                  <div
                    key={notif.id}
                    className="bg-white border border-[#EADFD9] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle
                        className={`w-4 h-4 mt-0.5 shrink-0 ${
                          notif.type === 'overdue' ? 'text-[#B91C1C]' : 'text-[#B45309]'
                        }`}
                      />
                      <div>
                        <p className="text-xs font-mono text-[#6E585F]">
                          {notif.type === 'overdue'
                            ? `Terlambat ${notif.daysOverdue} hari`
                            : 'Mendekati jatuh tempo'}{' '}
                          · {formatIndonesianDate(notif.updatedAt || notif.createdAt)}
                        </p>
                        <p className="text-sm text-[#2A1A1F] mt-1">{notif.message}</p>
                      </div>
                    </div>
                    {!notif.isRead ? (
                      <button
                        type="button"
                        onClick={() => onMarkNotificationRead(notif.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#DECFC8] text-xs font-medium text-[#2A1A1F] hover:bg-[#F3EAE6] shrink-0 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Tandai Dibaca</span>
                      </button>
                    ) : (
                      <span className="text-xs text-[#9A858C] shrink-0">Dibaca</span>
                    )}
                  </div>
                ))
              )}
            </section>
          )}

          {/* SECTION 4: Members & Librarian Roles */}
          {activeSection === 'members' && (
            <section className="bg-white border border-[#EADFD9] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#EADFD9] bg-[#FAF6F2] text-xs font-medium text-[#6E585F]">
                      <th className="py-3.5 px-5">Anggota</th>
                      <th className="py-3.5 px-4">Kode Anggota</th>
                      <th className="py-3.5 px-4">Peran</th>
                      <th className="py-3.5 px-5 text-right">Pengaturan Akses</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3EAE6] text-sm">
                    {allMembers.map((member) => {
                      const isSelf = member.uid === userProfile.uid;
                      const isLib = member.role === 'librarian';
                      return (
                        <tr key={member.uid} className="hover:bg-[#FAF6F2]/60 transition-colors">
                          <td className="py-4 px-5">
                            <p className="font-medium text-[#2A1A1F]">{member.displayName}</p>
                            <p className="text-xs text-[#6E585F] font-mono">{member.email}</p>
                          </td>
                          <td className="py-4 px-4 font-mono tabular-nums text-xs text-[#6E585F]">
                            {member.memberCode}
                          </td>
                          <td className="py-4 px-4 text-xs font-medium">
                            <span className={isLib ? 'text-[#8F2D45]' : 'text-[#6E585F]'}>
                              {isLib ? 'Pustakawan' : 'Anggota Biasa'}
                            </span>
                          </td>
                          <td className="py-4 px-5 text-right">
                            {isSelf ? (
                              <span className="text-xs text-[#9A858C]">Akun Aktif Anda</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onToggleLibrarian(member, !isLib)}
                                className="px-3 py-1.5 rounded-lg border border-[#DECFC8] text-xs font-medium text-[#2A1A1F] hover:bg-[#F3EAE6] transition-colors cursor-pointer"
                              >
                                {isLib ? 'Turunkan ke Anggota' : 'Angkat Jadi Pustakawan'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </main>
      </div>

      {/* Create / Edit Book Modal */}
      {showFormModal && (
        <div
          className="fixed inset-0 z-50 bg-[#2A1A1F]/40 backdrop-blur-[2px] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="book-form-title"
        >
          <div className="bg-[#FAF6F2] border border-[#EADFD9] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="px-6 py-4 bg-white border-b border-[#EADFD9] flex items-center justify-between sticky top-0 z-10">
              <h2
                id="book-form-title"
                className="font-display text-lg font-semibold text-[#2A1A1F]"
              >
                {editingBookId ? 'Edit Informasi Buku' : 'Tambah Buku Baru ke Koleksi'}
              </h2>
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                aria-label="Tutup formulir buku"
                className="p-1.5 rounded-lg text-[#6E585F] hover:text-[#2A1A1F] hover:bg-[#F3EAE6] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#2A1A1F] mb-1.5">
                    Judul Buku
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={140}
                    value={formState.title}
                    onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#DECFC8] rounded-lg text-sm focus:outline-none focus:border-[#8F2D45]"
                    placeholder="Contoh: Desain Tipografi Minimalis"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#2A1A1F] mb-1.5">
                    Penulis
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={formState.author}
                    onChange={(e) => setFormState({ ...formState, author: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#DECFC8] rounded-lg text-sm focus:outline-none focus:border-[#8F2D45]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#2A1A1F] mb-1.5">
                    ISBN
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={32}
                    value={formState.isbn}
                    onChange={(e) => setFormState({ ...formState, isbn: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#DECFC8] rounded-lg text-sm font-mono focus:outline-none focus:border-[#8F2D45]"
                    placeholder="978-602-000-000-0"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#2A1A1F] mb-1.5">
                    Kategori
                  </label>
                  <select
                    value={formState.category}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        category: e.target.value as BookCategory,
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-white border border-[#DECFC8] rounded-lg text-sm focus:outline-none focus:border-[#8F2D45]"
                  >
                    {BOOK_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#2A1A1F] mb-1.5">
                    Tahun Terbit
                  </label>
                  <input
                    type="number"
                    required
                    min={1400}
                    max={2100}
                    value={formState.publishedYear}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        publishedYear: Number(e.target.value),
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-white border border-[#DECFC8] rounded-lg text-sm font-mono focus:outline-none focus:border-[#8F2D45]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#2A1A1F] mb-1.5">
                    Jumlah Halaman
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={10000}
                    value={formState.pages}
                    onChange={(e) =>
                      setFormState({ ...formState, pages: Number(e.target.value) })
                    }
                    className="w-full px-3.5 py-2.5 bg-white border border-[#DECFC8] rounded-lg text-sm font-mono focus:outline-none focus:border-[#8F2D45]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#2A1A1F] mb-1.5">
                    Durasi Pinjam Default (Hari)
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={60}
                    value={formState.loanDurationDays}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        loanDurationDays: Number(e.target.value),
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-white border border-[#DECFC8] rounded-lg text-sm font-mono focus:outline-none focus:border-[#8F2D45]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#2A1A1F] mb-1.5">
                    Total Eksemplar
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={999}
                    value={formState.totalCopies}
                    onChange={(e) => {
                      const nextTotal = Number(e.target.value);
                      setFormState({
                        ...formState,
                        totalCopies: nextTotal,
                        availableCopies: editingBookId
                          ? Math.min(formState.availableCopies, nextTotal)
                          : nextTotal,
                      });
                    }}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#DECFC8] rounded-lg text-sm font-mono focus:outline-none focus:border-[#8F2D45]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#2A1A1F] mb-1.5">
                    Eksemplar Tersedia
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    max={formState.totalCopies}
                    value={formState.availableCopies}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        availableCopies: Number(e.target.value),
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-white border border-[#DECFC8] rounded-lg text-sm font-mono focus:outline-none focus:border-[#8F2D45]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#2A1A1F] mb-1.5">
                    URL Gambar Sampul (Opsional)
                  </label>
                  <input
                    type="text"
                    maxLength={500}
                    value={formState.coverUrl}
                    onChange={(e) =>
                      setFormState({ ...formState, coverUrl: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 bg-white border border-[#DECFC8] rounded-lg text-sm focus:outline-none focus:border-[#8F2D45]"
                    placeholder="Kosongkan untuk menggunakan sampul tipografi otomatis"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#2A1A1F] mb-1.5">
                    Sinopsis
                  </label>
                  <textarea
                    required
                    rows={3}
                    maxLength={1500}
                    value={formState.synopsis}
                    onChange={(e) =>
                      setFormState({ ...formState, synopsis: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 bg-white border border-[#DECFC8] rounded-lg text-sm focus:outline-none focus:border-[#8F2D45]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-[#2A1A1F] mb-1.5">
                    Cuplikan Baca Daring (Opsional)
                  </label>
                  <textarea
                    rows={4}
                    maxLength={4000}
                    value={formState.digitalReadExcerpt}
                    onChange={(e) =>
                      setFormState({
                        ...formState,
                        digitalReadExcerpt: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2.5 bg-white border border-[#DECFC8] rounded-lg text-sm focus:outline-none focus:border-[#8F2D45]"
                    placeholder="Teks bab pembuka yang dapat dibaca anggota setelah meminjam buku."
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#EADFD9]">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 rounded-lg border border-[#DECFC8] text-xs font-medium text-[#2A1A1F] hover:bg-[#F3EAE6] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-lg bg-[#8F2D45] text-white text-xs font-medium hover:bg-[#762237] disabled:opacity-60 cursor-pointer"
                >
                  {isSaving
                    ? 'Menyimpan...'
                    : editingBookId
                      ? 'Simpan Perubahan'
                      : 'Tambahkan ke Katalog'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
