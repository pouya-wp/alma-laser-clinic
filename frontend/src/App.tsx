import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { AdminDashboard } from './pages/AdminDashboard';
import { SecretaryPanel } from './pages/SecretaryPanel';
import { TelegramBookingApp } from './pages/TelegramBookingApp';
import { TelegramBotSimulator } from './pages/TelegramBotSimulator';
import { LoginPage } from './pages/LoginPage';
import { api } from './lib/api';
import { User } from './lib/types';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<'admin' | 'secretary' | 'client' | 'bot_sim'>('admin');
  const [loadingUser, setLoadingUser] = useState(true);

  useEffect(() => {
    // Check if directly navigating to booking webapp
    const path = window.location.pathname;
    if (path === '/book' || path === '/app' || window.location.search.includes('clientId')) {
      setCurrentView('client');
      setLoadingUser(false);
      return;
    }

    // Check existing stored session
    const storedUser = localStorage.getItem('alma_user');
    const token = localStorage.getItem('alma_auth_token');

    if (token && storedUser) {
      try {
        const u = JSON.parse(storedUser);
        setCurrentUser(u);
        setCurrentView(u.role === 'SUPER_ADMIN' ? 'admin' : 'secretary');
      } catch (e) {
        localStorage.removeItem('alma_user');
        localStorage.removeItem('alma_auth_token');
      }
    }
    setLoadingUser(false);
  }, []);

  function handleLogout() {
    api.logout();
    setCurrentUser(null);
  }

  function handleLoginSuccess(user: User) {
    setCurrentUser(user);
    setCurrentView(user.role === 'SUPER_ADMIN' ? 'admin' : 'secretary');
  }

  if (loadingUser) {
    return (
      <div className="min-h-screen bg-obsidian-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-alma-500/20 border-t-alma-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  // If in client webapp mode (for Telegram), render without login barrier
  if (currentView === 'client' && !currentUser) {
    return (
      <div className="min-h-screen bg-obsidian-950">
        <Navbar
          currentUser={currentUser}
          currentView={currentView}
          onViewChange={setCurrentView}
          onLogout={handleLogout}
        />
        <main>
          <TelegramBookingApp />
        </main>
      </div>
    );
  }

  // If user is not logged in, show LoginPage
  if (!currentUser) {
    return (
      <LoginPage
        onLoginSuccess={handleLoginSuccess}
        onSkipToClientApp={() => setCurrentView('client')}
      />
    );
  }

  // Logged-in application shell
  return (
    <div className="min-h-screen bg-obsidian-950 text-slate-100 flex flex-col">
      <Navbar
        currentUser={currentUser}
        currentView={currentView}
        onViewChange={setCurrentView}
        onLogout={handleLogout}
      />

      <main className="flex-1">
        {currentView === 'admin' && <AdminDashboard />}
        {currentView === 'secretary' && <SecretaryPanel />}
        {currentView === 'client' && <TelegramBookingApp />}
        {currentView === 'bot_sim' && <TelegramBotSimulator />}
      </main>
    </div>
  );
};

export default App;
