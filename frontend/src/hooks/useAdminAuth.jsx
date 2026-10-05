import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import {
  can,
  currentAdminUser,
  fetchMe,
  login,
  logout,
  onAuthAlert,
  onSessionChanged,
} from '../services/auth';

export const adminAlerts = { current: null };

export function useAdminAuth() {
  const [user, setUser] = useState(() => currentAdminUser());
  const [alert, setAlert] = useState(null);
  const [initialising, setInitialising] = useState(true);

  useEffect(() => {
    fetchMe().then((result) => {
      if (result.ok) setUser(result.user);
      setInitialising(false);
    });
  }, []);

  useEffect(() => onAuthAlert((detail) => setAlert(detail)), []);

  useEffect(() => onSessionChanged(() => setUser(currentAdminUser())), []);

  useEffect(() => {
    adminAlerts.current = (detail) => setAlert(detail);
    return () => {
      adminAlerts.current = null;
    };
  }, []);

  const signIn = useCallback(async (email, password) => {
    const result = await login(email, password);
    if (result.ok) setUser(result.user);
    return result;
  }, []);

  const signOut = useCallback(async () => {
    await logout();
    setUser(null);
  }, []);

  return useMemo(
    () => ({
      user,
      alert,
      initialising,
      signIn,
      signOut,
      can: (permission) => can(user, permission),
      isOwner: user?.role === 'owner',
    }),
    [user, alert, initialising, signIn, signOut],
  );
}

export function RequireAuth({ permission, children }) {
  const { user, initialising, can } = useAdminAuth();
  const location = useLocation();

  if (initialising) return null;
  if (!user) return <Navigate to="/admin/login" replace state={{ from: location.pathname }} />;
  if (permission && !can(permission)) {
    return (
      <div className="admin-card mx-auto max-w-lg rounded-2xl p-8 text-center">
        <h1 className="font-display text-3xl tracking-[-0.04em] text-ink">Not available for your role</h1>
        <p className="mt-3 text-sm leading-6 text-stone-500">
          Your account is signed in as {user.role}. Ask the store owner if you need access to this screen.
        </p>
        <Link to="/admin" className="mt-6 inline-block rounded-full bg-ember px-5 py-2.5 text-xs font-bold uppercase tracking-[0.08em] text-white transition hover:bg-emberDark">
          Back to dashboard
        </Link>
      </div>
    );
  }
  return children;
}
