export function normalizeBasePath(value: string | undefined): string {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "/") return "";
  return `/${trimmed.replace(/^\/+|\/+$/g, "")}`;
}

export function addBasePath(path: string, basePath: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (!basePath) return normalizedPath;
  return normalizedPath === "/" ? `${basePath}/` : `${basePath}${normalizedPath}`;
}

export function stripBasePath(pathname: string, basePath: string): string | null {
  if (!basePath) return pathname;
  if (pathname === basePath || pathname === `${basePath}/`) return "/";
  if (!pathname.startsWith(`${basePath}/`)) return null;
  return pathname.slice(basePath.length) || "/";
}
