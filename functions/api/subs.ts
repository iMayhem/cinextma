export async function onRequest(context: any) {
  const url = new URL(context.request.url);
  const qs = url.search;
  // proxy to VPS subs endpoint via nip.io to avoid 1003
  const target = `http://31.56.53.215.nip.io/api/subs${qs}`;
  try {
    const res = await fetch(target);
    const body = await res.text();
    return new Response(body, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("Content-Type") || "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ subtitles: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
}
