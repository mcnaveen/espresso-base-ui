/**
 * The embed allowlist, validator and URL transforms, ported from the
 * branch's iframe-allowlist.ts and iframe-embed-utils.ts: which hosts an
 * embed may frame, the one validator every way in runs, per-platform
 * sizing, and the rewrites that turn watch/share URLs into their
 * embeddable form (youtu.be + /shorts + playlists, vimeo's unlisted hash,
 * codepen pens, figma design/file/proto/board).
 */
import { isSafeUrl, matchesHostname } from "./url-safety"

/** Hostnames (and their embed sub-hosts) permitted as iframe sources. */
export const IFRAME_ALLOWLIST: readonly string[] = [
  "youtube.com",
  "youtu.be",
  "youtube-nocookie.com",
  "vimeo.com",
  "player.vimeo.com",
  "codepen.io",
  "codesandbox.io",
  "figma.com",
  "embed.figma.com",
  "docs.google.com",
  "drive.google.com",
  "notion.so",
]

/** The one entry that opens an allowlist to every http(s) host. */
export const ANY_HOST = "*"

export interface ValidateIframeUrlOptions {
  /** Override the default allowlist (exact host or dot-boundary suffix). */
  allowlist?: readonly string[]
  /** Hosts to reject outright. */
  blocklist?: readonly string[]
}

/**
 * True iff `url` is an absolute http(s) URL whose hostname is on the
 * allowlist (and not on an optional blocklist). Relative, bare and
 * unknown-scheme inputs are rejected — there is no `startsWith('/')`
 * escape hatch. An allowlist holding {@link ANY_HOST} takes every host
 * the blocklist does not refuse.
 */
export function validateIframeUrl(
  url: string,
  options?: ValidateIframeUrlOptions
): boolean {
  if (!isSafeUrl(url, { allowedSchemes: ["http", "https"] })) return false

  let host: string
  try {
    host = new URL(url).hostname
  } catch {
    return false
  }

  const blocklist = options?.blocklist
  if (blocklist?.length && matchesHostname(host, blocklist)) return false

  const allowlist = options?.allowlist ?? IFRAME_ALLOWLIST
  return allowlist.includes(ANY_HOST) || matchesHostname(host, allowlist)
}

export interface AspectRatioInfo {
  /** height / width, as the branch expresses it */
  ratio: number
  width: number
  height: number
  platform: string
}

interface PlatformConfig {
  name: string
  /** aspect ratio expressed as height / width */
  ratio: number
  defaultWidth: number
  hosts: readonly string[]
}

/** Per-platform sizing + host ownership. */
const PLATFORM_CONFIGS: readonly PlatformConfig[] = [
  {
    name: "YouTube",
    ratio: 9 / 16,
    defaultWidth: 640,
    hosts: ["youtube.com", "youtu.be", "youtube-nocookie.com"],
  },
  {
    name: "Vimeo",
    ratio: 9 / 16,
    defaultWidth: 640,
    hosts: ["vimeo.com", "player.vimeo.com"],
  },
  { name: "CodePen", ratio: 3 / 2, defaultWidth: 500, hosts: ["codepen.io"] },
  {
    name: "CodeSandbox",
    ratio: 3 / 2,
    defaultWidth: 500,
    hosts: ["codesandbox.io"],
  },
  {
    name: "Figma",
    ratio: 9 / 16,
    defaultWidth: 800,
    hosts: ["figma.com", "embed.figma.com"],
  },
  {
    name: "Google Docs",
    ratio: 4 / 3,
    defaultWidth: 600,
    hosts: ["docs.google.com", "drive.google.com"],
  },
  { name: "Notion", ratio: 4 / 3, defaultWidth: 600, hosts: ["notion.so"] },
]

/** Resolve the platform config for a URL, or null when unknown. */
function detectPlatform(url: string): PlatformConfig | null {
  let host: string
  try {
    host = new URL(url).hostname
  } catch {
    return null
  }
  return (
    PLATFORM_CONFIGS.find((config) => matchesHostname(host, config.hosts)) ??
    null
  )
}

