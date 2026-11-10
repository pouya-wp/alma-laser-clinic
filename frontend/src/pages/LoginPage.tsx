import React, { useState } from 'react';
import { Shield, Sparkles, UserCheck, Lock, User as UserIcon } from 'lucide-react';
import { api } from '../lib/api';

interface LoginPageProps {
  onLoginSuccess: (user: any) => void;
  onSkipToClientApp: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onSkipToClientApp }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.login(username, password);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'نام کاربری یا رمز عبور اشتباه است.');
    } finally {
      setLoading(false);
    }
  }

  // Quick 1-click Demo Logins
  async function handleQuickLogin(role: 'admin' | 'secretary') {
    setLoading(true);
    setError(null);
    try {
      const u = role === 'admin' ? 'admin' : 'secretary';
      const p = role === 'admin' ? 'alma@admin2026' : 'alma@sec2026';
      const res = await api.login(u, p);
      onLoginSuccess(res.user);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-obsidian-950">
      {/* Background glowing orbs */}
      <div className="absolute top-1/4 -right-20 w-80 h-80 bg-alma-500/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 -left-20 w-80 h-80 bg-amber-500/15 rounded-full blur-3xl pointer-events-none"></div>

      <div className="relative w-full max-w-md glass-panel rounded-3xl p-8 border border-alma-500/30 shadow-2xl space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="relative inline-block">
            <div className="absolute -inset-1.5 bg-gradient-to-r from-alma-500 to-amber-400 rounded-full blur-md opacity-80"></div>
            <img
              src="/logo/org.png"
              alt="Alma Clinic Logo"
              className="relative w-16 h-16 object-contain mx-auto drop-shadow-xl"
            />
          </div>
          <h1 className="text-xl font-black text-white">سامانه هوشمند کلینیک لیزر آلما</h1>
          <p className="text-xs text-slate-400">
            ورود به پنل مدیریت ارشد و میز منشی (یزد)
          </p>
        </div>

        {/* Quick Demo Access Bar */}
        <div className="space-y-2 pt-2">
          <span className="text-[11px] font-bold text-slate-400 block text-center">
            ورود سریع آزمایشی (۱ کلیک):
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin')}
              className="py-2.5 px-3 rounded-xl bg-alma-600/30 hover:bg-alma-600/50 border border-alma-500/40 text-alma-300 text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <Shield className="w-3.5 h-3.5" />
              ورود سوپر ادمین
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('secretary')}
              className="py-2.5 px-3 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/40 text-amber-300 text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <UserCheck className="w-3.5 h-3.5" />
              ورود میز منشی
            </button>
          </div>
        </div>

        <div className="relative flex items-center justify-center">
          <div className="border-t border-white/10 w-full"></div>
          <span className="bg-obsidian-900 px-3 text-[10px] text-slate-500 uppercase absolute font-bold">
            یا ورود با نام کاربری
          </span>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              نام کاربری:
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 absolute right-3.5 top-3 text-slate-500" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin یا secretary"
                className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-obsidian-900 border border-white/10 text-xs text-white focus:outline-none focus:border-alma-500 font-mono text-left"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              رمز عبور:
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute right-3.5 top-3 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pr-10 pl-4 py-2.5 rounded-xl bg-obsidian-900 border border-white/10 text-xs text-white focus:outline-none focus:border-alma-500 font-mono text-left"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-alma-600 to-alma-500 text-white font-extrabold text-xs shadow-glow-alma hover:opacity-95 transition disabled:opacity-50"
          >
            {loading ? 'در حال ورود...' : 'ورود به سامانه'}
          </button>
        </form>

        {/* View Client WebApp Button */}
        <div className="pt-2 text-center border-t border-white/5">
          <button
            type="button"
            onClick={onSkipToClientApp}
            className="text-xs text-slate-400 hover:text-alma-300 font-medium transition"
          >
            مشاهده وب‌اپلیکیشن تلگرام بدون لاگین منشی ←
          </button>
        </div>
      </div>
    </div>
  );
};
