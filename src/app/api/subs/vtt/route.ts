import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const targetUrl = searchParams.get("url");

  if (!targetUrl) {
    return new NextResponse("Missing subtitle url", { status: 400 });
  }

  try {
    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      },
    });

    if (!res.ok) {
      return new NextResponse(`Failed to fetch subtitle: ${res.statusText}`, { status: 502 });
    }

    const text = await res.text();
    const vtt = srtToVtt(text);

    return new NextResponse(vtt, {
      status: 200,
      headers: {
        "Content-Type": "text/vtt; charset=utf-8",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    });
  } catch (error: any) {
    return new NextResponse(`Error converting subtitle: ${error?.message || error}`, { status: 500 });
  }
}

/**
 * Converts standard SubRip (SRT) format to WebVTT format.
 */
function srtToVtt(srt: string): string {
  // If already WebVTT, return directly
  if (srt.trimStart().startsWith("WEBVTT")) {
    return srt;
  }

  // Normalize line endings to \n
  let normalized = srt.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Remove any byte order marks (BOM)
  normalized = normalized.replace(/^\uFEFF/, "");

  // Convert timecode separator from comma (00:00:00,000) to dot (00:00:00.000)
  const vttTimes = normalized.replace(
    /(\d{2}:\d{2}:\d{2}),(\d{3})/g,
    "$1.$2"
  );

  return `WEBVTT\n\n${vttTimes.trim()}\n`;
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
