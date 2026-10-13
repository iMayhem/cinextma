import { NextRequest, NextResponse } from "next/server";

const SCRAPERS_BASE = process.env.SCRAPERS_BASE || "https://streamaggregator.in";
// Public origin used when rewriting playlist URLs. Never derive this from the
// incoming request: behind nginx Next sees Host localhost:3100 and would emit
// unplayable https://localhost:3100/... links.
const PUBLIC_ORIGIN = (process.env.NEXT_PUBLIC_SITE_URL || "https://streamaggregator.in").replace(/\/+$/, "");

/**
 * HLS Proxy — rewrites m3u8 playlists so all segment / sub-playlist URLs
 * are also routed through this proxy endpoint, solving CORS issues for
 * HLS streams that have custom headers or restricted origins.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const token = searchParams.get("token");
  const rawUrl = searchParams.get("url");
  const headersParam = searchParams.get("headers");

  if (!token && !rawUrl) {
    return new NextResponse("Missing url or token", { status: 400 });
  }

  if (token) {
    const proxyUrl = `${SCRAPERS_BASE}/api/proxy?token=${encodeURIComponent(token)}`;
    return proxyFetch(req, proxyUrl, {});
  }

  let customHeaders: Record<string, string> = {};
  if (headersParam) {
    try { customHeaders = JSON.parse(headersParam); } catch { /* ignore */ }
  }

  return proxyFetch(req, rawUrl!, customHeaders);
}

async function proxyFetch(
  req: NextRequest,
  targetUrl: string,
  customHeaders: Record<string, string>,
) {
  const outHeaders: Record<string, string> = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
    ...customHeaders,
  };
  const range = req.headers.get("range");
  if (range) outHeaders["Range"] = range;

  let resp: Response;
  try {
    resp = await fetch(targetUrl, { headers: outHeaders });
  } catch (e) {
    return new NextResponse(`Fetch error: ${e}`, { status: 502 });
  }

  const contentType = resp.headers.get("content-type") || "";
  const ctLower = contentType.toLowerCase();
  let pathname = "";
  try {
    pathname = new URL(targetUrl).pathname.toLowerCase();
  } catch {
    /* ignore */
  }
  // Playlists are not always served as .m3u8 / mpegurl: some CDNs use
  // master.txt, hls.php, or text/plain. Sniff text-ish responses, but only
  // small ones so mislabeled binary segments are never buffered/decoded.
  const declaredLen = Number(resp.headers.get("content-length") || "0");
  const smallEnough = !declaredLen || declaredLen < 4_000_000;
  const isPlaylist =
    smallEnough &&
    (ctLower.includes("mpegurl") ||
      ctLower.includes("text/") ||
      ctLower.includes("octet-stream") ||
      ctLower === "" ||
      /\.(m3u8?|txt)$/.test(pathname));

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Expose-Headers": "Content-Range, Content-Length, Content-Type",
  };

  if (isPlaylist) {
    // Buffer as bytes and sniff ASCII header so a mislabeled binary body is
    // passed through byte-for-byte instead of being decoded/re-encoded.
    const buf = Buffer.from(await resp.arrayBuffer());
    const head = buf.subarray(0, 64).toString("utf8").trimStart();
    if (head.startsWith("#EXTM3U")) {
      const rewritten = rewriteM3u8(buf.toString("utf8"), targetUrl, customHeaders);
      return new NextResponse(rewritten, {
        status: resp.status,
        headers: { "Content-Type": "application/vnd.apple.mpegurl", ...corsHeaders },
      });
    }
    return new NextResponse(buf, {
      status: resp.status,
      headers: { "Content-Type": contentType || "application/octet-stream", ...corsHeaders },
    });
  }

  const responseHeaders = new Headers(corsHeaders);
  const cr = resp.headers.get("content-range");
  if (cr) responseHeaders.set("Content-Range", cr);
  const cl = resp.headers.get("content-length");
  if (cl) responseHeaders.set("Content-Length", cl);
  responseHeaders.set("Content-Type", contentType || "video/MP2T");

  return new NextResponse(resp.body, { status: resp.status, headers: responseHeaders });
}

function rewriteM3u8(
  playlist: string,
  originalUrl: string,
  headers: Record<string, string>,
): string {
  const base = new URL(originalUrl);
  const headersJson = Object.keys(headers).length > 0 ? JSON.stringify(headers) : null;
  const proxyBase = `${PUBLIC_ORIGIN}/api/hls`;

  const proxyUri = (uri: string): string => {
    let absolute: string;
    try { absolute = new URL(uri, base).toString(); } catch { return uri; }
    const params = new URLSearchParams({ url: absolute });
    if (headersJson) params.set("headers", headersJson);
    return `${proxyBase}?${params.toString()}`;
  };

  return playlist.split("\n").map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return line;
    if (trimmed.startsWith("#")) {
      // Rewrite URI="..." attributes on tags like EXT-X-KEY / EXT-X-MAP /
      // EXT-X-MEDIA / EXT-X-I-FRAME-STREAM-INF as well.
      return line.replace(/URI="([^"]+)"/g, (_m, uri) => `URI="${proxyUri(uri)}"`);
    }
    return proxyUri(trimmed);
  }).join("\n");
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Max-Age": "86400",
    },
  });
}
