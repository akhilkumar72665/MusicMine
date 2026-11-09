import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  Headphones,
  Lock,
  Mail,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
  UserCheck,
  X,
} from 'lucide-react';
import {
  AuditLogEntry,
  ContentReport,
  HomepageSection,
  RoutePath,
  Track,
  UserAccount,
  UserRole,
} from '../../../shared/types/music';
import { formatDuration, getEmailAvatarUrl } from '../data/catalogFixtures';

interface AuthViewProps {
  mode: 'login' | 'signup';
  currentUser: UserAccount | null;
  onLoginEmail: (email: string, displayName: string, role: UserRole) => void;
  onLoginGoogle: (customEmail?: string, customName?: string) => void;
  onLoginDemo: (user: UserAccount) => void;
  onContinueGuest: () => void;
  onNavigate: (path: RoutePath) => void;
  onNotify: (msg: string) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  mode,
  currentUser,
  onLoginEmail,
  onLoginGoogle,
  onLoginDemo,
  onContinueGuest,
  onNavigate,
  onNotify,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      onNotify('Please enter a valid email and password.');
      return;
    }
    const inferredName =
      displayName.trim() || email.trim().split('@')[0] || 'Music Listener';
    onLoginEmail(email.trim(), inferredName, 'listener');
  };

  const handleGoogleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanMail = googleEmail.trim() || 'listener.music@gmail.com';
    const cleanName = googleName.trim() || cleanMail.split('@')[0] || 'Google Listener';
    onLoginGoogle(cleanMail, cleanName);
    setShowGoogleModal(false);
  };

  return (
    <div className="max-w-xl mx-auto py-8 px-4">
      <div className="bg-[#0A0A0A] border border-neutral-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl">
        {/* Top Header & Mode Switcher */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="inline-flex p-1 rounded-xl bg-neutral-900 border border-neutral-800">
              <button
                type="button"
                onClick={() => onNavigate('/login')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${mode === 'login'
                    ? 'bg-[#BC0202] text-white shadow'
                    : 'text-neutral-400 hover:text-white'
                  }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/signup')}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${mode === 'signup'
                    ? 'bg-[#BC0202] text-white shadow'
                    : 'text-neutral-400 hover:text-white'
                  }`}
              >
                Create Account
              </button>
            </div>

            <span className="text-[11px] font-mono text-neutral-500 uppercase tracking-widest">
              Listener Access
            </span>
          </div>

          <div>
            <h1 className="text-2xl font-display font-bold text-white">
              {mode === 'login' ? 'Welcome Back to MusicMine' : 'Create your Listener Account'}
            </h1>
            <p className="text-sm text-neutral-400 mt-1">
              {mode === 'login'
                ? 'Sign in to access your personal liked songs, custom playlists, and listening history.'
                : 'Save your favorite tracks, build custom playlists, and sync across your devices.'}
            </p>
          </div>
        </div>

        {currentUser && (
          <div className="p-3.5 rounded-xl bg-neutral-900/90 border border-neutral-800 flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={currentUser.avatarUrl || getEmailAvatarUrl(currentUser.email, currentUser.displayName)}
                alt={currentUser.displayName}
                className="w-8 h-8 rounded-full object-cover shrink-0 border border-[#BC0202]/60"
              />
              <div className="min-w-0">
                <p className="text-white font-medium truncate">
                  Logged in as {currentUser.displayName}
                </p>
                <p className="text-neutral-400 text-[11px] truncate">
                  {currentUser.email} · <span className="capitalize text-[#ff7272]">{currentUser.role}</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('/profile')}
              className="px-3.5 py-1.5 rounded-lg bg-[#BC0202] hover:bg-[#FF0000] text-white font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow"
            >
              My Profile
            </button>
          </div>
        )}

        {/* Google Sign-In */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setShowGoogleModal(true)}
            className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-neutral-200 text-black font-semibold text-sm flex items-center justify-center gap-3 transition-colors cursor-pointer shadow"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <div className="flex items-center gap-3 text-xs text-neutral-500">
            <div className="h-px bg-neutral-800 flex-1" />
            <span>or continue with email & password</span>
            <div className="h-px bg-neutral-800 flex-1" />
          </div>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Full Name / Display Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="e.g. Rohit Sharma"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-black border border-neutral-800 focus:border-[#FF0000] focus:outline-none text-sm text-white placeholder-neutral-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-black border border-neutral-800 focus:border-[#FF0000] focus:outline-none text-sm text-white placeholder-neutral-500"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-neutral-300">Password</label>
              {mode === 'login' && (
                <button
                  type="button"
                  onClick={() => {
                    setResetSent(true);
                    onNotify('Password reset instructions sent to your email.');
                  }}
                  className="text-xs text-neutral-400 hover:text-[#FF0000] transition-colors cursor-pointer"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-black border border-neutral-800 focus:border-[#FF0000] focus:outline-none text-sm text-white placeholder-neutral-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3.5 top-3 text-neutral-500 hover:text-white cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {resetSent && (
            <p className="text-xs text-neutral-300 bg-neutral-900 border border-neutral-800 rounded-xl p-3">
              If an account exists for that email address, password reset instructions have been sent.
            </p>
          )}

          <button
            type="submit"
            className="w-full py-3 px-4 rounded-xl bg-[#BC0202] hover:bg-[#FF0000] text-white font-semibold text-sm transition-all shadow-lg hover:shadow-[0_0_20px_rgba(255,0,0,0.4)] cursor-pointer"
          >
            {mode === 'login' ? 'Sign In as Listener' : 'Create Listener Account'}
          </button>
        </form>

        {/* Guest Mode Action */}
        <div className="pt-4 border-t border-neutral-800/80">
          <button
            type="button"
            onClick={onContinueGuest}
            className="w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-850 border border-neutral-800 text-xs text-neutral-300 hover:text-white font-medium transition-colors cursor-pointer"
          >
            Continue as Guest Listener (No Sign-in Required)
          </button>
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-neutral-800/80 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-400">
          {mode === 'login' ? (
            <span>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => onNavigate('/signup')}
                className="text-white hover:text-[#FF0000] font-semibold underline cursor-pointer"
              >
                Sign up free
              </button>
            </span>
          ) : (
            <span>
              Already registered?{' '}
              <button
                type="button"
                onClick={() => onNavigate('/login')}
                className="text-white hover:text-[#FF0000] font-semibold underline cursor-pointer"
              >
                Sign in
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={onContinueGuest}
            className="text-neutral-300 hover:text-white transition-colors cursor-pointer font-medium"
          >
            Continue as Guest →
          </button>
        </div>
      </div>

      {/* Google Login Modal Dialog */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#101010] border border-neutral-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center p-1.5">
                  <svg className="w-full h-full" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                </div>
                <h3 className="text-base font-semibold text-white">Sign in with Google</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGoogleModal(false)}
                className="p-1 rounded-full text-neutral-400 hover:text-white hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-400">
              Enter your Google account details to sync your personalized library and playlists across all devices.
            </p>

            <form onSubmit={handleGoogleSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-neutral-300 mb-1">
                  Google Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Verma"
                  value={googleName}
                  onChange={(e) => setGoogleName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-[#4285F4]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-300 mb-1">
                  Gmail Address
                </label>
                <input
                  type="email"
                  placeholder="you@gmail.com"
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-700 text-xs text-white focus:outline-none focus:border-[#4285F4]"
                />
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-[#4285F4] hover:bg-[#3367D6] text-white font-semibold text-xs transition-colors cursor-pointer shadow"
                >
                  Continue as {googleName.trim() || 'Google Listener'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onLoginGoogle('listener.google@gmail.com', 'Google Listener');
                    setShowGoogleModal(false);
                  }}
                  className="w-full py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white font-medium text-xs transition-colors cursor-pointer"
                >
                  ⚡ Instant 1-Click Google Sign-In
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

interface AdminDashboardViewProps {
  subRoute: string;
  currentUser: UserAccount | null;
  tracks: Track[];
  homepageSections: HomepageSection[];
  users: UserAccount[];
  auditLogs: AuditLogEntry[];
  reports: ContentReport[];
  onToggleTrackVisibility: (trackId: string) => void;
  onToggleSectionEnabled: (secId: string) => void;
  onMoveSectionOrder: (secId: string, dir: 'up' | 'down') => void;
  onToggleUserStatus: (userId: string) => void;
  onResolveReport: (reportId: string, resolution: 'resolved_hidden' | 'dismissed') => void;
  onNavigate: (path: RoutePath) => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  subRoute,
  currentUser,
  tracks,
  homepageSections,
  users,
  auditLogs,
  reports,
  onToggleTrackVisibility,
  onToggleSectionEnabled,
  onMoveSectionOrder,
  onToggleUserStatus,
  onResolveReport,
  onNavigate,
}) => {
  if (!currentUser || currentUser.role !== 'super_admin') {
    return (
      <div className="max-w-xl mx-auto py-12 px-4">
        <div className="bg-[#0A0A0A] border border-[#BC0202]/60 rounded-xl p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-3 text-[#FF0000]">
            <ShieldAlert className="w-6 h-6 shrink-0" />
            <h1 className="text-xl font-display font-bold text-white">
              Admin Authorization Required
            </h1>
          </div>
          <p className="text-sm text-neutral-300 leading-relaxed">
            You must be signed in with a Super Admin account to access platform administration.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('/login')}
              className="px-4 py-2 rounded-lg bg-[#BC0202] hover:bg-[#FF0000] text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="px-4 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-medium border border-neutral-800 transition-colors cursor-pointer"
            >
              Return Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  const adminTabs: { label: string; path: RoutePath; key: string }[] = [
    { label: 'Overview', path: '/admin', key: 'overview' },
    { label: 'Catalog', path: '/admin/catalog', key: 'catalog' },
    { label: 'Homepage', path: '/admin/homepage', key: 'homepage' },
    { label: 'Users', path: '/admin/users', key: 'users' },
    { label: 'Analytics', path: '/admin/analytics', key: 'analytics' },
    { label: 'Reports', path: '/admin/reports', key: 'reports' },
    { label: 'Settings', path: '/admin/settings', key: 'settings' },
    { label: 'Audit Logs', path: '/admin/audit-logs', key: 'audit-logs' },
  ];

  const visibleCount = tracks.filter((t) => t.visibleInCatalog).length;
  const openReportsCount = reports.filter((r) => r.status === 'open' || r.status === 'investigating').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">
            Admin Console
          </h1>
          <p className="text-xs text-neutral-400 mt-0.5">
            Manage catalog visibility, homepage sections, users, and compliance reports
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-neutral-300">
          <ShieldCheck className="w-4 h-4 text-[#FF0000]" />
          <span>Super Admin ({currentUser.email})</span>
        </div>
      </div>

      {/* Sub-navigation tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
        {adminTabs.map((tab) => {
          const isActive =
            (subRoute === '' && tab.key === 'overview') || subRoute === tab.key;
          return (
            <button
              key={tab.path}
              type="button"
              onClick={() => onNavigate(tab.path)}
              className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${isActive
                  ? 'bg-[#BC0202] text-white'
                  : 'bg-[#0A0A0A] text-neutral-400 hover:text-white border border-neutral-800'
                }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Overview Tab */}
      {(subRoute === '' || subRoute === 'overview') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#0A0A0A] border border-neutral-800 rounded-xl p-4 space-y-1">
            <p className="text-xs text-neutral-400">Visible Catalog Songs</p>
            <p className="text-2xl font-display font-bold font-mono tabular-nums text-white">
              {visibleCount} / {tracks.length}
            </p>
            <p className="text-xs text-neutral-500">Published in search & discovery</p>
          </div>
          <div className="bg-[#0A0A0A] border border-neutral-800 rounded-xl p-4 space-y-1">
            <p className="text-xs text-neutral-400">Homepage Sections</p>
            <p className="text-2xl font-display font-bold font-mono tabular-nums text-white">
              {homepageSections.filter((s) => s.enabled).length} / {homepageSections.length}
            </p>
            <p className="text-xs text-neutral-500">Active on home page</p>
          </div>
          <div className="bg-[#0A0A0A] border border-neutral-800 rounded-xl p-4 space-y-1">
            <p className="text-xs text-neutral-400">Open Reports</p>
            <p className="text-2xl font-display font-bold font-mono tabular-nums text-[#FF0000]">
              {openReportsCount}
            </p>
            <p className="text-xs text-neutral-500">Pending moderation review</p>
          </div>
          <div className="bg-[#0A0A0A] border border-neutral-800 rounded-xl p-4 space-y-1">
            <p className="text-xs text-neutral-400">Audit Log Entries</p>
            <p className="text-2xl font-display font-bold font-mono tabular-nums text-white">
              {auditLogs.length}
            </p>
            <p className="text-xs text-neutral-500">Recorded admin actions</p>
          </div>
        </div>
      )}

      {/* Catalog Visibility Tab */}
      {subRoute === 'catalog' && (
        <div className="bg-[#0A0A0A] border border-neutral-800 rounded-xl p-5 space-y-4">
          <div>
            <h2 className="text-base font-display font-semibold text-white">
              Catalog Visibility
            </h2>
            <p className="text-xs text-neutral-400">
              Show or hide tracks across the public catalog.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-400">
                  <th className="py-2.5 pr-4 font-medium">Track</th>
                  <th className="py-2.5 px-4 font-medium">Artist · Language</th>
                  <th className="py-2.5 px-4 font-medium">Label</th>
                  <th className="py-2.5 px-4 font-medium text-right">Duration</th>
                  <th className="py-2.5 pl-4 font-medium text-right">Visibility</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/70">
                {tracks.map((t) => (
                  <tr key={t.id} className="hover:bg-neutral-900/50">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-white">{t.cleanTitle}</p>
                    </td>
                    <td className="py-3 px-4 text-neutral-300">
                      {t.artistName} · {t.language}
                    </td>
                    <td className="py-3 px-4 text-neutral-400">
                      {t.uploader}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-neutral-400">
                      {formatDuration(t.duration)}
                    </td>
                    <td className="py-3 pl-4 text-right">
                      <button
                        type="button"
                        onClick={() => onToggleTrackVisibility(t.id)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${t.visibleInCatalog
                            ? 'bg-neutral-900 hover:bg-[#830000]/40 text-white border border-neutral-700'
                            : 'bg-[#830000]/30 hover:bg-[#BC0202] text-[#FF0000] hover:text-white border border-[#BC0202]/50'
                          }`}
                      >
                        {t.visibleInCatalog ? (
                          <>
                            <Eye className="w-3.5 h-3.5" />
                            <span>Visible</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3.5 h-3.5" />
                            <span>Hidden</span>
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Homepage Curation Tab */}
      {subRoute === 'homepage' && (
        <div className="bg-[#0A0A0A] border border-neutral-800 rounded-xl p-5 space-y-4">
          <div>
            <h2 className="text-base font-display font-semibold text-white">
              Homepage Curation
            </h2>
            <p className="text-xs text-neutral-400">
              Reorder or toggle featured sections displayed on the Home page.
            </p>
          </div>
          <div className="space-y-3">
            {[...homepageSections]
              .sort((a, b) => a.order - b.order)
              .map((sec, idx) => (
                <div
                  key={sec.id}
                  className="p-4 rounded-xl bg-black border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div>
                    <p className="text-xs font-mono text-neutral-500">
                      Section #{idx + 1} · {sec.itemIds.length} items
                    </p>
                    <h3 className="text-sm font-semibold text-white mt-0.5">{sec.title}</h3>
                    <p className="text-xs text-neutral-400 mt-0.5">{sec.subtitle}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => onMoveSectionOrder(sec.id, 'up')}
                      className="p-2 rounded-lg bg-neutral-900 text-neutral-300 hover:text-white disabled:opacity-30 cursor-pointer"
                      aria-label="Move section up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === homepageSections.length - 1}
                      onClick={() => onMoveSectionOrder(sec.id, 'down')}
                      className="p-2 rounded-lg bg-neutral-900 text-neutral-300 hover:text-white disabled:opacity-30 cursor-pointer"
                      aria-label="Move section down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggleSectionEnabled(sec.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${sec.enabled
                          ? 'bg-[#BC0202] text-white'
                          : 'bg-neutral-900 text-neutral-400 border border-neutral-800'
                        }`}
                    >
                      {sec.enabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Users Tab */}
      {subRoute === 'users' && (
        <div className="bg-[#0A0A0A] border border-neutral-800 rounded-xl p-5 space-y-4">
          <div>
            <h2 className="text-base font-display font-semibold text-white">
              Registered Users
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-800 text-neutral-400">
                  <th className="py-2.5 pr-4 font-medium">User</th>
                  <th className="py-2.5 px-4 font-medium">Role</th>
                  <th className="py-2.5 px-4 font-medium">Provider</th>
                  <th className="py-2.5 px-4 font-medium">Status</th>
                  <th className="py-2.5 pl-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/70">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="py-3 pr-4">
                      <p className="font-medium text-white">{u.displayName}</p>
                      <p className="text-neutral-400">{u.email}</p>
                    </td>
                    <td className="py-3 px-4 font-mono text-neutral-300">{u.role}</td>
                    <td className="py-3 px-4 text-neutral-400">{u.authProvider}</td>
                    <td className="py-3 px-4">
                      <span
                        className={
                          u.status === 'active' ? 'text-white' : 'text-[#FF0000] font-semibold'
                        }
                      >
                        {u.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 pl-4 text-right">
                      {u.role !== 'super_admin' && (
                        <button
                          type="button"
                          onClick={() => onToggleUserStatus(u.id)}
                          className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-[#830000]/40 text-neutral-200 border border-neutral-800 cursor-pointer"
                        >
                          {u.status === 'active' ? 'Suspend' : 'Restore'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {subRoute === 'analytics' && (
        <div className="bg-[#0A0A0A] border border-neutral-800 rounded-xl p-5 space-y-4">
          <h2 className="text-base font-display font-semibold text-white">
            Catalog Distribution by Language
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
            {['Hindi', 'Tamil', 'Punjabi', 'Telugu', 'English', 'Instrumental'].map((lang) => {
              const count = tracks.filter((t) => t.language === lang).length;
              return (
                <div key={lang} className="p-4 rounded-xl bg-black border border-neutral-800 space-y-1">
                  <p className="text-neutral-400">{lang}</p>
                  <p className="text-xl font-display font-bold font-mono tabular-nums text-white">
                    {count} {count === 1 ? 'track' : 'tracks'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {subRoute === 'reports' && (
        <div className="bg-[#0A0A0A] border border-neutral-800 rounded-xl p-5 space-y-4">
          <div>
            <h2 className="text-base font-display font-semibold text-white">
              Copyright & Content Reports
            </h2>
          </div>
          <div className="space-y-3">
            {reports.map((rep) => (
              <div
                key={rep.id}
                className="p-4 rounded-xl bg-black border border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <p className="text-xs font-mono text-neutral-400">
                    {rep.reason} · Status: {rep.status.toUpperCase()}
                  </p>
                  <p className="text-sm font-semibold text-white">{rep.trackTitle}</p>
                  <p className="text-xs text-neutral-400">
                    Reported by {rep.reporterEmail}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onResolveReport(rep.id, 'resolved_hidden')}
                    className="px-3 py-1.5 rounded-lg bg-[#BC0202] hover:bg-[#FF0000] text-white text-xs font-medium cursor-pointer"
                  >
                    Hide Track & Resolve
                  </button>
                  <button
                    type="button"
                    onClick={() => onResolveReport(rep.id, 'dismissed')}
                    className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs border border-neutral-800 cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* System Settings Tab */}
      {subRoute === 'settings' && (
        <div className="bg-[#0A0A0A] border border-neutral-800 rounded-xl p-5 space-y-4">
          <h2 className="text-base font-display font-semibold text-white">
            Platform Settings
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-lg bg-black border border-neutral-800 space-y-1.5">
              <p className="font-semibold text-white">Server-Side API Gateway</p>
              <p className="text-neutral-400">
                All upstream music provider requests are routed through the server proxy with rate limiting enabled.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-black border border-neutral-800 space-y-1.5">
              <p className="font-semibold text-white">Default Privacy Policy</p>
              <p className="text-neutral-400">
                Listening history is private by default for all listener accounts.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Audit Logs Tab */}
      {subRoute === 'audit-logs' && (
        <div className="bg-[#0A0A0A] border border-neutral-800 rounded-xl p-5 space-y-4">
          <div>
            <h2 className="text-base font-display font-semibold text-white">
              Audit Logs
            </h2>
          </div>
          <div className="divide-y divide-neutral-800/70 text-xs">
            {auditLogs.map((log) => (
              <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="font-mono text-[#FF0000]">
                    {log.action} · {log.targetType}/{log.targetId}
                  </p>
                  <p className="text-neutral-200 mt-0.5">{log.summary}</p>
                </div>
                <div className="text-neutral-500 font-mono tabular-nums shrink-0">
                  {log.timestamp.slice(0, 19).replace('T', ' ')} · {log.actorEmail}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

interface LegalViewProps {
  page: 'privacy' | 'terms' | 'copyright' | 'help';
  onSubmitCopyrightNotice: (trackTitle: string, claimantEmail: string) => void;
}

export const LegalView: React.FC<LegalViewProps> = ({ page, onSubmitCopyrightNotice }) => {
  const [claimTrack, setClaimTrack] = useState('');
  const [claimEmail, setClaimEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="max-w-3xl mx-auto py-6 space-y-6">
      <div className="bg-[#0A0A0A] border border-neutral-800 rounded-xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center gap-2.5 text-[#FF0000]">
          <FileText className="w-5 h-5" />
          <span className="text-xs font-mono uppercase tracking-wider">
            MusicMine Legal
          </span>
        </div>

        {page === 'privacy' && (
          <>
            <h1 className="text-2xl font-display font-bold text-white">Privacy Policy</h1>
            <p className="text-sm text-neutral-300 leading-relaxed">
              MusicMine collects only the personal data required to provide authentication, personal playlists, and library synchronization.
            </p>
            <ul className="space-y-2 text-sm text-neutral-400 list-disc pl-5">
              <li>Listening history is private by default.</li>
              <li>Passwords and credentials are encrypted and never logged.</li>
              <li>You may export or delete your account and listening history at any time from Settings.</li>
            </ul>
          </>
        )}

        {page === 'terms' && (
          <>
            <h1 className="text-2xl font-display font-bold text-white">Terms of Service</h1>
            <p className="text-sm text-neutral-300 leading-relaxed">
              MusicMine provides music discovery and streaming for personal, non-commercial use.
            </p>
            <ul className="space-y-2 text-sm text-neutral-400 list-disc pl-5">
              <li>Content streaming is provided in accordance with applicable licensing agreements.</li>
              <li>Browser-cached media is subject to device storage limits.</li>
            </ul>
          </>
        )}

        {page === 'help' && (
          <>
            <h1 className="text-2xl font-display font-bold text-white">Help &amp; Support</h1>
            <p className="text-sm text-neutral-300 leading-relaxed">
              MusicMine is an editorial music discovery platform focused on Hindi, Punjabi, and South Indian cinema releases.
            </p>
            <div className="space-y-4 pt-2">
              <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-1">
                <h3 className="text-sm font-semibold text-white">Do I need an account to listen?</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  No. Playback is free and instant without signing in. Creating a listener account allows you to save playlists, like songs, and synchronize your library across devices.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-1">
                <h3 className="text-sm font-semibold text-white">What audio quality is streamed?</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  MusicMine streams in stereo 160 kbps AAC, balanced for crisp audio fidelity and smooth background playback on mobile connections.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800 space-y-1">
                <h3 className="text-sm font-semibold text-white">How do I report an issue or suggest a song?</h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Contact our support team directly at{' '}
                  <a
                    href="mailto:support@musicmine.app"
                    className="text-[#FF0000] hover:underline font-medium"
                  >
                    support@musicmine.app
                  </a>
                  . We review feedback and catalog requests daily.
                </p>
              </div>
            </div>
          </>
        )}

        {page === 'copyright' && (
          <>
            <h1 className="text-2xl font-display font-bold text-white">
              Copyright & Takedown Notice
            </h1>
            <p className="text-sm text-neutral-300 leading-relaxed">
              Rights holders may submit a formal takedown request below for review by our compliance team.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!claimTrack.trim() || !claimEmail.trim()) return;
                onSubmitCopyrightNotice(claimTrack.trim(), claimEmail.trim());
                setSubmitted(true);
                setClaimTrack('');
              }}
              className="pt-4 space-y-4 border-t border-neutral-800"
            >
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Track Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter track title"
                  value={claimTrack}
                  onChange={(e) => setClaimTrack(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-black border border-neutral-800 text-sm text-white focus:border-[#FF0000] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-neutral-300 mb-1">
                  Contact Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="rights@label.com"
                  value={claimEmail}
                  onChange={(e) => setClaimEmail(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg bg-black border border-neutral-800 text-sm text-white focus:border-[#FF0000] focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#BC0202] hover:bg-[#FF0000] text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Submit Takedown Request
              </button>
              {submitted && (
                <p className="text-xs text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#FF0000]" />
                  <span>Your request has been submitted for review.</span>
                </p>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  );
};
