export function isValidWebOrigin(web: URL, requiresHttps: boolean): boolean {
  if (web.pathname !== "/" || web.search || web.hash || web.username || web.password) return false;
  return web.protocol === "https:" || (!requiresHttps && web.protocol === "http:");
}

export function isRecentOAuthAuthentication(authenticatedAt: number | undefined, now: number): boolean {
  if (!authenticatedAt) return false;
  const age = now - authenticatedAt;
  return age >= 0 && age <= 10 * 60_000;
}
