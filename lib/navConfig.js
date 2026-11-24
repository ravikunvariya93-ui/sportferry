export function isActivePath(pathname, href, { exact = false, neverActive = false } = {}) {
  if (neverActive || !href || !pathname) return false;
  const base = href.split('?')[0];
  if (exact) return pathname === base;
  if (base === '/') return pathname === '/';
  return pathname === base || pathname.startsWith(`${base}/`);
}
