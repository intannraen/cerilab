import { useMemo, useState } from 'react';
import { Book, Loan, UserProfile } from '../types/library';
import { formatIndonesianDate, getLoanTiming } from '../services/libraryService';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Clock,
  RotateCcw,
} from 'lucide-react';

interface LoansHistoryViewProps {
  userProfile: UserProfile | null;
  loans: Loan[];
  books: Book[];
  loadingLoans: boolean;
  returningLoanId: string | null;
  onReturnBook: (loan: Loan) => Promise<void>;
  onReadBook: (book: Book) => void;
  onBrowseCatalog: () => void;
  onSignIn: () => void;
}

type LoanFilter = 'all' | 'borrowed' | 'overdue' | 'returned';

export function LoansHistoryView({
  userProfile,
  loans,
  books,
  loadingLoans,
  returningLoanId,
  onReturnBook,
  onReadBook,
  onBrowseCatalog,
  onSignIn,
}: LoansHistoryViewProps) {
  const [filter, setFilter] = useState<LoanFilter>('all');

  const booksById = useMemo(() => {
    const map = new Map<string, Book>();
    for (const b of books) map.set(b.id, b);
    return map;
  }, [books]);

  const enrichedLoans = useMemo(() => {
    const now = Date.now();
    return loans
      .map((loan) => ({
        loan,
        timing: getLoanTiming(loan, now),
      }))
      .sort((a, b) => {
        const aTime = a.loan.borrowedAt?.toMillis?.() ?? 0;
        const bTime = b.loan.borrowedAt?.toMillis?.() ?? 0;
        return bTime - aTime;
      });
  }, [loans]);

  const counts = useMemo(() => {
    let borrowed = 0;
    let overdue = 0;
    let returned = 0;
    for (const item of enrichedLoans) {
      if (item.loan.status === 'returned') {
        returned++;
      } else {
        borrowed++;
        if (item.timing.isOverdue) overdue++;
      }
    }
    return { all: enrichedLoans.length, borrowed, overdue, returned };
  }, [enrichedLoans]);

  const filtered = useMemo(() => {
    return enrichedLoans.filter(({ loan, timing }) => {
      if (filter === 'borrowed') return loan.status === 'borrowed';
      if (filter === 'overdue') return loan.status === 'borrowed' && timing.isOverdue;
      if (filter === 'returned') return loan.status === 'returned';
      return true;
    });
  }, [enrichedLoans, filter]);

  if (!userProfile) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-white border border-[#EADFD9] rounded-2xl p-10 text-center space-y-4">
          <h1 className="font-display text-2xl font-semibold text-[#2A1A1F]">
            Riwayat Peminjaman Anggota
          </h1>
          <p className="text-sm text-[#6E585F] max-w-md mx-auto leading-relaxed">
            Masuk dengan akun anggota Anda untuk melihat daftar buku yang sedang dipinjam, sisa masa pinjam, dan seluruh riwayat pengembalian.
          </p>
          <button
            type="button"
            onClick={onSignIn}
            className="px-5 py-2.5 rounded-lg bg-[#8F2D45] text-white text-sm font-medium hover:bg-[#762237] transition-colors cursor-pointer"
          >
            Masuk Anggota
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#EADFD9] pb-6">
        <div>
          <p className="text-xs font-medium text-[#8F2D45] mb-1">
            Kartu Anggota · <span className="font-mono">{userProfile.memberCode}</span>
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#2A1A1F]">
            Peminjaman & Riwayat
          </h1>
        </div>

        <div className="flex items-center gap-6 text-sm">
          <div>
            <span className="text-xs text-[#6E585F] block">Aktif</span>
            <span className="font-mono tabular-nums text-lg font-semibold text-[#2A1A1F]">
              {counts.borrowed}
            </span>
          </div>
          <div>
            <span className="text-xs text-[#6E585F] block">Terlambat</span>
            <span
              className={`font-mono tabular-nums text-lg font-semibold ${
                counts.overdue > 0 ? 'text-[#B91C1C]' : 'text-[#2A1A1F]'
              }`}
            >
              {counts.overdue}
            </span>
          </div>
          <div>
            <span className="text-xs text-[#6E585F] block">Selesai</span>
            <span className="font-mono tabular-nums text-lg font-semibold text-[#15803D]">
              {counts.returned}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {(
          [
            { id: 'all', label: `Semua (${counts.all})` },
            { id: 'borrowed', label: `Sedang Dipinjam (${counts.borrowed})` },
            { id: 'overdue', label: `Terlambat (${counts.overdue})` },
            { id: 'returned', label: `Dikembalikan (${counts.returned})` },
          ] as { id: LoanFilter; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium font-mono tabular-nums whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
              filter === tab.id
                ? 'bg-[#8F2D45] text-white'
                : 'bg-white border border-[#EADFD9] text-[#6E585F] hover:text-[#2A1A1F] hover:bg-[#F3EAE6]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loadingLoans ? (
        <div className="bg-white border border-[#EADFD9] rounded-xl divide-y divide-[#EADFD9]">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-5 flex items-center justify-between animate-pulse">
              <div className="space-y-2">
                <div className="h-4 w-56 bg-[#EFE4DF] rounded" />
                <div className="h-3 w-36 bg-[#EFE4DF] rounded" />
              </div>
              <div className="h-8 w-28 bg-[#EFE4DF] rounded-lg" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-[#EADFD9] rounded-2xl p-12 text-center space-y-3">
          <BookOpen className="w-8 h-8 text-[#8F2D45] mx-auto opacity-80" />
          <h2 className="font-display text-lg font-semibold text-[#2A1A1F]">
            Belum Ada Catatan Peminjaman
          </h2>
          <p className="text-sm text-[#6E585F] max-w-md mx-auto">
            {filter === 'all'
              ? 'Anda belum pernah meminjam buku. Jelajahi katalog CeriLib untuk memulai peminjaman daring pertama Anda.'
              : 'Tidak ada catatan peminjaman pada kategori filter ini.'}
          </p>
          {filter === 'all' ? (
            <button
              type="button"
              onClick={onBrowseCatalog}
              className="mt-2 px-5 py-2.5 rounded-lg bg-[#8F2D45] text-white text-sm font-medium hover:bg-[#762237] transition-colors cursor-pointer"
            >
              Jelajahi Katalog
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setFilter('all')}
              className="mt-2 px-4 py-2 rounded-lg border border-[#DECFC8] text-xs font-medium text-[#2A1A1F] hover:bg-[#F3EAE6] transition-colors cursor-pointer"
            >
              Tampilkan Semua
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white border border-[#EADFD9] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#EADFD9] bg-[#FAF6F2] text-xs font-medium text-[#6E585F]">
                  <th className="py-3.5 px-5">Buku</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Tanggal Pinjam</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Jatuh Tempo</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">Status</th>
                  <th className="py-3.5 px-5 text-right whitespace-nowrap">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3EAE6] text-sm">
                {filtered.map(({ loan, timing }) => {
                  const book = booksById.get(loan.bookId);
                  const isReturning = returningLoanId === loan.id;

                  return (
                    <tr key={loan.id} className="hover:bg-[#FAF6F2]/60 transition-colors">
                      <td className="py-4 px-5">
                        <p className="font-medium text-[#2A1A1F]">{loan.bookTitle}</p>
                        <p className="text-xs text-[#6E585F] mt-0.5">{loan.bookAuthor}</p>
                      </td>
                      <td className="py-4 px-4 font-mono tabular-nums text-xs text-[#6E585F] whitespace-nowrap">
                        {formatIndonesianDate(loan.borrowedAt)}
                      </td>
                      <td className="py-4 px-4 font-mono tabular-nums text-xs text-[#2A1A1F] whitespace-nowrap">
                        {formatIndonesianDate(loan.dueAt)}
                      </td>
                      <td className="py-4 px-4 whitespace-nowrap">
                        {loan.status === 'returned' ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#15803D]">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>
                              Dikembalikan ({formatIndonesianDate(loan.returnedAt)})
                            </span>
                          </span>
                        ) : timing.isOverdue ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#B91C1C]">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span className="font-mono tabular-nums">
                              Terlambat {timing.daysOverdue} hari
                            </span>
                          </span>
                        ) : timing.isDueSoon ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#B45309]">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span>Jatuh tempo &lt; 24 jam</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8F2D45]">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            <span className="font-mono tabular-nums">
                              Dipinjam · Sisa {timing.daysRemaining} hari
                            </span>
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-5 text-right whitespace-nowrap">
                        {loan.status === 'borrowed' ? (
                          <div className="inline-flex items-center gap-2">
                            {book && (
                              <button
                                type="button"
                                onClick={() => onReadBook(book)}
                                className="px-3 py-1.5 rounded-lg border border-[#DECFC8] text-xs font-medium text-[#2A1A1F] hover:bg-[#F3EAE6] transition-colors cursor-pointer"
                              >
                                Baca
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={isReturning}
                              onClick={() => onReturnBook(loan)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#8F2D45] text-white text-xs font-medium hover:bg-[#762237] disabled:opacity-60 transition-colors cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>{isReturning ? 'Proses...' : 'Kembalikan'}</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-[#9A858C]">Selesai</span>
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
    </div>
  );
}
