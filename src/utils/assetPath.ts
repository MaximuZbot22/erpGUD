/**
 * Utility to resolve static asset paths cleanly across environments:
 * - Local development (http://localhost:5173/)
 * - GitHub Pages subpath deployment (https://maximuzbot22.github.io/erpGUD/)
 * - Production custom domain or CDN
 */
export function getAssetUrl(path: string | undefined | null): string {
  if (!path) return '';

  // If already absolute URL, data URI, or blob, return untouched
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('data:') ||
    path.startsWith('blob:')
  ) {
    return path;
  }

  // Remove leading slash to get pure relative path
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;

  // 1. Detect if running inside a GitHub Pages or subdirectory route in browser
  if (typeof window !== 'undefined') {
    const pathname = window.location.pathname;
    const match = pathname.match(/^(\/[a-zA-Z0-9_-]+)/);
    const knownAppRoutes = [
      '/dashboard',
      '/login',
      '/settings',
      '/tasks',
      '/calendar',
      '/documents',
      '/invoice-generator',
      '/stock-checker',
      '/quotations',
      '/sales-orders',
      '/delivery',
      '/procurement-manager',
      '/returns',
      '/notes',
      '/hampers',
      '/user-management',
    ];

    if (match && !knownAppRoutes.includes(match[1])) {
      return `${match[1]}/${cleanPath}`;
    }
  }

  // 2. Fall back to Vite BASE_URL if configured
  const envBase = import.meta.env.BASE_URL;
  if (envBase && envBase !== './' && envBase !== '.') {
    return `${envBase.endsWith('/') ? envBase : envBase + '/'}${cleanPath}`;
  }

  // Default to root slash for standard Vite dev server
  return `/${cleanPath}`;
}
