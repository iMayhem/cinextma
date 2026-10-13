// HLS Proxy as a Pages Function (ported from src/app/api/hls/route.ts).
// Rewrites m3u8 playlists so segments route back through this endpoint.
// Token mode forwards to the VPS bridge; direct mode is self-contained.

const BRIDGE_PROXY = "https://api.moovie.fun/api/proxy";

export async function onRequest(context: any) {
  const request: Request = context.request;
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "86400",
      },
    });
  }
  const url = new URL(request.url);
  const publicOrigin = url.origin;
  const token = url.searchParams.get("token");
  const rawUrl = url.searchParams.get("url");
  const headersParam = url.searchParams.get("headers");

  if (!token && !rawUrl) {
    return new Response("Missing url or token", { status: 400 });
  }

  if (token) {
    const proxyUrl = `${BRIDGE_PROXY}?token=${encodeURIComponent(token)}`;
    return proxyFetch(request, proxyUrl, {}, publicOrigin);
  }

  let customHeaders: Record<string, string> = {};
  if (headersParam) {
    try {
      customHeaders = JSON.parse(headersParam);
    } catch {
      /* ignore */
    }
  }
  return proxyFetch(request, rawUrl as string, customHeaders, publicOrigin);
}

async function proxyFetch(
  req: Request,
  targetUrl: string,
  customHeaders: Record<string, string>,
  publicOrigin: string,
): Promise<Response> {
  const outHeaders: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
    ...customHeaders,
  };
  const range = req.headers.get("range");
  if (range) outHeaders["Range"] = range;

  let resp: Response;
  try {
    resp = await fetch(targetUrl, { headers: outHeaders });
  } catch (e) {
    return new Response(`Fetch error: ${e}`, { status: 502 });
  }

  const contentType = resp.headers.get("content-type") || "";
  const ctLower = contentType.toLowerCase();
  let pathname = "";
  try {
    pathname = new URL(targetUrl).pathname.toLowerCase();
  } catch {
    /* ignore */
  }
  const declaredLen = Number(resp.headers.get("content-length") || "0");
  const smallEnough = !declaredLen || declaredLen < 4000000;
  const isPlaylist =
    smallEnough &&
    (ctLower.includes("mpegurl") ||
      ctLower.includes("text/") ||
      ctLower.includes("octet-stream") ||
      ctLower === "" ||
      /\.(m3u8?|txt)$/.test(pathname));

  const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Expose-Headers": "Content-Range, Content-Length, Content-Type",
  };

  if (isPlaylist) {
    const buf = await resp.arrayBuffer();
    const head = new TextDecoder()
      .decode(buf.slice(0, 64))
      .trimStart();
    if (head.startsWith("#EXTM3U")) {
      const rewritten = rewriteM3u8(
        new TextDecoder().decode(buf),
        targetUrl,
        customHeaders,
        publicOrigin,
      );
      return new Response(rewritten, {
        status: resp.status,
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          ...corsHeaders,
        },
      });
    }
    return new Response(buf, {
      status: resp.status,
      headers: {
        "Content-Type": contentType || "application/octet-stream",
        ...corsHeaders,
      },
    });
  }

  const responseHeaders = new Headers(corsHeaders);
  const cr = resp.headers.get("content-range");
  if (cr) responseHeaders.set("Content-Range", cr);
  const cl = resp.headers.get("content-length");
  if (cl) responseHeaders.set("Content-Length", cl);
  responseHeaders.set("Content-Type", contentType || "video/MP2T");
  return new Response(resp.body, {
    status: resp.status,
    headers: responseHeaders,
  });
}

function rewriteM3u8(
  playlist: string,
  originalUrl: string,
  headers: Record<string, string>,
  publicOrigin: string,
): string {
  const base = new URL(originalUrl);
  const headersJson =
    Object.keys(headers).length > 0 ? JSON.stringify(headers) : null;
  const proxyBase = `${publicOrigin}/api/hls`;

  const proxyUri = (uri: string): string => {
    let absolute: string;
    try {
      absolute = new URL(uri, base).toString();
    } catch {
      return uri;
    }
    const params = new URLSearchParams({ url: absolute });
    if (headersJson) params.set("headers", headersJson);
    return `${proxyBase}?${params.toString()}`;
  };

  return playlist
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (trimmed.startsWith("#")) {
        return line.replace(
          /URI="([^"]+)"/g,
          (_m, uri) => `URI="${proxyUri(uri)}"`,
        );
      }
      return proxyUri(trimmed);
    })
    .join("\n");
}