/** Compute the natural aspect ratio + default size for a URL's platform. */
export function calculateAspectRatio(url: string): AspectRatioInfo {
  const platform = detectPlatform(url)
  if (platform) {
    return {
      ratio: platform.ratio,
      width: platform.defaultWidth,
      height: Math.round(platform.defaultWidth * platform.ratio),
      platform: platform.name,
    }
  }
  return { ratio: 9 / 16, width: 640, height: 360, platform: "Generic" }
}

/** Rewrite a platform watch/share URL into its embeddable form. */
export function processEmbedUrl(url: string): string {
  const platform = detectPlatform(url)
  switch (platform?.name) {
    case "YouTube":
      return convertYouTube(url)
    case "Vimeo":
      return convertVimeo(url)
    case "CodePen":
      return convertCodePen(url)
    case "Figma":
      return convertFigma(url)
    default:
      return url
  }
}

/** Extract a YouTube video id from any of its URL shapes. */
function youTubeVideoId(parsed: URL): string {
  if (matchesHostname(parsed.hostname, ["youtu.be"])) {
    return parsed.pathname.slice(1).split("/")[0]
  }
  const segments = parsed.pathname.split("/").filter(Boolean)
  if (segments[0] === "shorts" || segments[0] === "live") {
    return segments[1] ?? ""
  }
  if (segments[0] === "embed") return segments[1] ?? ""
  return parsed.searchParams.get("v") ?? ""
}

function convertYouTube(url: string): string {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return url
  }

  // already an embed URL — leave untouched
  if (parsed.pathname.startsWith("/embed/")) return url

  const videoId = youTubeVideoId(parsed)
  if (!videoId) return url

  const params = new URLSearchParams({ rel: "0", modestbranding: "1" })
  const list = parsed.searchParams.get("list")
  if (list) params.set("list", list)
  const start =
    parsed.searchParams.get("t") ?? parsed.searchParams.get("start")
  if (start) params.set("start", start.replace(/s$/, ""))

  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`
}

function convertVimeo(url: string): string {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return url
  }

  if (matchesHostname(parsed.hostname, ["player.vimeo.com"])) return url

  const segments = parsed.pathname.split("/").filter(Boolean)
  const id = segments.find((seg) => /^\d+$/.test(seg))
  if (!id) return url

  // preserve the unlisted hash (`vimeo.com/<id>/<hash>`) as `?h=<hash>`
  const idIndex = segments.indexOf(id)
  const hash = segments[idIndex + 1]
  const params = new URLSearchParams({
    title: "0",
    byline: "0",
    portrait: "0",
  })
  if (hash && /^[0-9a-f]+$/i.test(hash)) params.set("h", hash)

  return `https://player.vimeo.com/video/${id}?${params.toString()}`
}

function convertCodePen(url: string): string {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return url
  }
  if (parsed.pathname.includes("/embed/")) return url

  const match = parsed.pathname.match(/^\/([^/]+)\/pen\/([^/]+)/)
  if (match) {
    return `https://codepen.io/${match[1]}/embed/${match[2]}?default-tab=result`
  }
  return url
}

function convertFigma(url: string): string {
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return url
  }

  // already an embed host — just ensure embed-host is present
  if (matchesHostname(parsed.hostname, ["embed.figma.com"])) {
    if (!parsed.searchParams.has("embed-host")) {
      parsed.searchParams.set("embed-host", "share")
    }
    return parsed.toString()
  }

  // figma.com/{design,file,proto,board}/... → embed.figma.com/...
  const embeddable = /^\/(design|file|proto|board)\//.test(parsed.pathname)
  if (matchesHostname(parsed.hostname, ["figma.com"]) && embeddable) {
    parsed.hostname = "embed.figma.com"
    parsed.searchParams.set("embed-host", "share")
    return parsed.toString()
  }

  return url
}

/**
 * A file the browser cannot show is turned away at the door with a message
 * naming what would do — ported from the branch's image-engine. HEIC off
 * an iPhone would otherwise stage a preview that never draws.
 */
export function unsupportedImageMessage(file: File): string | null {
  const name = file.name?.toLowerCase() ?? ""
  if (
    /^image\/hei[cf]$/i.test(file.type) ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  ) {
    return "Unsupported file. HEIC images cannot be shown here — save it as JPG or PNG first."
  }
  if (!/^image\//i.test(file.type)) {
    return "Unsupported file. Only an image can go here — JPG, PNG, GIF, WEBP or SVG."
  }
  return null
}
