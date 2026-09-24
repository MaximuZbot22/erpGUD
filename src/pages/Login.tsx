import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { GudLogo } from '../components/Sidebar';
import { Button } from '../components/ui/Button';
import { Mail, Lock, ShieldAlert, Sparkles, UserPlus } from 'lucide-react';
import { UserRole } from '../types/auth';
import heroImage from '../assets/hero.png';

import { useVersion } from '../context/VersionContext';

export const Login: React.FC = () => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, signInAnonymouslyUser } = useAuth();
  const { version, setVersion } = useVersion();
  
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('Owner');
  
  const [error, setError] = useState<string | null>(null);
  const [unauthorizedDomain, setUnauthorizedDomain] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setUnauthorizedDomain(null);
    setLoading(true);

    try {
      if (isRegister) {
        if (!displayName.trim()) {
          throw new Error('Name is required');
        }
        await signUpWithEmail(email, password, displayName, selectedRole);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: any) {
      console.error(err);
      let errMsg = err.message || 'An error occurred during authentication';
      if (err.code === 'auth/user-not-found') errMsg = 'No account associated with this email.';
      if (err.code === 'auth/wrong-password') errMsg = 'Incorrect password.';
      if (err.code === 'auth/email-already-in-use') errMsg = 'This email is already registered.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setUnauthorizedDomain(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      let errMsg = err.message || 'Google authentication failed';
      if (err.code === 'auth/popup-blocked') {
        errMsg = 'Pop-up blocked by your browser. Please allow pop-ups for this site in your address bar icon, then try again.';
      } else if (err.code === 'auth/popup-closed-by-user') {
        errMsg = 'Google sign-in window was closed before completing login.';
      } else if (err.code === 'auth/cancelled-popup-request') {
        errMsg = 'Another sign-in pop-up was already in progress.';
      } else if (err.code === 'auth/unauthorized-domain') {
        const host = window.location.hostname;
        setUnauthorizedDomain(host);
        errMsg = `Google Sign-In requires "${host}" to be authorized in Firebase Console.`;
      } else if (err.code === 'auth/network-request-failed') {
        errMsg = 'Network connection failed. Please check your internet connection and try again.';
      } else if (err.code === 'auth/access-denied' || err.message?.includes('access_denied')) {
        errMsg = 'Google account access was denied. Please ensure your Google account is authorized or use Instant Access below.';
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymousSignIn = async () => {
    setError(null);
    setUnauthorizedDomain(null);
    setLoading(true);
    try {
      await signInAnonymouslyUser(selectedRole);
    } catch (err: any) {
      console.error('Anonymous Sign-In Error:', err);
      setError(err.message || 'Instant access login failed');
    } finally {
      setLoading(false);
    }
  };

  const rolesList: UserRole[] = [
    'Owner',
    'Executive Assistant'
  ];

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-cover bg-center p-4 relative overflow-hidden select-none"
      style={{ backgroundImage: `url(${heroImage})` }}
    >
      {/* Premium backdrop blur overlay */}
      <div className="absolute inset-0 bg-[#faf9f5]/85 dark:bg-slate-950/85 backdrop-blur-[5px]" />

      {/* Main Auth Container */}
      <div className="w-full max-w-md bg-white/80 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl shadow-xl border border-white dark:border-slate-800 p-8 flex flex-col justify-between relative z-10">
        
        {/* Logo and Tagline */}
        <div className="text-center mb-6">
          <div className="text-emerald-700 dark:text-emerald-450 inline-flex p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-100 dark:border-emerald-900/40 mb-3 shadow-inner">
            <GudLogo size={42} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white">
            Gudoria Food Innovations
          </h2>
          <p className="text-xs text-slate-550 dark:text-slate-400 mt-1 font-medium">
            Enterprise Resource Planning & Business OS
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl text-amber-900 dark:text-amber-200 text-xs space-y-2.5">
            <div className="flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 mt-0.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
              <div className="space-y-1">
                <div className="font-semibold leading-relaxed">{error}</div>
                {unauthorizedDomain && (
                  <div className="text-[11px] text-slate-600 dark:text-slate-300 leading-normal">
                    Add <code className="bg-white dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-750">{unauthorizedDomain}</code> in <strong>Firebase Console &gt; Authentication &gt; Settings &gt; Authorized Domains</strong> to enable Google Login here.
                  </div>
                )}
              </div>
            </div>
            {unauthorizedDomain && (
              <Button
                type="button"
                onClick={handleAnonymousSignIn}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Enter ERP Now as Owner (No Password Required)</span>
              </Button>
            )}
          </div>
        )}

        {/* Primary Action: Google Workspace Sign-In & 1-Click Instant Access */}
        <div className="mb-5 space-y-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-3 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-white border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2.5 shadow-sm transition-all cursor-pointer"
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Continue with Google Account</span>
          </Button>

          <Button
            type="button"
            onClick={handleAnonymousSignIn}
            disabled={loading}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>⚡ Enter ERP as Owner (Instant Access • No Pass)</span>
          </Button>

          <p className="text-[10px] text-center text-slate-400">
            Immediate entry with complete ERP, inventory & financial permissions
          </p>
        </div>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-800" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white dark:bg-slate-900 px-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Or Sign In with Email
            </span>
          </div>
        </div>

        {/* Auth Forms */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1.5 pl-0.5">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                  <UserPlus className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  required
                  placeholder="Your Name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-850 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 dark:text-slate-250 placeholder-slate-400"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1.5 pl-0.5">
              Workspace Email
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                required
                placeholder="yourname@goodoria.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-850 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 dark:text-slate-250 placeholder-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1.5 pl-0.5">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                placeholder="Enter password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-850 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 dark:text-slate-250 placeholder-slate-400"
              />
            </div>
          </div>

          {/* Select ERP Version Prompt */}
          <div>
            <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1.5 pl-0.5">
              Target ERP Version & Architecture
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVersion('v2')}
                className={`p-2.5 rounded-lg border text-left transition ${
                  version === 'v2'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-600'
                    : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-950 dark:border-slate-800'
                }`}
              >
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>v2 Clean</span>
                </div>
                <div className="text-[10px] text-slate-500 font-normal mt-0.5">6 Streamlined Sheets</div>
              </button>

              <button
                type="button"
                onClick={() => setVersion('v1')}
                className={`p-2.5 rounded-lg border text-left transition ${
                  version === 'v1'
                    ? 'bg-amber-50 border-amber-500 text-amber-950 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-600'
                    : 'bg-slate-50 border-slate-200 text-slate-600 dark:bg-slate-950 dark:border-slate-800'
                }`}
              >
                <div className="font-bold text-xs flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>v1 Legacy</span>
                </div>
                <div className="text-[10px] text-slate-500 font-normal mt-0.5">15 Classic Sheets</div>
              </button>
            </div>
          </div>
          {isRegister && (
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 mb-1.5 pl-0.5">
                Initial Access Request (Role)
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-200 dark:bg-slate-950 dark:border-slate-850 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 dark:text-slate-250"
              >
                {rolesList.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Button type="submit" loading={loading} className="w-full py-2.5 rounded-lg text-xs font-bold mt-2">
            {isRegister ? 'Register Account' : 'Sign In with Email'}
          </Button>
        </form>

        {/* Toggle link */}
        <div className="text-center mt-5">
          <button
            onClick={() => {
              setError(null);
              setIsRegister(!isRegister);
            }}
            className="text-xs font-semibold text-emerald-700 dark:text-emerald-450 hover:underline"
          >
            {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Request Access"}
          </button>
        </div>
      </div>
    </div>
  );
};
export default Login;
