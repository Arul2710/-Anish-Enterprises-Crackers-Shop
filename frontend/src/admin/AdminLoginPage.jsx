import { AlertTriangle, Eye, EyeOff, Lock, LogIn, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import { BrandLogo } from '../components/BrandLogo';
import { useAdminAuth } from '../hooks/useAdminAuth';
import { AdminField, AdminInput, AdminPrimaryButton, ValidationMessage } from './AdminUI';

export function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signIn, alert } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const from = location.state?.from || '/admin';
  if (user) return <Navigate to={from} replace />;

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    if (!email.trim() || !password) {
      setError('Enter both the admin email and the password.');
      return;
    }
    setBusy(true);
    const result = await signIn(email, password);
    setBusy(false);
    if (!result.ok) {
      setError(result.error || 'Invalid email or password.');
      return;
    }
    navigate(from, { replace: true });
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <div className="relative hidden overflow-hidden bg-navy lg:block">
        <img src="/bg/hero2.png" alt="" className="absolute inset-0 h-full w-full object-cover opacity-45" />
        <div className="absolute inset-0 bg-gradient-to-br from-charcoal/90 via-charcoal/70 to-charcoal/40" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <BrandLogo size="panel" tone="dark" />
          <div>
            <h1 className="font-display text-5xl leading-[1.05] tracking-[-0.04em]">Anish Enterprises<br />admin workspace</h1>
            <p className="mt-5 max-w-md text-sm leading-6 text-white/75">
              Orders, catalog, combo packs, customers, reports and contact details - all from the same records the
              storefront reads.
            </p>
          </div>
          <ul className="space-y-2.5 text-xs text-white/70">
            <li className="flex items-center gap-2"><ShieldCheck size={15} /> HttpOnly, secure session cookies</li>
            <li className="flex items-center gap-2"><ShieldCheck size={15} /> Sessions are revoked on logout</li>
          </ul>
        </div>
      </div>

      <div className="flex items-center justify-center bg-mist/40 px-5 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <div className="lg:hidden"><BrandLogo size="panel" /></div>
          <div className="admin-card mt-8 rounded-2xl p-6 sm:p-8 lg:mt-0">
            <h2 className="font-display text-3xl tracking-[-0.04em] text-ink">Sign in</h2>
            <p className="mt-2 text-xs leading-5 text-stone-500">Admin access only. Shoppers do not need an account to send an enquiry.</p>

            <form className="mt-7 space-y-4" onSubmit={submit}>
              <AdminField label="Admin email" required>
                <AdminInput type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@email.com" />
              </AdminField>
              <AdminField label="Password" required>
                <div className="relative">
                  <AdminInput type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" className="pr-11" />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 transition hover:text-goldInk" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </AdminField>

              <ValidationMessage>{error}</ValidationMessage>
              {alert?.message && <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800"><AlertTriangle size={14} className="mt-0.5 shrink-0" />{alert.message}</p>}

              <AdminPrimaryButton type="submit" className="w-full justify-center py-3" disabled={busy}>
                <span className="inline-flex items-center justify-center gap-2">
                  {busy ? <><Lock size={14} className="animate-pulse" /> Checking...</> : <><LogIn size={14} /> Sign in</>}
                </span>
              </AdminPrimaryButton>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
