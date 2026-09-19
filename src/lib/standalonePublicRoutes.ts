export function isStandalonePublicRoute(pathname?: string | null) {
  return (
    pathname === "/ayanda" || pathname?.startsWith("/ayanda/") === true ||
    pathname === "/demo" || pathname?.startsWith("/demo/") === true ||
    pathname === "/games" || pathname?.startsWith("/games/") === true
  );
}
