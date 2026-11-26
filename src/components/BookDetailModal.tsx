import { useEffect, useState } from 'react';
import { Book, Loan, UserProfile } from '../types/library';
import { BookCover } from './BookCover';
import { formatIndonesianDate } from '../services/libraryService';
import { BookOpen, Calendar, CheckCircle2, X } from 'lucide-react';

interface BookDetailModalProps {
  book: Book | null;
  userProfile: UserProfile | null;
  activeLoanForBook: Loan | undefined;
  isBorrowing: boolean;
  onClose: () => void;
  onBorrow: (book: Book, durationDays: number) => Promise<void>;
  onReadBook: (book: Book) => void;
  onSignIn: () => void;
}

export function BookDetailModal({
  book,
  userProfile,
  activeLoanForBook,
  isBorrowing,
  onClose,
  onBorrow,
  onReadBook,
  onSignIn,
}: BookDetailModalProps) {
  const [durationDays, setDurationDays] = useState<number>(book?.loanDurationDays || 7);

  useEffect(() => {
    if (book) {
      setDurationDays(book.loanDurationDays || 7);
    }
  }, [book]);

  if (!book) return null;

  const isAvailable = book.availableCopies > 0;
  const durationOptions = Array.from(new Set([3, 7, 14, book.loanDurationDays])).sort(
    (a, b) => a - b,
  );
  const estimatedDue = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000);

  return (
    <div
      className="fixed inset-0 z-50 bg-[#2A1A1F]/40 backdrop-blur-[2px] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="book-detail-title"
    >
      <div className="bg-[#FAF6F2] border border-[#EADFD9] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EADFD9] bg-white sticky top-0 z-10">
          <div className="text-xs text-[#6E585F] flex items-center gap-2">
            <span className="font-medium text-[#8F2D45]">{book.category}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">ISBN {book.isbn}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup detail buku"
            className="p-1.5 rounded-lg text-[#6E585F] hover:text-[#2A1A1F] hover:bg-[#F3EAE6] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-12 gap-8">
          <div className="md:col-span-5">
            <BookCover
              src={book.coverUrl}
              title={book.title}
              author={book.author}
              category={book.category}
              className="rounded-xl"
            />
          </div>

          <div className="md:col-span-7 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div>
                <h2
                  id="book-detail-title"
                  className="font-display text-2xl font-semibold text-[#2A1A1F] leading-tight"
                >
                  {book.title}
                </h2>
                <p className="text-sm text-[#6E585F] mt-1">{book.author}</p>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#6E585F] font-mono tabular-nums border-y border-[#EADFD9] py-3">
                <span>Tahun: {book.publishedYear}</span>
                <span aria-hidden="true">·</span>
                <span>Halaman: {book.pages}</span>
                <span aria-hidden="true">·</span>
                <span className={isAvailable ? 'text-[#15803D] font-medium' : 'text-[#B91C1C] font-medium'}>
                  Stok: {book.availableCopies}/{book.totalCopies}
                </span>
              </div>

              <p className="text-sm text-[#3F2C32] leading-relaxed">{book.synopsis}</p>
            </div>

            {/* Borrowing Action Panel */}
            <div className="bg-white border border-[#EADFD9] rounded-xl p-5 space-y-4">
              {activeLoanForBook ? (
                <div className="space-y-3">
                  <div className="flex items-start gap-2.5 text-sm text-[#15803D]">
                    <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Anda sedang meminjam buku ini</p>
                      <p className="text-xs text-[#6E585F] mt-0.5 font-mono tabular-nums">
                        Batas pengembalian: {formatIndonesianDate(activeLoanForBook.dueAt)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onReadBook(book)}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#8F2D45] text-white text-sm font-medium hover:bg-[#762237] transition-colors cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Baca Edisi Daring</span>
                  </button>
                </div>
              ) : !userProfile ? (
                <div className="space-y-3">
                  <p className="text-sm text-[#6E585F]">
                    Masuk sebagai anggota CeriLib untuk meminjam buku ini secara daring.
                  </p>
                  <button
                    type="button"
                    onClick={onSignIn}
                    className="w-full px-5 py-2.5 rounded-lg bg-[#8F2D45] text-white text-sm font-medium hover:bg-[#762237] transition-colors cursor-pointer"
                  >
                    Masuk untuk Meminjam
                  </button>
                </div>
              ) : !isAvailable ? (
                <div className="text-sm text-[#B91C1C] font-medium">
                  Seluruh salinan buku sedang dipinjam anggota lain. Silakan periksa kembali secara berkala.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-[#2A1A1F]">
                      Pilih Durasi Peminjaman
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {durationOptions.map((days) => (
                        <button
                          key={days}
                          type="button"
                          onClick={() => setDurationDays(days)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono tabular-nums font-medium transition-colors cursor-pointer ${
                            durationDays === days
                              ? 'bg-[#8F2D45] text-white'
                              : 'bg-[#FAF6F2] border border-[#DECFC8] text-[#2A1A1F] hover:bg-[#F3EAE6]'
                          }`}
                        >
                          {days} Hari
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[#6E585F] font-mono tabular-nums">
                    <Calendar className="w-4 h-4 text-[#8F2D45]" />
                    <span>Jatuh tempo: {formatIndonesianDate(estimatedDue)}</span>
                  </div>

                  <button
                    type="button"
                    disabled={isBorrowing}
                    onClick={() => onBorrow(book, durationDays)}
                    className="w-full px-5 py-2.5 rounded-lg bg-[#8F2D45] text-white text-sm font-medium hover:bg-[#762237] disabled:opacity-60 transition-colors cursor-pointer"
                  >
                    {isBorrowing ? 'Memproses Peminjaman...' : 'Pinjam Buku Secara Daring'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
