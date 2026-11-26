import { useEffect, useState } from 'react';
import { BookOpen, Shield, UserCheck, X } from 'lucide-react';
import { UserRole } from '../types/library';

interface AuthPortalModalProps {
  isOpen: boolean;
  initialPortal: UserRole;
  isAuthenticating: boolean;
  authError: string | null;
  pendingNonLibrarianEmail: string | null;
  onClose: () => void;
  onSignInWithRole: (portal: UserRole) => Promise<void>;
  onContinueAsMember: () => void;
}

export function AuthPortalModal({
  isOpen,
  initialPortal,
  isAuthenticating,
  authError,
  pendingNonLibrarianEmail,
  onClose,
  onSignInWithRole,
  onContinueAsMember,
}: AuthPortalModalProps) {
  const [selectedPortal, setSelectedPortal] = useState<UserRole>(initialPortal);

  useEffect(() => {
    if (isOpen) {
      setSelectedPortal(initialPortal);
    }
  }, [isOpen, initialPortal]);

  if (!isOpen) return null;

  const activePortal = pendingNonLibrarianEmail ? 'librarian' : selectedPortal;

  return (
    <div
      className="fixed inset-0 z-50 bg-[#2A1A1F]/45 backdrop-blur-[2px] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-portal-title"
    >
      <div className="bg-[#FAF6F2] border border-[#EADFD9] rounded-2xl max-w-lg w-full shadow-xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-white border-b border-[#EADFD9] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/assets/aistudio/CeriLib_Cherry_Orbit_Logo_db8db79e.png"
              alt="CeriLib"
              referrerPolicy="no-referrer"
              className="h-7 w-auto object-contain"
            />
            <span className="text-xs text-[#6E585F] font-medium">
              Portal Autentikasi
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup jendela masuk"
            className="p-1.5 rounded-lg text-[#6E585F] hover:text-[#2A1A1F] hover:bg-[#F3EAE6] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 sm:p-7 space-y-6">
          <div className="space-y-1">
            <h2
              id="auth-portal-title"
              className="font-display text-xl font-semibold text-[#2A1A1F]"
            >
              Pilih Jalur Masuk Akun
            </h2>
            <p className="text-xs text-[#6E585F] leading-relaxed">
              Pilih peran akun Anda untuk membuka ruang peminjaman anggota atau ruang kerja manajemen koleksi pustakawan.
            </p>
          </div>

          {/* Dual Role Selector */}
          <div className="grid grid-cols-2 gap-3" role="tablist" aria-label="Pilih tipe akun">
            <button
              type="button"
              role="tab"
              aria-selected={activePortal === 'member'}
              onClick={() => setSelectedPortal('member')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                activePortal === 'member'
                  ? 'bg-white border-[#8F2D45] ring-2 ring-[#8F2D45]/15'
                  : 'bg-white/60 border-[#EADFD9] hover:bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <BookOpen
                  className={`w-5 h-5 ${
                    activePortal === 'member' ? 'text-[#8F2D45]' : 'text-[#6E585F]'
                  }`}
                />
                {activePortal === 'member' && (
                  <span className="w-2 h-2 rounded-full bg-[#8F2D45]" aria-hidden="true" />
                )}
              </div>
              <p className="font-display text-sm font-semibold text-[#2A1A1F]">
                Anggota Biasa
              </p>
              <p className="text-xs text-[#6E585F] mt-0.5 leading-snug">
                Pinjam & baca buku daring
              </p>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activePortal === 'librarian'}
              onClick={() => setSelectedPortal('librarian')}
              className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
                activePortal === 'librarian'
                  ? 'bg-white border-[#8F2D45] ring-2 ring-[#8F2D45]/15'
                  : 'bg-white/60 border-[#EADFD9] hover:bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Shield
                  className={`w-5 h-5 ${
                    activePortal === 'librarian' ? 'text-[#8F2D45]' : 'text-[#6E585F]'
                  }`}
                />
                {activePortal === 'librarian' && (
                  <span className="w-2 h-2 rounded-full bg-[#8F2D45]" aria-hidden="true" />
                )}
              </div>
              <p className="font-display text-sm font-semibold text-[#2A1A1F]">
                Pustakawan
              </p>
              <p className="text-xs text-[#6E585F] mt-0.5 leading-snug">
                Kelola koleksi & sirkulasi
              </p>
            </button>
          </div>

          {/* Role Details Panel */}
          {activePortal === 'member' ? (
            <div className="bg-white border border-[#EADFD9] rounded-xl p-5 space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-[#2A1A1F]">
                  Akses Portal Anggota
                </p>
                <ul className="text-xs text-[#6E585F] space-y-1.5 leading-relaxed">
                  <li>· Meminjam buku secara daring dengan pilihan durasi pinjam</li>
                  <li>· Membaca cuplikan edisi digital pada buku yang dipinjam</li>
                  <li>· Melihat riwayat peminjaman & menerima notifikasi keterlambatan otomatis</li>
                </ul>
              </div>
              <button
                type="button"
                disabled={isAuthenticating}
                onClick={() => onSignInWithRole('member')}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#8F2D45] text-white text-sm font-medium hover:bg-[#762237] disabled:opacity-60 transition-colors cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                <span>
                  {isAuthenticating ? 'Menghubungkan...' : 'Masuk sebagai Anggota (Google)'}
                </span>
              </button>
            </div>
          ) : (
            <div className="bg-white border border-[#EADFD9] rounded-xl p-5 space-y-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold text-[#2A1A1F]">
                  Akses Portal Pustakawan
                </p>
                <ul className="text-xs text-[#6E585F] space-y-1.5 leading-relaxed">
                  <li>· Menambah, menyunting, dan menghapus koleksi buku perpustakaan</li>
                  <li>· Mengawasi seluruh sirkulasi peminjaman aktif dan pengembalian</li>
                  <li>· Memeriksa keterlambatan otomatis dan mengatur akses pustakawan</li>
                </ul>
              </div>

              {pendingNonLibrarianEmail ? (
                <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-lg p-3.5 space-y-3">
                  <p className="text-xs text-[#B91C1C] leading-relaxed">
                    Akun <span className="font-mono font-medium">{pendingNonLibrarianEmail}</span> terdaftar sebagai <strong>Anggota Biasa</strong> dan belum memiliki hak akses Pustakawan.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={onContinueAsMember}
                      className="px-3.5 py-1.5 rounded-lg bg-[#8F2D45] text-white text-xs font-medium hover:bg-[#762237] cursor-pointer"
                    >
                      Lanjutkan sebagai Anggota
                    </button>
                    <button
                      type="button"
                      disabled={isAuthenticating}
                      onClick={() => onSignInWithRole('librarian')}
                      className="px-3.5 py-1.5 rounded-lg border border-[#DECFC8] bg-white text-xs font-medium text-[#2A1A1F] hover:bg-[#F3EAE6] cursor-pointer"
                    >
                      Pilih Akun Pustakawan Lain
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isAuthenticating}
                  onClick={() => onSignInWithRole('librarian')}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#2A1A1F] text-white text-sm font-medium hover:bg-[#3F2A30] disabled:opacity-60 transition-colors cursor-pointer"
                >
                  <Shield className="w-4 h-4" />
                  <span>
                    {isAuthenticating ? 'Memverifikasi...' : 'Masuk sebagai Pustakawan (Google)'}
                  </span>
                </button>
              )}
            </div>
          )}

          {authError && (
            <p className="text-xs text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-3.5 py-2.5">
              {authError}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
