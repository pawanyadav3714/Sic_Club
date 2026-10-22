import React, { useState } from 'react';
import { Atom, LogOut, Menu, X, MessageSquare, Rocket } from 'lucide-react';
import Logo from './ui/Logo';
import { UserProfile } from '../types';

interface NavbarProps {
  currentUser: UserProfile | null;
  currentRoute: string;
  onNavigate: (route: string) => void;
  onLogout: () => void;
}

export default function Navbar({
  currentUser,
  currentRoute,
  onNavigate,
  onLogout,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const isGoogleUser = currentUser?.avatar_url && (currentUser.avatar_url.includes('googleusercontent.com') || currentUser.avatar_url.includes('google'));

  const getInitials = () => {
    if (!currentUser) return 'U';
    const first = currentUser.first_name?.charAt(0) || '';
    const last = currentUser.last_name?.charAt(0) || '';
    return `${first}${last}`.toUpperCase() || 'U';
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-[#030712]/80 border-b border-cyan-500/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        <Logo />

        {/* Actions & Utilities */}
        <div className="hidden lg:flex items-center gap-3">
          {currentUser ? (
            <div className="relative pl-2 border-l border-slate-800">
              <div 
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-3 cursor-pointer group py-1"
              >
                {/* Multicolor Glowing Border with Google Profile Picture or Initials */}
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-400 via-purple-500 to-pink-500 p-[2px] shadow-lg shadow-purple-500/30 group-hover:shadow-purple-500/60 transition-all flex-shrink-0">
                  {isGoogleUser ? (
                    <img
                      src={currentUser.avatar_url!}
                      alt="Google Profile"
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#030712] rounded-full flex items-center justify-center font-mono font-extrabold text-xs text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-purple-300 to-pink-300">
                      {getInitials()}
                    </div>
                  )}
                </div>
                <div className="text-left">
                  <div className="text-xs font-bold text-slate-200">{currentUser.first_name}</div>
                  <div className="text-[10px] text-cyan-400 font-mono capitalize">{currentUser.role}</div>
                </div>
              </div>

              {/* Profile Dropdown */}
              {profileDropdownOpen && (
                <div className="absolute right-0 mt-3 w-72 rounded-2xl bg-slate-900 border border-purple-500/40 shadow-2xl p-4 z-50 space-y-4 backdrop-blur-xl animate-fadeIn">
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-800">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-400 via-purple-500 to-pink-500 p-[2px] flex-shrink-0">
                      {isGoogleUser ? (
                        <img
                          src={currentUser.avatar_url!}
                          alt="Google Profile"
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-[#030712] rounded-full flex items-center justify-center text-xs font-bold text-cyan-300 font-mono">
                          {getInitials()}
                        </div>
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-xs font-extrabold text-slate-100">{currentUser.first_name} {currentUser.last_name}</div>
                      <div className="text-[11px] text-slate-400 font-mono truncate">{currentUser.email}</div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-950/50 hover:bg-red-900/60 text-red-400 text-xs font-bold transition-all shadow-md"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigate('login')}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-200 hover:text-cyan-400 transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => onNavigate('signup')}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 text-black shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40 hover:scale-105 transition-all"
              >
                Join Club
              </button>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="flex lg:hidden items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl bg-slate-800 text-slate-300"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-slate-900 border-b border-slate-800 px-4 pt-4 pb-6 space-y-3">
          <button
            onClick={() => { onNavigate('landing'); setMobileMenuOpen(false); }}
            className="block w-full text-left py-2 text-cyan-400 font-medium"
          >
            Home
          </button>
          {currentUser ? (
            <>
              <button
                onClick={() => { onNavigate('dashboard'); setMobileMenuOpen(false); }}
                className="block w-full text-left py-2 text-slate-200 font-medium"
              >
                Dashboard
              </button>
              <button
                onClick={() => { onNavigate('chat'); setMobileMenuOpen(false); }}
                className="block w-full text-left py-2 text-slate-200 font-medium"
              >
                Community Chat
              </button>
              <div className="pt-2 border-t border-slate-800 text-xs text-slate-400 font-mono truncate">
                {currentUser.email}
              </div>
              <button
                onClick={() => { onLogout(); setMobileMenuOpen(false); }}
                className="flex items-center gap-2 w-full text-left py-2 text-red-400 font-medium"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </>
          ) : (
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => { onNavigate('login'); setMobileMenuOpen(false); }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold text-center"
              >
                Sign In
              </button>
              <button
                onClick={() => { onNavigate('signup'); setMobileMenuOpen(false); }}
                className="flex-1 py-2.5 rounded-xl bg-cyan-500 text-black text-xs font-semibold text-center"
              >
                Join Club
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
