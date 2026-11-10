import React from 'react';
import { User, Sparkles, Shield, UserCheck, Smartphone, LogOut } from 'lucide-react';
import { getTodayJalali } from '../lib/jalali';

interface NavbarProps {
  currentUser: any;
  currentView: 'admin' | 'secretary' | 'client' | 'bot_sim';
  onViewChange: (view: 'admin' | 'secretary' | 'client' | 'bot_sim') => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  currentView,
  onViewChange,
  onLogout,
}) => {
  const jalali = getTodayJalali();

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-alma-500/20 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="relative group cursor-pointer" onClick={() => onViewChange('admin')}>
            <div className="absolute -inset-1 bg-gradient-to-r from-alma-500 to-amber-400 rounded-full blur-sm opacity-70 group-hover:opacity-100 transition duration-300"></div>
            <img
              src="/logo/org.png"
              alt="Alma Clinic Logo"
              className="relative w-10 h-10 object-contain drop-shadow"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-pink-100 to-alma-300 bg-clip-text text-transparent">
                کلینیک لیزر آلما
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-alma-500/20 text-alma-300 border border-alma-500/30">
                یزد
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              تخصصی‌ترین مرکز الکساندرایت کندلا ۲۰۲۴
            </p>
          </div>
        </div>

        {/* Center: Live Date & Time Indicator */}
        <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-full bg-obsidian-900/80 border border-white/5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-xs text-slate-300 font-medium">
            امروز {jalali.dayName}، {jalali.day} {jalali.monthName} {jalali.year}
          </span>
        </div>

        {/* View Switcher / Quick Navigation Tabs */}
        <div className="flex items-center gap-2">
          <nav className="flex items-center gap-1 bg-obsidian-900/90 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => onViewChange('admin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                currentView === 'admin'
                  ? 'bg-gradient-to-r from-alma-600 to-alma-500 text-white shadow-glow-alma'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">مدیریت کل (PWA)</span>
              <span className="sm:hidden">ادمین</span>
            </button>

            <button
              onClick={() => onViewChange('secretary')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                currentView === 'secretary'
                  ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white shadow-glow-gold'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">میز منشی</span>
              <span className="sm:hidden">منشی</span>
            </button>

            <button
              onClick={() => onViewChange('client')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                currentView === 'client'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-500 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">وب‌اپ تلگرام (TWA)</span>
              <span className="sm:hidden">وب‌اپ</span>
            </button>

            <button
              onClick={() => onViewChange('bot_sim')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                currentView === 'bot_sim'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-500 text-white shadow-glow-alma'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ربات دکمه‌ای</span>
              <span className="sm:hidden">ربات</span>
            </button>
          </nav>

          {currentUser && (
            <button
              onClick={onLogout}
              title="خروج از حساب"
              className="p-2 rounded-xl bg-obsidian-900/90 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-white/10 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
