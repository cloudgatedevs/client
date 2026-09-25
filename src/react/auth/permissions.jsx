import { useLocation } from 'react-router-dom';
import { useAuthContext } from './useAuthContext.js';
import { useCloudgate } from '../context.jsx';
import { BACKOFFICE_PERMISSIONS as P, hasBackofficePermission } from '../../platform/backoffice-permissions.js';

export const BACKOFFICE_ROUTE_PERMISSIONS = {
  '/': P.DashboardView, '/orders': P.OrdersView, '/analytics': P.AnalyticsView, '/logs': P.LogsView,
  '/payments': P.PaymentsView, '/payments/list': P.PaymentsHistory, '/payments/test': P.PaymentsTestView,
  '/users': P.UsersView, '/roles': P.RolesView, '/registration': P.RegistrationView,
  '/app-notifications': P.NotificationsView, '/smtp': P.SmtpView, '/email-template': P.EmailTemplateView,
  '/media': P.MediaView, '/appearance': P.BrandingView, '/theme': P.ThemeView, '/settings': P.SettingsView,
};
export function usePermissions() {
  const { currentUser } = useAuthContext();
  return { can: permission => hasBackofficePermission(currentUser?.user, permission), permissions: currentUser?.user?.rolePermissions || [] };
}
export function filterPermissionNavigation(items, can, basePath = '') {
  return items.flatMap(item => {
    if (item.children) { const children = filterPermissionNavigation(item.children, can, basePath); return children.length ? [{ ...item, children }] : []; }
    const path = item.to?.startsWith(basePath) ? item.to.slice(basePath.length) || '/' : item.to;
    return can(item.permission || BACKOFFICE_ROUTE_PERMISSIONS[path] || P.Access) ? [item] : [];
  });
}
export function RequirePagePermission({ children }) {
  const { pathname } = useLocation();
  const { basePath, navigation } = useCloudgate();
  const { can } = usePermissions();
  const path = pathname.slice(basePath.length).replace(/\/+$/, '') || '/';
  const find = items => items.flatMap(item => item.children ? find(item.children) : [item]);
  const item = find(navigation).find(item => item.to?.replace(/\/+$/, '') === pathname.replace(/\/+$/, ''));
  const permission = item?.permission || BACKOFFICE_ROUTE_PERMISSIONS[path] || P.Access;
  if (can(permission)) return children;
  return <section className="card p-6 space-y-3" role="alert"><h1 className="text-xl font-semibold">Permission required</h1><p className="text-sm text-mist-muted">Your role does not have access to this page. Choose an available page from the menu or ask someone who manages roles to update your access.</p></section>;
}
