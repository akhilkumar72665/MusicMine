import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  Lock,
  Mail,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
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
import { formatDuration } from '../data/catalogFixtures';

interface AuthViewProps {
  mode: 'login' | 'signup';
  currentUser: UserAccount | null;
  onLoginEmail: (email: string, displayName: string, role: UserRole) => void;
  onLoginGoogle: () => void;
  onContinueGuest: () => void;
  onNavigate: (path: RoutePath) => void;
  onNotify: (msg: string) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  mode,
  currentUser,
  onLoginEmail,
  onLoginGoogle,
  onContinueGuest,
  onNavigate,
  onNotify,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      onNotify('Please enter a valid email and password.');
      return;
    }
    const inferredName =
      displayName.trim() || email.trim().split('@')[0] || 'MusicMine Listener';
    const role: UserRole = email.toLowerCase().includes('admin')
      ? 'super_admin'
      : 'listener';
    onLoginEmail(email.trim(), inferredName, role);
  };

  return (
    <div className="max-w-xl mx-auto py-8 px-4">
      <div className="bg-[#0A0A0A] border border-neutral-800 rounded-xl p-6 sm:p-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-display font-bold text-white">
            {mode === 'login' ? 'Sign in to MusicMine' : 'Create your MusicMine Account'}
          </h1>
          <p className="text-sm text-neutral-400">
            Save tracks to your library, build personal playlists, and synchronize listening history across devices.
          </p>
        </div>

        {currentUser && (
          <div className="p-3.5 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-between gap-4 text-xs">
            <div>
              <p className="text-white font-medium">
                Signed in as {currentUser.displayName} ({currentUser.email})
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('/library')}
              className="px-3 py-1.5 rounded-md bg-[#BC0202] hover:bg-[#FF0000] text-white font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Open Library
            </button>
          </div>
        )}

        {/* Google Sign-In */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={onLoginGoogle}
            className="w-full py-2.5 px-4 rounded-lg bg-white hover:bg-neutral-200 text-black font-medium text-sm flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
          >
            <UserCheck className="w-4 h-4 text-[#BC0202]" />
            <span>Continue with Google</span>
          </button>

          <div className="flex items-center gap-3 text-xs text-neutral-500">
            <div className="h-px bg-neutral-800 flex-1" />
            <span>or continue with email</span>
            <div className="h-px bg-neutral-800 flex-1" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-neutral-300 mb-1.5">
                Display Name
              </label>
              <input
                type="text"
                placeholder="Your name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="w-full px-3.5 py-2 rounded-lg bg-black border border-neutral-800 focus:border-[#FF0000] focus:outline-none text-sm text-white"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-neutral-300 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-neutral-500 absolute left-3.5 top-2.5" />
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-3.5 py-2 rounded-lg bg-black border border-neutral-800 focus:border-[#FF0000] focus:outline-none text-sm text-white"
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
              <Lock className="w-4 h-4 text-neutral-500 absolute left-3.5 top-2.5" />
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-3.5 py-2 rounded-lg bg-black border border-neutral-800 focus:border-[#FF0000] focus:outline-none text-sm text-white"
              />
            </div>
          </div>

          {resetSent && (
            <p className="text-xs text-neutral-300 bg-neutral-900 border border-neutral-800 rounded-lg p-2.5">
              If an account exists for that email address, password reset instructions have been sent.
            </p>
          )}

          <button
            type="submit"
            className="w-full py-2.5 px-4 rounded-lg bg-[#BC0202] hover:bg-[#FF0000] text-white font-semibold text-sm transition-colors cursor-pointer"
          >
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="pt-4 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-xs text-neutral-400">
          {mode === 'login' ? (
            <span>
              New to MusicMine?{' '}
              <button
                type="button"
                onClick={() => onNavigate('/signup')}
                className="text-white hover:text-[#FF0000] font-medium underline cursor-pointer"
              >
                Create an account
              </button>
            </span>
          ) : (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => onNavigate('/login')}
                className="text-white hover:text-[#FF0000] font-medium underline cursor-pointer"
              >
                Sign in
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={onContinueGuest}
            className="text-neutral-300 hover:text-white cursor-pointer"
          >
            Continue as Guest →
          </button>
        </div>
      </div>
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
              className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isActive
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
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                          t.visibleInCatalog
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
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                        sec.enabled
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
  page: 'privacy' | 'terms' | 'copyright';
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
