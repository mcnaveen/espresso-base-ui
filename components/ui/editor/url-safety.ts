/**
 * Shared URL-safety primitives, ported from the branch's
 * extensions/shared/url-safety.ts. Two concerns, kept deliberately small
 * and pure:
 *  1. `isSafeUrl` — does a string parse to an absolute URL with an allowed
 *     scheme?
 *  2. `matchesHostname` — exact-or-dot-boundary host allowlist matching,
 *     never substring (so `youtube.com.evil.com` does not match
 *     `youtube.com`).
 */

export interface SafeUrlOptions {
  /** Schemes allowed (without the trailing colon). Defaults to http/https. */
  allowedSchemes?: string[]
  /**
   * Optional base to resolve relative URLs against (e.g.
   * `window.location.origin`). A server-relative `/files/x.png` resolves to
   * an http(s) URL and passes; `javascript:`/`data:` still parse to their
   * own scheme and fail.
   */
  base?: string
}

const DEFAULT_SCHEMES: readonly string[] = ["http", "https"]

const normalizeScheme = (scheme: string) =>
  scheme.toLowerCase().replace(/:$/, "")

/**
 * True iff `url` parses as an absolute URL whose scheme is allowed.
 * Relative paths, bare slugs, anchors and protocol-relative strings all
 * fail (unless a `base` is given); `javascript:`, `data:` and the rest
 * fail unless explicitly allowed.
 */
export function isSafeUrl(url: string, options?: SafeUrlOptions): boolean {
  if (typeof url !== "string" || url.trim() === "") return false

  const allowedSchemes = (options?.allowedSchemes ?? DEFAULT_SCHEMES).map(
    normalizeScheme
  )

  let parsed: URL
  try {
    parsed = new URL(url, options?.base)
  } catch {
    return false
  }

  return allowedSchemes.includes(normalizeScheme(parsed.protocol))
}

/**
 * Exact host match OR dot-boundary suffix match against an allowlist:
 * `a.youtube.com` matches `youtube.com`; `youtube.com.evil.com` does not.
 * Comparison is case-insensitive.
 */
export function matchesHostname(
  host: string,
  allowlist: readonly string[]
): boolean {
  if (!host) return false
  const normalizedHost = host.toLowerCase()

  return allowlist.some((entry) => {
    const normalizedEntry = entry.toLowerCase().replace(/^\.+/, "")
    if (!normalizedEntry) return false
    return (
      normalizedHost === normalizedEntry ||
      normalizedHost.endsWith("." + normalizedEntry)
    )
  })
}
