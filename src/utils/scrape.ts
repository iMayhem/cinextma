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

export const apiBase = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/+$/, "");

export function qualityRank(quality?: string): number {
  if (!quality) return 0;
  const q = quality.toLowerCase();
  if (q.includes("4k") || q.includes("2160")) return 5;
  if (q.includes("1080")) return 4;
  if (q.includes("720")) return 3;
  if (q.includes("480")) return 2;
  if (q.includes("360")) return 1;
  return 0;
}

export function pickBest(links: ScrapedLink[]): ScrapedLink | null {
  if (!links.length) return null;
  return [...links].sort((a, b) => {
    const hlsA = a.url.includes(".m3u8") ? 1 : 0;
    const hlsB = b.url.includes(".m3u8") ? 1 : 0;
    if (hlsA !== hlsB) return hlsB - hlsA;
    const qA = qualityRank(a.quality);
    const qB = qualityRank(b.quality);
    if (qA !== qB) return qB - qA;
    const dA = a.direct ? 1 : 0;
    const dB = b.direct ? 1 : 0;
    if (dA !== dB) return dB - dA;
    return (a.latencyMs ?? Number.MAX_SAFE_INTEGER) - (b.latencyMs ?? Number.MAX_SAFE_INTEGER);
  })[0];
}

export async function resolvePlayableUrl(link: ScrapedLink, forceProxy = false): Promise<string> {
  if (!forceProxy && link.direct) return link.url;
  try {
    const res = await fetch(`${apiBase}/api/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: link.url, headers: link.headers || {} }),
    });
    const data = await res.json();
    if (data.token) return `${apiBase}/api/proxy?token=${data.token}`;
  } catch (e) {
    console.warn("Proxy token mint failed, falling back to direct URL:", e);
  }
  return link.url;
}