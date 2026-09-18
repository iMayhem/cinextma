export interface ScrapedLink {
  server?: string;
  providerKey?: string;
  quality?: string;
  type?: string;
  url: string;
  headers?: Record<string, string>;
  latencyMs?: number;
  size?: string;
  sizeBytes?: number;
  direct?: boolean;
}

// On Cloudflare Pages, leave NEXT_PUBLIC_API_URL empty to use same-origin Pages Functions proxy (functions/api/* -> VPS)
// For local dev / VPS direct, set NEXT_PUBLIC_API_URL=http://185.67.20.9
// Fallback to VPS IP via proxy if env missing on Pages
export const apiBase = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");

export function qualityRank(quality?: string): number {
  if (!quality) return 0;
  const q = quality.toLowerCase();
  if (q.includes("360")) return 1;
  if (q.includes("480")) return 2;
  if (q.includes("720")) return 3;
  if (q.includes("1080")) return 4;
  if (q.includes("4k") || q.includes("2160")) return 5; // 4K = highest rank = bottom of ascending list
  return 0;
}

export function pickBest(links: ScrapedLink[]): ScrapedLink | null {
  if (!links.length) return null;
  return [...links].sort((a, b) => {
    // 1. HLS (.m3u8) streams first (adaptive bitrate, instant start, smooth seeking)
    const hlsA = a.url.includes(".m3u8") || a.type === "hls" ? 1 : 0;
    const hlsB = b.url.includes(".m3u8") || b.type === "hls" ? 1 : 0;
    if (hlsA !== hlsB) return hlsB - hlsA;

    // 2. Deprioritize massive raw files (> 4 GB) that stall browser buffering
    const sizeA = a.sizeBytes ?? 0;
    const sizeB = b.sizeBytes ?? 0;
    const hugeA = sizeA > 4 * 1024 * 1024 * 1024 ? 1 : 0;
    const hugeB = sizeB > 4 * 1024 * 1024 * 1024 ? 1 : 0;
    if (hugeA !== hugeB) return hugeA - hugeB;

    // 3. Prefer mp4 over mkv (browser native container)
    const mkvA = a.url.toLowerCase().includes(".mkv") ? 1 : 0;
    const mkvB = b.url.toLowerCase().includes(".mkv") ? 1 : 0;
    if (mkvA !== mkvB) return mkvA - mkvB;

    // 4. Quality (1080p > 720p > 4K > 480p)
    const qA = qualityRank(a.quality);
    const qB = qualityRank(b.quality);
    if (qA !== qB) return qB - qA;

    // 5. Direct vs Proxied
    const dA = a.direct ? 1 : 0;
    const dB = b.direct ? 1 : 0;
    if (dA !== dB) return dB - dA;

    // 6. Fast ping latency
    return (a.latencyMs ?? Number.MAX_SAFE_INTEGER) - (b.latencyMs ?? Number.MAX_SAFE_INTEGER);
  })[0];
}

export function isMkvLink(link: ScrapedLink): boolean {
  return link.url.toLowerCase().includes(".mkv");
}

export async function resolvePlayableUrl(link: ScrapedLink, forceProxy = false): Promise<string> {
  if (!forceProxy && link.direct) return link.url;

  const isHls =
    link.type === "hls" ||
    link.url.split("?")[0].toLowerCase().endsWith(".m3u8");

  try {
    if (isHls) {
      // HLS: use the /api/hls proxy which rewrites all segment URLs too
      const params = new URLSearchParams({ url: link.url });
      if (link.headers && Object.keys(link.headers).length > 0) {
        params.set("headers", JSON.stringify(link.headers));
      }
      return `${apiBase}/api/hls?${params.toString()}`;
    }

    // Non-HLS (mp4, mkv, etc.): mint a signed token and use /api/proxy
    const res = await fetch(`${apiBase}/api/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: link.url, headers: link.headers || {} }),
    });
    const data = await res.json();
    if (data.token) return `${apiBase}/api/proxy?token=${data.token}`;
  } catch (e) {
    console.warn("Proxy resolution failed, falling back to direct URL:", e);
  }
  return link.url;
}
