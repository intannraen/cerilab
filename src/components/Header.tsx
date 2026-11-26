import { ActiveTab, UserProfile } from '../types/library';
import { LogIn, LogOut } from 'lucide-react';

interface HeaderProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  userProfile: UserProfile | null;
  unreadNotificationsCount: number;
  isAuthenticating: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
}

export function Header({
  activeTab,
  onSelectTab,
  userProfile,
  unreadNotificationsCount,
  isAuthenticating,
  onSignIn,
  onSignOut,
}: HeaderProps) {
  const navItems: { id: ActiveTab; label: string; count?: number }[] = [
    { id: 'catalog', label: 'Katalog' },
    { id: 'loans', label: 'Peminjaman' },
    {
      id: 'notifications',
      label: 'Notifikasi',
      count: unreadNotificationsCount > 0 ? unreadNotificationsCount : undefined,
    },
    { id: 'librarian', label: 'Pustakawan' },
  ];

  return (
    <header className="sticky top-0 z-30 bg-[#FAF6F2]/95 backdrop-blur-sm border-b border-[#EADFD9]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-element Brand Mark */}
        <button
          type="button"
          onClick={() => onSelectTab('catalog')}
          className="flex items-center shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8F2D45] rounded-lg cursor-pointer"
          aria-label="Beranda CeriLib"
        >
          <img
            src="/assets/aistudio/CeriLib_Cherry_Orbit_Logo_db8db79e.png"
            alt="CeriLib"
            referrerPolicy="no-referrer"
            className="h-10 w-auto object-contain"
          />
        </button>

        {/* Zone 2: Clean Single-Line Navigation Links */}
        <nav
          aria-label="Navigasi utama"
          className="hidden md:flex items-center gap-7 text-sm font-medium"
        >
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative py-2 whitespace-nowrap shrink-0 transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8F2D45] rounded ${
                  isActive
                    ? 'text-[#8F2D45] font-semibold'
                    : 'text-[#6E585F] hover:text-[#2A1A1F]'
                }`}
              >
                <span className="inline-flex items-center gap-1.5">
                  <span>{item.label}</span>
                  {item.count !== undefined && (
                    <span className="font-mono tabular-nums text-xs text-[#B91C1C] font-semibold">
                      ({item.count})
                    </span>
                  )}
                </span>
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#8F2D45] rounded-full"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="flex items-center shrink-0">
          {userProfile ? (
            <button
              type="button"
              onClick={onSignOut}
              title={`${userProfile.displayName} (${userProfile.email})`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[#DECFC8] bg-white text-xs font-medium text-[#2A1A1F] hover:bg-[#F3EAE6] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8F2D45]"
            >
              <span className="max-w-[120px] truncate">{userProfile.displayName}</span>
              <LogOut className="w-3.5 h-3.5 text-[#6E585F]" />
            </button>
          ) : (
            <button
              type="button"
              disabled={isAuthenticating}
              onClick={onSignIn}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#8F2D45] text-white text-xs font-medium hover:bg-[#762237] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8F2D45]"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{isAuthenticating ? 'Memproses...' : 'Masuk Anggota'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Compact Mobile Navigation Row (only below md breakpoint) */}
      <nav
        aria-label="Navigasi seluler"
        className="md:hidden border-t border-[#EADFD9] px-4 py-1.5 flex items-center justify-between gap-2 overflow-x-auto"
      >
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 rounded-md transition-colors cursor-pointer ${
                isActive
                  ? 'text-[#8F2D45] bg-[#8F2D45]/10 font-semibold'
                  : 'text-[#6E585F] hover:text-[#2A1A1F]'
              }`}
            >
              {item.label}
              {item.count !== undefined ? ` (${item.count})` : ''}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
