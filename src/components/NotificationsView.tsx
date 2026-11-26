import { useMemo } from 'react';
import { LibraryNotification, Loan, UserProfile } from '../types/library';
import { formatIndonesianDate } from '../services/libraryService';
import { AlertTriangle, Bell, Check, CheckCheck, Clock } from 'lucide-react';

interface NotificationsViewProps {
  userProfile: UserProfile | null;
  notifications: LibraryNotification[];
  loans: Loan[];
  onMarkRead: (notificationId: string) => Promise<void>;
  onMarkAllRead: () => Promise<void>;
  onReturnLoanById: (loanId: string) => Promise<void>;
  onSignIn: () => void;
}

export function NotificationsView({
  userProfile,
  notifications,
  loans,
  onMarkRead,
  onMarkAllRead,
  onReturnLoanById,
  onSignIn,
}: NotificationsViewProps) {
  const activeLoansById = useMemo(() => {
    const map = new Map<string, Loan>();
    for (const loan of loans) {
      if (loan.status === 'borrowed') map.set(loan.id, loan);
    }
    return map;
  }, [loans]);

  const sortedNotifications = useMemo(() => {
    return [...notifications].sort((a, b) => {
      if (a.isRead !== b.isRead) return a.isRead ? 1 : -1;
      const aMs = a.updatedAt?.toMillis?.() ?? a.createdAt?.toMillis?.() ?? 0;
      const bMs = b.updatedAt?.toMillis?.() ?? b.createdAt?.toMillis?.() ?? 0;
      return bMs - aMs;
    });
  }, [notifications]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications],
  );

  if (!userProfile) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-white border border-[#EADFD9] rounded-2xl p-10 text-center space-y-4">
          <h1 className="font-display text-2xl font-semibold text-[#2A1A1F]">
            Notifikasi Keterlambatan Otomatis
          </h1>
          <p className="text-sm text-[#6E585F] max-w-md mx-auto leading-relaxed">
            Masuk dengan akun anggota Anda untuk menerima pengingat otomatis menjelang jatuh tempo dan peringatan keterlambatan pengembalian buku.
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#EADFD9] pb-6">
        <div>
          <p className="text-xs font-medium text-[#8F2D45] mb-1">
            Pemantauan Tenggat Otomatis
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#2A1A1F]">
            Notifikasi Pengembalian
          </h1>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#DECFC8] bg-white text-xs font-medium text-[#2A1A1F] hover:bg-[#F3EAE6] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <CheckCheck className="w-4 h-4 text-[#8F2D45]" />
            <span>Tandai Semua Dibaca ({unreadCount})</span>
          </button>
        )}
      </div>

      {sortedNotifications.length === 0 ? (
        <div className="bg-white border border-[#EADFD9] rounded-2xl p-12 text-center space-y-3">
          <Bell className="w-8 h-8 text-[#8F2D45] mx-auto opacity-80" />
          <h2 className="font-display text-lg font-semibold text-[#2A1A1F]">
            Tidak Ada Peringatan Keterlambatan
          </h2>
          <p className="text-sm text-[#6E585F] max-w-md mx-auto leading-relaxed">
            Seluruh pinjaman buku Anda masih berada dalam batas waktu yang aman. Sistem secara otomatis memantau jatuh tempo dan mengirimkan notifikasi bila terdapat keterlambatan.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedNotifications.map((notif) => {
            const isOverdue = notif.type === 'overdue';
            const activeLoan = activeLoansById.get(notif.loanId);

            return (
              <div
                key={notif.id}
                className={`bg-white border rounded-xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                  notif.isRead
                    ? 'border-[#EADFD9] opacity-80'
                    : isOverdue
                      ? 'border-[#FECACA]'
                      : 'border-[#FDE68A]'
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${
                      isOverdue
                        ? 'bg-[#FEF2F2] border-[#FECACA] text-[#B91C1C]'
                        : 'bg-[#FFFBEB] border-[#FDE68A] text-[#B45309]'
                    }`}
                  >
                    {isOverdue ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : (
                      <Clock className="w-4 h-4" />
                    )}
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={`font-semibold ${
                          isOverdue ? 'text-[#B91C1C]' : 'text-[#B45309]'
                        }`}
                      >
                        {isOverdue
                          ? `Terlambat ${notif.daysOverdue} Hari`
                          : 'Mendekati Jatuh Tempo'}
                      </span>
                      <span aria-hidden="true" className="text-[#9A858C]">
                        ·
                      </span>
                      <span className="font-mono tabular-nums text-[#6E585F]">
                        {formatIndonesianDate(notif.updatedAt || notif.createdAt)}
                      </span>
                      {!notif.isRead && (
                        <>
                          <span aria-hidden="true" className="text-[#9A858C]">
                            ·
                          </span>
                          <span className="font-medium text-[#8F2D45]">Belum dibaca</span>
                        </>
                      )}
                    </div>

                    <p className="text-sm text-[#2A1A1F] leading-relaxed">
                      {notif.message}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 sm:pl-4">
                  {activeLoan && (
                    <button
                      type="button"
                      onClick={() => onReturnLoanById(activeLoan.id)}
                      className="px-3.5 py-2 rounded-lg bg-[#8F2D45] text-white text-xs font-medium hover:bg-[#762237] transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Kembalikan Buku
                    </button>
                  )}
                  {!notif.isRead && (
                    <button
                      type="button"
                      onClick={() => onMarkRead(notif.id)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[#DECFC8] text-xs font-medium text-[#2A1A1F] hover:bg-[#F3EAE6] transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Tandai Dibaca</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
