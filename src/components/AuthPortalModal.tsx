import { FormEvent, useEffect, useState } from 'react';
import {
  BookOpen,
  Eye,
  EyeOff,
  KeyRound,
  Shield,
  UserCheck,
  X,
} from 'lucide-react';
import { UserProfile, UserRole } from '../types/library';
import {
  fetchLibrarianAuthStatus,
  LibrarianAuthStatus,
  LibrarianSessionInfo,
  loginLibrarianWithCredentials,
  setupLibrarianCredentials,
} from '../services/librarianAuthService';

interface AuthPortalModalProps {
  isOpen: boolean;
  initialPortal: UserRole;
  isAuthenticating: boolean;
  authError: string | null;
  userProfile: UserProfile | null;
  librarianSession: LibrarianSessionInfo | null;
  onClose: () => void;
  onMemberGoogleLogin: () => Promise<void>;
  onLibrarianCredentialsVerified: (session: LibrarianSessionInfo) => void;
  onConnectLibrarianFirestore: () => Promise<void>;
}

export function AuthPortalModal({
  isOpen,
  initialPortal,
  isAuthenticating,
  authError,
  userProfile,
  librarianSession,
  onClose,
  onMemberGoogleLogin,
  onLibrarianCredentialsVerified,
  onConnectLibrarianFirestore,
}: AuthPortalModalProps) {
  const [selectedPortal, setSelectedPortal] = useState<UserRole>(initialPortal);
  const [status, setStatus] = useState<LibrarianAuthStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [submittingCreds, setSubmittingCreds] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedPortal(initialPortal);
    setLocalError(null);
    setPassword('');
    setConfirmPassword('');
    setLoadingStatus(true);
    void fetchLibrarianAuthStatus()
      .then((res) => setStatus(res))
      .catch(() =>
        setStatus({ configured: false, needsSetup: true, usingEnvOverride: false }),
      )
      .finally(() => setLoadingStatus(false));
  }, [isOpen, initialPortal]);

  if (!isOpen) return null;

  const combinedError = localError || authError;

  const handleLibrarianSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const trimmedUser = username.trim();
    if (trimmedUser.length < 3) {
      setLocalError('Username minimal 3 karakter (huruf, angka, ., _, -).');
      return;
    }
    if (password.length < 6) {
      setLocalError('Password minimal 6 karakter.');
      return;
    }

    if (status?.needsSetup) {
      if (password !== confirmPassword) {
        setLocalError('Konfirmasi password tidak cocok.');
        return;
      }
      setSubmittingCreds(true);
      try {
        const session = await setupLibrarianCredentials(trimmedUser, password);
        onLibrarianCredentialsVerified(session);
      } catch (err) {
        setLocalError(
          err instanceof Error ? err.message : 'Gagal menyimpan akun pustakawan.',
        );
      } finally {
        setSubmittingCreds(false);
      }
      return;
    }

    setSubmittingCreds(true);
    try {
      const session = await loginLibrarianWithCredentials(trimmedUser, password);
      onLibrarianCredentialsVerified(session);
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : 'Username atau password salah.',
      );
    } finally {
      setSubmittingCreds(false);
    }
  };

  const needsFirestoreLink =
    Boolean(librarianSession) && userProfile?.role !== 'librarian';

  return (
    <div
      className="fixed inset-0 z-50 bg-[#2A1A1F]/45 backdrop-blur-[2px] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-portal-title"
    >
      <div className="bg-[#FAF6F2] border border-[#EADFD9] rounded-2xl max-w-lg w-full shadow-xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-white border-b border-[#EADFD9] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/assets/aistudio/CeriLib_Cherry_Orbit_Logo_db8db79e.png"
              alt="CeriLib"
              referrerPolicy="no-referrer"
              className="h-7 w-auto object-contain"
            />
            <span className="text-xs text-[#6E585F] font-medium">
              Portal Masuk Perpustakaan
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

        <div className="p-6 sm:p-7 space-y-5">
          <div>
            <h2
              id="auth-portal-title"
              className="font-display text-xl font-semibold text-[#2A1A1F]"
            >
              Masuk ke CeriLib
            </h2>
            <p className="text-xs text-[#6E585F] mt-1">
              Anggota biasa masuk dengan Google, sedangkan pustakawan menggunakan username & password khusus.
            </p>
          </div>

          {/* Role Switcher */}
          <div className="grid grid-cols-2 gap-3" role="tablist" aria-label="Pilih jalur masuk">
            <button
              type="button"
              role="tab"
              aria-selected={selectedPortal === 'member'}
              onClick={() => {
                setSelectedPortal('member');
                setLocalError(null);
              }}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                selectedPortal === 'member'
                  ? 'bg-white border-[#8F2D45] ring-2 ring-[#8F2D45]/15'
                  : 'bg-white/60 border-[#EADFD9] hover:bg-white'
              }`}
            >
              <BookOpen
                className={`w-4 h-4 mb-2 ${
                  selectedPortal === 'member' ? 'text-[#8F2D45]' : 'text-[#6E585F]'
                }`}
              />
              <p className="font-display text-sm font-semibold text-[#2A1A1F]">
                Anggota Biasa
              </p>
              <p className="text-[11px] text-[#6E585F] mt-0.5">
                Masuk dengan Akun Google
              </p>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={selectedPortal === 'librarian'}
              onClick={() => {
                setSelectedPortal('librarian');
                setLocalError(null);
              }}
              className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                selectedPortal === 'librarian'
                  ? 'bg-white border-[#8F2D45] ring-2 ring-[#8F2D45]/15'
                  : 'bg-white/60 border-[#EADFD9] hover:bg-white'
              }`}
            >
              <Shield
                className={`w-4 h-4 mb-2 ${
                  selectedPortal === 'librarian' ? 'text-[#8F2D45]' : 'text-[#6E585F]'
                }`}
              />
              <p className="font-display text-sm font-semibold text-[#2A1A1F]">
                Pustakawan
              </p>
              <p className="text-[11px] text-[#6E585F] mt-0.5">
                Username & Password Khusus
              </p>
            </button>
          </div>

          {/* Portal 1: Member Google Login */}
          {selectedPortal === 'member' && (
            <div className="bg-white border border-[#EADFD9] rounded-xl p-5 space-y-4">
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-[#2A1A1F]">
                  Akses Anggota Perpustakaan
                </p>
                <p className="text-xs text-[#6E585F] leading-relaxed">
                  Gunakan akun Google Anda untuk meminjam buku secara daring, membaca edisi digital, memantau riwayat, dan menerima notifikasi jatuh tempo otomatis.
                </p>
              </div>
              <button
                type="button"
                disabled={isAuthenticating}
                onClick={() => void onMemberGoogleLogin()}
                className="w-full inline-flex items-center justify-center gap-2.5 px-5 py-2.5 rounded-lg bg-[#8F2D45] text-white text-sm font-medium hover:bg-[#762237] disabled:opacity-60 transition-colors cursor-pointer"
              >
                <UserCheck className="w-4 h-4" />
                <span>
                  {isAuthenticating ? 'Menghubungkan Google...' : 'Masuk dengan Akun Google'}
                </span>
              </button>
            </div>
          )}

          {/* Portal 2: Librarian Username & Password */}
          {selectedPortal === 'librarian' && (
            <div className="bg-white border border-[#EADFD9] rounded-xl p-5 space-y-4">
              {loadingStatus ? (
                <div className="py-6 text-center text-xs text-[#6E585F]">
                  Memeriksa status akses pustakawan...
                </div>
              ) : needsFirestoreLink && librarianSession ? (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-[#15803D]">
                      Kredensial Pustakawan Terverifikasi ({librarianSession.username})
                    </p>
                    <p className="text-xs text-[#6E585F] leading-relaxed">
                      Satu langkah lagi: hubungkan sesi Google Cloud Firestore dengan akun pustakawan terotorisasi untuk membuka manajemen koleksi dan sirkulasi.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isAuthenticating}
                    onClick={() => void onConnectLibrarianFirestore()}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#8F2D45] text-white text-sm font-medium hover:bg-[#762237] disabled:opacity-60 transition-colors cursor-pointer"
                  >
                    <Shield className="w-4 h-4" />
                    <span>
                      {isAuthenticating
                        ? 'Menghubungkan Database...'
                        : 'Hubungkan Database & Masuk Ruang Pustakawan'}
                    </span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleLibrarianSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-[#2A1A1F] flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-[#8F2D45]" />
                      <span>
                        {status?.needsSetup
                          ? 'Atur Username & Password Pustakawan (Pertama Kali)'
                          : 'Masuk dengan Username & Password Pustakawan'}
                      </span>
                    </p>
                    <p className="text-[11px] text-[#6E585F] leading-relaxed">
                      {status?.needsSetup
                        ? 'Belum ada kredensial pustakawan tersimpan. Tentukan username dan password khusus Anda sendiri (dapat diubah kapan saja di pengaturan).'
                        : 'Masukkan username dan password pustakawan yang telah Anda atur.'}
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-[#2A1A1F] mb-1">
                        Username Pustakawan
                      </label>
                      <input
                        type="text"
                        required
                        autoComplete="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="contoh: pustakawan_cerilib"
                        className="w-full px-3.5 py-2 bg-[#FAF6F2] border border-[#DECFC8] rounded-lg text-sm text-[#2A1A1F] focus:outline-none focus:border-[#8F2D45]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-[#2A1A1F] mb-1">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          autoComplete={
                            status?.needsSetup ? 'new-password' : 'current-password'
                          }
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Minimal 6 karakter"
                          className="w-full pl-3.5 pr-10 py-2 bg-[#FAF6F2] border border-[#DECFC8] rounded-lg text-sm text-[#2A1A1F] focus:outline-none focus:border-[#8F2D45]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((prev) => !prev)}
                          aria-label={
                            showPassword ? 'Sembunyikan password' : 'Lihat password'
                          }
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#6E585F] hover:text-[#2A1A1F] cursor-pointer"
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {status?.needsSetup && (
                      <div>
                        <label className="block text-xs font-medium text-[#2A1A1F] mb-1">
                          Konfirmasi Password
                        </label>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          autoComplete="new-password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Ulangi password"
                          className="w-full px-3.5 py-2 bg-[#FAF6F2] border border-[#DECFC8] rounded-lg text-sm text-[#2A1A1F] focus:outline-none focus:border-[#8F2D45]"
                        />
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={submittingCreds || isAuthenticating}
                    className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#2A1A1F] text-white text-sm font-medium hover:bg-[#3F2A30] disabled:opacity-60 transition-colors cursor-pointer"
                  >
                    <Shield className="w-4 h-4" />
                    <span>
                      {submittingCreds
                        ? 'Memproses...'
                        : status?.needsSetup
                          ? 'Simpan & Masuk Ruang Pustakawan'
                          : 'Masuk sebagai Pustakawan'}
                    </span>
                  </button>
                </form>
              )}
            </div>
          )}

          {combinedError && (
            <div
              role="alert"
              className="text-xs text-[#B91C1C] bg-[#FEF2F2] border border-[#FECACA] rounded-lg px-3.5 py-2.5 leading-relaxed"
            >
              {combinedError}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
