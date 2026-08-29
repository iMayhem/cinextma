export async function onRequest(context: any) {
  const request: Request = context.request;
  const url = new URL(request.url);
  // Forward all query params to VPS
  const targetUrl = `http://31.56.53.215.nip.io/api/scrape${url.search}`;
  const res = await fetch(targetUrl, {
    method: request.method,
    headers: {
      // forward minimal headers
      "Accept": request.headers.get("Accept") || "*/*",
    },
  });
  // Stream NDJSON back with CORS
  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers: {
      "Content-Type": res.headers.get("Content-Type") || "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Cache-Control": "no-cache",
    },
  });
}
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
