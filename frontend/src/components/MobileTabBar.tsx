import React from 'react';
import { LayoutDashboard, Calendar, Users, Send, Settings } from 'lucide-react';

interface MobileTabBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  role: 'admin' | 'secretary';
}

export const MobileTabBar: React.FC<MobileTabBarProps> = ({ activeTab, onTabChange, role }) => {
  const adminTabs = [
    { id: 'overview', label: 'داشبورد', icon: LayoutDashboard },
    { id: 'appointments', label: 'نوبت‌ها', icon: Calendar },
    { id: 'clients', label: 'مشتریان', icon: Users },
    { id: 'broadcast', label: 'ارسال پیام', icon: Send },
    { id: 'settings', label: 'تنظیمات', icon: Settings },
  ];

  const secretaryTabs = [
    { id: 'queue', label: 'صف پذیرش', icon: Calendar },
    { id: 'booking', label: 'ثبت نوبت', icon: LayoutDashboard },
    { id: 'clients', label: 'مشتریان', icon: Users },
  ];

  const tabs = role === 'admin' ? adminTabs : secretaryTabs;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-obsidian-950/90 backdrop-blur-2xl border-t border-white/10 safe-padding-bottom">
      <div className="flex items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center flex-1 py-1 px-1 transition-all duration-200 relative ${
                isActive ? 'text-alma-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isActive && (
                <span className="absolute -top-1 w-8 h-1 rounded-full bg-gradient-to-r from-alma-500 to-pink-400 shadow-glow-alma" />
              )}
              <Icon className={`w-5 h-5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
              <span className="text-[10px] mt-1 tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
