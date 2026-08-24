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
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
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
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Google workspace authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymousSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInAnonymouslyUser(selectedRole);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Anonymous login failed');
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
          <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/50 rounded-lg text-rose-700 dark:text-rose-450 text-xs flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span className="font-semibold leading-relaxed">{error}</span>
          </div>
        )}

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
                  placeholder="Arun Kumar"
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
              Secret Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                placeholder="••••••••••••"
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
            {isRegister ? 'Register Account' : 'Secure Login'}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200 dark:border-slate-800" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white dark:bg-slate-900 px-3 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              Or Connect Workspace
            </span>
          </div>
        </div>

        {/* Google OAuth Button */}
        <Button
          type="button"
          variant="outline"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-2.5 border-slate-250 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-850 rounded-lg text-xs font-bold flex items-center justify-center gap-2"
          leftIcon={<Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-450 animate-pulse" />}
        >
          Sign In with Google Workspace
        </Button>

        {/* Sandbox Anonymous Sign In */}
        <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-150 dark:border-slate-800/80 rounded-xl space-y-3">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-350">
              Local Sandbox Role
            </span>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as UserRole)}
              className="px-2 py-1 text-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-700 dark:text-slate-205"
            >
              {rolesList.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={handleAnonymousSignIn}
            disabled={loading}
            className="w-full py-1.5 text-xs font-bold"
          >
            Sign In Anonymously
          </Button>
        </div>

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
