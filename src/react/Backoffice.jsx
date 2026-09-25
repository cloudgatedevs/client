import { lazy, Suspense, useMemo } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { CloudgateProvider } from './context.jsx';
import { AuthProvider, RequireAuth, RequireAdmin } from './auth/index.js';
import { SettingsProvider } from './settings/SettingsProvider.jsx';
import { NotificationsProvider } from './notifications/NotificationsProvider.jsx';
import { Layout } from './components/Layout.jsx';
import { ScreenLoader } from './components/ScreenLoader.jsx';
import { PLATFORM_NAV } from './components/navConfig.jsx';
const page = (load, name) => lazy(() => load().then(module => ({ default: module[name] })));
const RoleManagement = page(() => import('./pages/RoleManagement.jsx'), 'RoleManagement');
const UserManagement = page(() => import('./pages/UserManagement.jsx'), 'UserManagement');
const Analytics = page(() => import('./pages/Analytics.jsx'), 'Analytics');
const Appearance = page(() => import('./pages/Appearance.jsx'), 'Appearance');
const Smtp = page(() => import('./pages/Smtp.jsx'), 'Smtp');
const Media = page(() => import('./pages/Media.jsx'), 'Media');
const Payments = page(() => import('./pages/Payments.jsx'), 'Payments');
const PaymentList = page(() => import('./pages/PaymentList.jsx'), 'PaymentList');
const TestPayment = page(() => import('./pages/TestPayment.jsx'), 'TestPayment');
const Logs = page(() => import('./pages/Logs.jsx'), 'Logs');
const Notifications = page(() => import('./pages/Notifications.jsx'), 'Notifications');
const About = page(() => import('./pages/About.jsx'), 'About');
const AccountSettings = page(() => import('./pages/AccountSettings.jsx'), 'AccountSettings');
const Profile = page(() => import('./pages/Profile.jsx'), 'Profile');
const Registration = page(() => import('./pages/Registration.jsx'), 'Registration');
const EmailTemplate = page(() => import('./pages/EmailTemplate.jsx'), 'EmailTemplate');
const AppNotifications = page(() => import('./pages/AppNotifications.jsx'), 'AppNotifications');
function Workspace() {
  return <SettingsProvider><NotificationsProvider><Suspense fallback={<ScreenLoader />}><Outlet /></Suspense></NotificationsProvider></SettingsProvider>;
}
/** Mount inside your router. Children are your application's own Route elements. */
export function CloudgateBackoffice({ client, metadata, navigation = [], children, fallback = '/profile', developerMode = true }) {
  const nav = useMemo(() => [...navigation, ...PLATFORM_NAV], [navigation]);
  return <CloudgateProvider client={client} metadata={metadata} navigation={nav}><AuthProvider><Routes>
    <Route element={<RequireAuth />}><Route element={<RequireAdmin />}><Route element={<Workspace />}><Route element={<Layout developerMode={developerMode} />}>
      {children}
      <Route path="/roles" element={<RoleManagement />} /><Route path="/users" element={<UserManagement />} /><Route path="/sample-users" element={<Navigate to="/users" replace />} />
      <Route path="/account/settings" element={<AccountSettings />} /><Route path="/profile" element={<Profile />} /><Route path="/analytics" element={<Analytics />} />
      <Route path="/registration" element={<Registration />} />
      <Route path="/email-template" element={<EmailTemplate />} />
      <Route path="/app-notifications" element={<AppNotifications />} />
      <Route path="/appearance" element={<Appearance key="appearance" />} /><Route path="/theme" element={<Appearance key="theme" theme />} />
      <Route path="/smtp" element={<Smtp />} /><Route path="/media" element={<Media />} /><Route path="/payments" element={<Payments />} />
      <Route path="/payments/list" element={<PaymentList />} /><Route path="/payments/test" element={<TestPayment />} />
      <Route path="/logs" element={<Logs />} /><Route path="/notifications" element={<Notifications />} /><Route path="/about" element={<About />} />
      <Route path="/settings" element={<Navigate to="/appearance" replace />} />
    </Route></Route></Route></Route>
    <Route path="*" element={<Navigate to={fallback} replace />} />
  </Routes></AuthProvider></CloudgateProvider>;
}
