export async function onRequest(context: any) {
  const request: Request = context.request;
  const url = new URL(request.url);
  const targetUrl = `http://31.56.53.215.nip.io/api/proxy${url.search}`;
  const res = await fetch(targetUrl, {
    headers: { "Range": request.headers.get("Range") || "" },
  });
  return new Response(res.body, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") || "video/mp4",
      "Access-Control-Allow-Origin": "*",
      "Accept-Ranges": "bytes",
      "Content-Length": res.headers.get("Content-Length") || "",
      "Content-Range": res.headers.get("Content-Range") || "",
    },
  });
}
