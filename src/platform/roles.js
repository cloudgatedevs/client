/** Native /admin APIs require the backend's Admin role, not file-upload role aliases. */
export const ADMIN_ROLES = Object.freeze(['admin']);
export const isAdminRole = role => String(role ?? '').trim().toLowerCase() === 'admin';
