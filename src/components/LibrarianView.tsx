import { FormEvent, useMemo, useState } from 'react';
import {
  BOOK_CATEGORIES,
  Book,
  BookCategory,
  BookInput,
  Loan,
  UserProfile,
} from '../types/library';
import {
  formatIndonesianDate,
  getLoanTiming,
} from '../services/libraryService';
import {
  AlertCircle,
  BellRing,
  CheckCircle2,
  Clock,
  Pencil,
  Plus,
  RotateCcw,
  Shield,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';

interface LibrarianViewProps {
  userProfile: UserProfile | null;
  books: Book[];
  allLoans: Loan[];
  allMembers: UserProfile[];
  onCreateBook: (input: BookInput) => Promise<void>;
  onUpdateBook: (bookId: string, input: BookInput) => Promise<void>;
  onDeleteBook: (bookId: string) => Promise<void>;
  onSeedStarterCatalog: () => Promise<void>;
  onReturnLoan: (loan: Loan) => Promise<void>;
  onSimulateOverdue: (loanId: string) => Promise<void>;
  onExtendLoan: (loan: Loan) => Promise<void>;
  onRunOverdueSweep: () => Promise<number>;
  onToggleLibrarian: (member: UserProfile, grant: boolean) => Promise<void>;
  onSignIn: () => void;
}

type LibrarianSubTab = 'books' | 'circulation' | 'members';

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
  allMembers,
  onCreateBook,
  onUpdateBook,
  onDeleteBook,
  onSeedStarterCatalog,
  onReturnLoan,
  onSimulateOverdue,
  onExtendLoan,
  onRunOverdueSweep,
  onToggleLibrarian,
  onSignIn,
}: LibrarianViewProps) {
  const [subTab, setSubTab] = useState<LibrarianSubTab>('books');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [formState, setFormState] = useState<BookInput>(EMPTY_BOOK_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [sweepMessage, setSweepMessage] = useState<string | null>(null);
  const [isSweeping, setIsSweeping] = useState(false);

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

  if (!userProfile) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-white border border-[#EADFD9] rounded-2xl p-10 text-center space-y-4">
          <Shield className="w-8 h-8 text-[#8F2D45] mx-auto opacity-85" />
          <h1 className="font-display text-2xl font-semibold text-[#2A1A1F]">
            Ruang Kerja Pustakawan
          </h1>
          <p className="text-sm text-[#6E585F] max-w-md mx-auto leading-relaxed">
            Masuk menggunakan akun Pustakawan terverifikasi untuk mengelola katalog buku, memantau sirkulasi peminjaman, dan menjalankan sistem notifikasi keterlambatan.
          </p>
          <button
            type="button"
            onClick={onSignIn}
            className="px-5 py-2.5 rounded-lg bg-[#8F2D45] text-white text-sm font-medium hover:bg-[#762237] transition-colors cursor-pointer"
          >
            Masuk Pustakawan
          </button>
        </div>
      </div>
    );
  }

  if (userProfile.role !== 'librarian') {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-white border border-[#EADFD9] rounded-2xl p-10 text-center space-y-3">
          <Shield className="w-8 h-8 text-[#8F2D45] mx-auto opacity-85" />
          <h1 className="font-display text-2xl font-semibold text-[#2A1A1F]">
            Akses Khusus Pustakawan
          </h1>
          <p className="text-sm text-[#6E585F] max-w-lg mx-auto leading-relaxed">
            Akun Anda (<span className="font-mono">{userProfile.email}</span>) terdaftar sebagai Anggota. Manajemen koleksi dan pengawasan sirkulasi hanya dapat diakses oleh Pustakawan yang diberi wewenang.
          </p>
        </div>
      </div>
    );
  }

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

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#EADFD9] pb-6">
        <div>
          <p className="text-xs font-medium text-[#8F2D45] mb-1">
            Panel Manajemen Pustakawan
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#2A1A1F]">
            Koleksi & Sirkulasi Perpustakaan
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {books.length === 0 && (
            <button
              type="button"
              onClick={onSeedStarterCatalog}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#DECFC8] bg-white text-xs font-medium text-[#2A1A1F] hover:bg-[#F3EAE6] transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#8F2D45]" />
              <span>Muat 6 Koleksi Awal</span>
            </button>
          )}
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#8F2D45] text-white text-xs font-medium hover:bg-[#762237] transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Buku</span>
          </button>
        </div>
      </div>

      {/* Sub-navigation tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {(
          [
            { id: 'books', label: `Koleksi Buku (${books.length})` },
            { id: 'circulation', label: `Sirkulasi & Keterlambatan (${allLoans.length})` },
            { id: 'members', label: `Anggota & Akses (${allMembers.length})` },
          ] as { id: LibrarianSubTab; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSubTab(tab.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium font-mono tabular-nums whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              subTab === tab.id
                ? 'bg-[#8F2D45] text-white'
                : 'bg-white border border-[#EADFD9] text-[#6E585F] hover:text-[#2A1A1F] hover:bg-[#F3EAE6]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Collection CRUD */}
      {subTab === 'books' && (
        <div className="bg-white border border-[#EADFD9] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#EADFD9] bg-[#FAF6F2] text-xs font-medium text-[#6E585F]">
                  <th className="py-3.5 px-5">Judul & Penulis</th>
                  <th className="py-3.5 px-4">Kategori</th>
                  <th className="py-3.5 px-4">ISBN</th>
                  <th className="py-3.5 px-4 text-right">Stok</th>
                  <th className="py-3.5 px-4 text-right">Durasi</th>
                  <th className="py-3.5 px-5 text-right">Kelola</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3EAE6] text-sm">
                {books.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sm text-[#6E585F]">
                      Belum ada koleksi buku. Klik "Tambah Buku" atau "Muat 6 Koleksi Awal".
                    </td>
                  </tr>
                ) : (
                  books.map((book) => (
                    <tr key={book.id} className="hover:bg-[#FAF6F2]/60 transition-colors">
                      <td className="py-4 px-5">
                        <p className="font-medium text-[#2A1A1F]">{book.title}</p>
                        <p className="text-xs text-[#6E585F] mt-0.5">{book.author}</p>
                      </td>
                      <td className="py-4 px-4 text-xs text-[#6E585F] whitespace-nowrap">
                        {book.category}
                      </td>
                      <td className="py-4 px-4 font-mono tabular-nums text-xs text-[#6E585F] whitespace-nowrap">
                        {book.isbn}
                      </td>
                      <td className="py-4 px-4 text-right font-mono tabular-nums text-xs text-[#2A1A1F] whitespace-nowrap">
                        {book.availableCopies}/{book.totalCopies}
                      </td>
                      <td className="py-4 px-4 text-right font-mono tabular-nums text-xs text-[#6E585F] whitespace-nowrap">
                        {book.loanDurationDays} hari
                      </td>
                      <td className="py-4 px-5 text-right whitespace-nowrap">
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
                              Konfirmasi Hapus
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
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditModal(book)}
                              aria-label={`Edit ${book.title}`}
                              className="p-2 rounded-lg text-[#6E585F] hover:text-[#2A1A1F] hover:bg-[#F3EAE6] transition-colors cursor-pointer"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(book.id)}
                              aria-label={`Hapus ${book.title}`}
                              className="p-2 rounded-lg text-[#6E585F] hover:text-[#B91C1C] hover:bg-[#FEF2F2] transition-colors cursor-pointer"
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
      )}

      {/* Tab 2: Circulation & Overdue Automation Controls */}
      {subTab === 'circulation' && (
        <div className="space-y-4">
          <div className="bg-white border border-[#EADFD9] rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-semibold text-[#2A1A1F]">
                Pemeriksaan Keterlambatan Otomatis
              </h2>
              <p className="text-xs text-[#6E585F] mt-1">
                Sistem memeriksa tenggat pengembalian setiap 30 detik secara otomatis. Anda juga dapat memicu pemeriksaan manual atau menguji skenario keterlambatan pada pinjaman aktif.
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
                                  title="Mundurkan tanggal jatuh tempo 2 hari ke belakang untuk menguji notifikasi keterlambatan otomatis"
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
        </div>
      )}

      {/* Tab 3: Members & Librarian Access */}
      {subTab === 'members' && (
        <div className="bg-white border border-[#EADFD9] rounded-xl overflow-hidden">
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
                          {isLib ? 'Pustakawan' : 'Anggota'}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right">
                        {isSelf ? (
                          <span className="text-xs text-[#9A858C]">Akun Anda</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onToggleLibrarian(member, !isLib)}
                            className="px-3 py-1.5 rounded-lg border border-[#DECFC8] text-xs font-medium text-[#2A1A1F] hover:bg-[#F3EAE6] transition-colors cursor-pointer"
                          >
                            {isLib ? 'Cabut Akses Pustakawan' : 'Jadikan Pustakawan'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
