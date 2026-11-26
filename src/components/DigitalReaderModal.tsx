import { Book } from '../types/library';
import { BookOpen, X } from 'lucide-react';

interface DigitalReaderModalProps {
  book: Book | null;
  onClose: () => void;
}

export function DigitalReaderModal({ book, onClose }: DigitalReaderModalProps) {
  if (!book) return null;

  const paragraphs = (book.digitalReadExcerpt || book.synopsis)
    .split('\n')
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div
      className="fixed inset-0 z-50 bg-[#2A1A1F]/45 backdrop-blur-[2px] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reader-book-title"
    >
      <div className="bg-[#FAF6F2] border border-[#EADFD9] rounded-2xl max-w-2xl w-full max-h-[88vh] flex flex-col shadow-xl overflow-hidden">
        <div className="px-6 py-4 bg-white border-b border-[#EADFD9] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <BookOpen className="w-4 h-4 text-[#8F2D45] shrink-0" />
            <div className="min-w-0">
              <h2
                id="reader-book-title"
                className="font-display text-base font-semibold text-[#2A1A1F] truncate"
              >
                {book.title}
              </h2>
              <p className="text-xs text-[#6E585F] truncate">{book.author}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup ruang baca"
            className="p-1.5 rounded-lg text-[#6E585F] hover:text-[#2A1A1F] hover:bg-[#F3EAE6] transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 sm:p-10 overflow-y-auto space-y-5 leading-[1.8] text-[#2A1A1F]">
          {paragraphs.map((para, idx) => (
            <p
              key={idx}
              className={
                idx === 0
                  ? 'font-display text-lg font-semibold text-[#8F2D45]'
                  : 'text-[15px] text-[#3B2A30]'
              }
            >
              {para}
            </p>
          ))}
        </div>

        <div className="px-6 py-3 bg-white border-t border-[#EADFD9] flex items-center justify-between text-xs text-[#6E585F]">
          <span>Ruang Baca Daring CeriLib</span>
          <span className="font-mono tabular-nums">{book.pages} halaman total</span>
        </div>
      </div>
    </div>
  );
}
