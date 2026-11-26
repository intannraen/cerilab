import { useMemo, useState } from 'react';
import { Book, BOOK_CATEGORIES, Loan, UserProfile, UserRole } from '../types/library';
import { BookCover } from './BookCover';
import {
  ArrowUpDown,
  BookOpen,
  Search,
  Shield,
  Sparkles,
  UserCheck,
} from 'lucide-react';

interface CatalogViewProps {
  books: Book[];
  loadingBooks: boolean;
  userProfile: UserProfile | null;
  activeUserLoans: Loan[];
  onSelectBook: (book: Book) => void;
  onReadBook: (book: Book) => void;
  onOpenAuthModal: (portal: UserRole) => void;
  onSeedStarterCatalog: () => Promise<void>;
  isSeeding: boolean;
}

type SortOption = 'title-asc' | 'year-desc' | 'stock-desc';

export function CatalogView({
  books,
  loadingBooks,
  userProfile,
  activeUserLoans,
  onSelectBook,
  onReadBook,
  onOpenAuthModal,
  onSeedStarterCatalog,
  isSeeding,
}: CatalogViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('title-asc');

  const activeBorrowedBookIds = useMemo(() => {
    return new Set(
      activeUserLoans
        .filter((loan) => loan.status === 'borrowed')
        .map((loan) => loan.bookId),
    );
  }, [activeUserLoans]);

  const filteredBooks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = books.filter((book) => {
      const matchesCategory =
        selectedCategory === 'Semua' || book.category === selectedCategory;
      const matchesAvailability = !onlyAvailable || book.availableCopies > 0;
      const matchesQuery =
        !q ||
        book.title.toLowerCase().includes(q) ||
        book.author.toLowerCase().includes(q) ||
        book.isbn.toLowerCase().includes(q);
      return matchesCategory && matchesAvailability && matchesQuery;
    });

    return list.sort((a, b) => {
      if (sortBy === 'year-desc') return b.publishedYear - a.publishedYear;
      if (sortBy === 'stock-desc') return b.availableCopies - a.availableCopies;
      return a.title.localeCompare(b.title, 'id');
    });
  }, [books, searchQuery, selectedCategory, onlyAvailable, sortBy]);

  const totalAvailable = useMemo(
    () => books.reduce((sum, b) => sum + b.availableCopies, 0),
    [books],
  );

  const myActiveCount = useMemo(
    () => activeUserLoans.filter((l) => l.status === 'borrowed').length,
    [activeUserLoans],
  );

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-8">
      {/* Executive Minimalist Hero + Functional Search & Snapshot */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch border-b border-[#EADFD9] pb-8">
        <div className="lg:col-span-8 flex flex-col justify-between gap-6">
          <div className="space-y-3">
            <p className="text-xs font-medium tracking-wide text-[#8F2D45]">
              Perpustakaan Digital CeriLib
            </p>
            <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[#2A1A1F] leading-[1.16] text-balance">
              Temukan, pinjam, dan baca koleksi buku pilihan secara daring.
            </h1>
            <p className="text-sm sm:text-base text-[#6E585F] max-w-2xl leading-relaxed">
              Akses katalog real-time, proses peminjaman cepat dengan pilihan durasi fleksibel, serta pemantauan tenggat pengembalian otomatis.
            </p>
          </div>

          {/* Integrated Primary Search Bar */}
          <div className="relative max-w-xl">
            <Search
              aria-hidden="true"
              className="w-4 h-4 text-[#6E585F] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul buku, nama penulis, atau nomor ISBN..."
              aria-label="Cari buku dalam katalog"
              className="w-full pl-11 pr-4 py-3 bg-white border border-[#DECFC8] rounded-xl text-sm text-[#2A1A1F] placeholder:text-[#9A858C] focus:outline-none focus:border-[#8F2D45] focus:ring-2 focus:ring-[#8F2D45]/15 transition-colors"
            />
          </div>
        </div>

        {/* Right Snapshot & Portal Entry Card */}
        <div className="lg:col-span-4 bg-white border border-[#EADFD9] rounded-2xl p-6 flex flex-col justify-between gap-5">
          <div className="grid grid-cols-2 gap-4 pb-4 border-b border-[#F3EAE6]">
            <div>
              <p className="text-xs text-[#6E585F]">Judul Koleksi</p>
              <p className="font-mono tabular-nums text-2xl font-semibold text-[#2A1A1F] mt-1">
                {books.length}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#6E585F]">
                {userProfile ? 'Sedang Dipinjam' : 'Stok Tersedia'}
              </p>
              <p className="font-mono tabular-nums text-2xl font-semibold text-[#8F2D45] mt-1">
                {userProfile ? myActiveCount : totalAvailable}
              </p>
            </div>
          </div>

          {userProfile ? (
            <div className="space-y-1">
              <p className="text-xs font-medium text-[#2A1A1F]">
                Masuk sebagai {userProfile.displayName}
              </p>
              <p className="text-xs text-[#6E585F] font-mono">
                Kartu {userProfile.memberCode} · {totalAvailable} eksemplar siap dipinjam
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <p className="text-xs text-[#6E585F]">
                Masuk untuk mulai meminjam buku atau mengelola koleksi:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => onOpenAuthModal('member')}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#8F2D45] text-white text-xs font-medium hover:bg-[#762237] transition-colors cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Masuk Anggota (Google)</span>
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAuthModal('librarian')}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-[#DECFC8] bg-[#FAF6F2] text-[#2A1A1F] text-xs font-medium hover:bg-[#F3EAE6] transition-colors cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5 text-[#8F2D45]" />
                  <span>Portal Pustakawan</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Filter & Sort Controls Toolbar */}
      <section className="space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div
            role="tablist"
            aria-label="Filter kategori buku"
            className="flex items-center gap-1.5 overflow-x-auto pb-1"
          >
            {['Semua', ...BOOK_CATEGORIES].map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  role="tab"
                  aria-selected={active}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#8F2D45] text-white'
                      : 'bg-white border border-[#EADFD9] text-[#6E585F] hover:text-[#2A1A1F] hover:bg-[#F3EAE6]'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setOnlyAvailable((prev) => !prev)}
              aria-pressed={onlyAvailable}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap cursor-pointer ${
                onlyAvailable
                  ? 'bg-[#F0FDF4] border-[#BBF7D0] text-[#15803D]'
                  : 'bg-white border-[#EADFD9] text-[#6E585F] hover:text-[#2A1A1F]'
              }`}
            >
              {onlyAvailable ? 'Hanya Tersedia: Aktif' : 'Tampilkan Tersedia Saja'}
            </button>

            <div className="inline-flex items-center gap-1.5 bg-white border border-[#EADFD9] rounded-lg px-2.5 py-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#6E585F]" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                aria-label="Urutkan buku"
                className="text-xs font-medium text-[#2A1A1F] bg-transparent focus:outline-none cursor-pointer"
              >
                <option value="title-asc">Judul (A–Z)</option>
                <option value="year-desc">Tahun Terbaru</option>
                <option value="stock-desc">Stok Terbanyak</option>
              </select>
            </div>
          </div>
        </div>

        <div className="text-xs text-[#6E585F] font-mono tabular-nums">
          Menampilkan {filteredBooks.length} dari {books.length} judul koleksi
        </div>
      </section>

      {/* Catalog Grid */}
      {loadingBooks ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div
              key={idx}
              className="bg-white border border-[#EADFD9] rounded-xl overflow-hidden animate-pulse"
            >
              <div className="aspect-[3/4] bg-[#EFE4DF]" />
              <div className="p-5 space-y-3">
                <div className="h-3 w-28 bg-[#EFE4DF] rounded" />
                <div className="h-5 w-3/4 bg-[#EFE4DF] rounded" />
                <div className="h-4 w-1/2 bg-[#EFE4DF] rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : books.length === 0 ? (
        <div className="bg-white border border-[#EADFD9] rounded-2xl p-12 text-center max-w-xl mx-auto">
          <BookOpen className="w-10 h-10 text-[#8F2D45] mx-auto mb-4 opacity-80" />
          <h2 className="font-display text-xl font-semibold text-[#2A1A1F] mb-2">
            Katalog Koleksi Masih Kosong
          </h2>
          <p className="text-sm text-[#6E585F] leading-relaxed mb-6">
            Belum ada buku yang ditambahkan ke database perpustakaan.{' '}
            {userProfile?.role === 'librarian'
              ? 'Anda dapat memuat 6 koleksi awal secara otomatis atau menambahkan buku baru dari ruang Pustakawan.'
              : 'Silakan masuk melalui Portal Pustakawan untuk mengisi koleksi awal perpustakaan.'}
          </p>
          {userProfile?.role === 'librarian' ? (
            <button
              type="button"
              disabled={isSeeding}
              onClick={onSeedStarterCatalog}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#8F2D45] text-white text-sm font-medium hover:bg-[#762237] disabled:opacity-60 transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSeeding ? 'Memuat Koleksi...' : 'Muat 6 Koleksi Awal'}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onOpenAuthModal('librarian')}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#8F2D45] text-white text-sm font-medium hover:bg-[#762237] transition-colors cursor-pointer"
            >
              <Shield className="w-4 h-4" />
              <span>Login Pustakawan</span>
            </button>
          )}
        </div>
      ) : filteredBooks.length === 0 ? (
        <div className="bg-white border border-[#EADFD9] rounded-2xl p-10 text-center">
          <p className="text-base font-medium text-[#2A1A1F] mb-1">
            Tidak ada buku yang sesuai dengan pencarian
          </p>
          <p className="text-sm text-[#6E585F] mb-4">
            Coba ubah kata kunci atau pilih kategori lain.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('Semua');
              setOnlyAvailable(false);
            }}
            className="px-4 py-2 rounded-lg border border-[#DECFC8] text-xs font-medium text-[#2A1A1F] hover:bg-[#F3EAE6] transition-colors cursor-pointer"
          >
            Reset Semua Filter
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
          {filteredBooks.map((book) => {
            const isBorrowedByMe = activeBorrowedBookIds.has(book.id);
            const isAvailable = book.availableCopies > 0;

            return (
              <article
                key={book.id}
                className="group bg-white border border-[#EADFD9] rounded-xl overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:border-[#D9C4BC]"
              >
                <button
                  type="button"
                  onClick={() => onSelectBook(book)}
                  className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8F2D45] cursor-pointer"
                >
                  <BookCover
                    src={book.coverUrl}
                    title={book.title}
                    author={book.author}
                    category={book.category}
                  />
                </button>

                <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-[#6E585F] truncate">
                        <span className="font-medium text-[#8F2D45]">{book.category}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{book.publishedYear}</span>
                      </div>
                      <span className="font-mono tabular-nums text-[11px] text-[#6E585F] shrink-0">
                        {book.pages} hlm
                      </span>
                    </div>

                    <h2 className="font-display text-lg font-semibold text-[#2A1A1F] leading-snug line-clamp-2">
                      <button
                        type="button"
                        onClick={() => onSelectBook(book)}
                        className="text-left hover:text-[#8F2D45] transition-colors cursor-pointer"
                      >
                        {book.title}
                      </button>
                    </h2>

                    <p className="text-sm text-[#6E585F]">{book.author}</p>
                    <p className="text-xs text-[#6E585F] line-clamp-2 leading-relaxed">
                      {book.synopsis}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#F3EAE6] flex items-center justify-between gap-3">
                    <div className="text-xs font-mono tabular-nums">
                      {isAvailable ? (
                        <span className="text-[#15803D] font-medium">
                          Tersedia {book.availableCopies}/{book.totalCopies}
                        </span>
                      ) : (
                        <span className="text-[#B91C1C] font-medium">
                          Stok habis (0/{book.totalCopies})
                        </span>
                      )}
                    </div>

                    {isBorrowedByMe ? (
                      <button
                        type="button"
                        onClick={() => onReadBook(book)}
                        className="px-3.5 py-1.5 rounded-lg border border-[#8F2D45] text-[#8F2D45] text-xs font-medium hover:bg-[#8F2D45]/5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Baca Daring
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSelectBook(book)}
                        className="px-3.5 py-1.5 rounded-lg bg-[#8F2D45] text-white text-xs font-medium hover:bg-[#762237] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        {isAvailable ? 'Pinjam Buku' : 'Detail'}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
