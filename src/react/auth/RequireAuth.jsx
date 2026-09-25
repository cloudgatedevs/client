import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { useCloudgate } from '../context.jsx';
import { useAuthContext } from './useAuthContext';
import { ScreenLoader } from '../components/ScreenLoader.jsx';

const RequireAuth = () => {
  const { client } = useCloudgate();
  const cloudgateAuth = client.auth;
  const redirectToLogin = client.login;
  const { auth, loading } = useAuthContext();
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!auth?.accessToken && cloudgateAuth.enabled) {
      setRedirecting(true);
      redirectToLogin();
    }
  }, [loading, auth?.accessToken]);

  if (loading || redirecting) {
    return <ScreenLoader />;
  }

  if (!auth?.accessToken) {
    return (
      <div className="flex min-h-[60vh] grow flex-col items-center justify-center p-8 text-center">
        <p className="text-lg font-medium text-mist">Sign-in not configured</p>
        <p className="mt-2 max-w-md text-sm text-mist-muted">
          Connect this application to your Cloudgate tenant to enable sign-in.
        </p>
      </div>
    );
  }

  return <Outlet />;
};

export { RequireAuth };
