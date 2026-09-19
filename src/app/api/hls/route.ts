import { NextRequest, NextResponse } from "next/server";

const SCRAPERS_BASE = process.env.SCRAPERS_BASE || "http://185.67.20.9.nip.io";

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
    return proxyFetch(req, proxyUrl, {}, req.nextUrl.toString());
  }

  let customHeaders: Record<string, string> = {};
  if (headersParam) {
    try { customHeaders = JSON.parse(headersParam); } catch { /* ignore */ }
  }

  return proxyFetch(req, rawUrl!, customHeaders, req.nextUrl.toString());
}

async function proxyFetch(
  req: NextRequest,
  targetUrl: string,
  customHeaders: Record<string, string>,
  selfBase: string,
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
  const isPlaylist =
    contentType.includes("mpegurl") ||
    contentType.includes("x-mpegURL") ||
    targetUrl.split("?")[0].endsWith(".m3u8");

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Expose-Headers": "Content-Range, Content-Length, Content-Type",
  };

  if (isPlaylist) {
    const text = await resp.text();
    const rewritten = rewriteM3u8(text, targetUrl, selfBase, customHeaders);
    return new NextResponse(rewritten, {
      status: resp.status,
      headers: { "Content-Type": "application/vnd.apple.mpegurl", ...corsHeaders },
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
  selfBase: string,
  headers: Record<string, string>,
): string {
  const base = new URL(originalUrl);
  const headersJson = Object.keys(headers).length > 0 ? JSON.stringify(headers) : null;
  const selfUrl = new URL(selfBase);
  const proxyBase = `${selfUrl.origin}/api/hls`;

  return playlist.split("\n").map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return line;
    let absolute: string;
    try { absolute = new URL(trimmed, base).toString(); } catch { return line; }
    const params = new URLSearchParams({ url: absolute });
    if (headersJson) params.set("headers", headersJson);
    return `${proxyBase}?${params.toString()}`;
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
