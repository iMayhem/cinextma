import { NextRequest, NextResponse } from "next/server";

const TMDB_KEY = process.env.NEXT_PUBLIC_TMDB_ACCESS_TOKEN || "dfa4c2c7c1de1005adee824dc5593672";

const LANG_MAP: Record<string, string> = {
  eng: "English",
  en: "English",
  spa: "Spanish",
  es: "Spanish",
  fre: "French",
  fra: "French",
  fr: "French",
  ger: "German",
  deu: "German",
  de: "German",
  ita: "Italian",
  it: "Italian",
  por: "Portuguese",
  pob: "Portuguese (BR)",
  pt: "Portuguese",
  rus: "Russian",
  ru: "Russian",
  hin: "Hindi",
  hi: "Hindi",
  ara: "Arabic",
  ar: "Arabic",
  chi: "Chinese",
  zho: "Chinese",
  zh: "Chinese",
  jpn: "Japanese",
  ja: "Japanese",
  kor: "Korean",
  ko: "Korean",
  ind: "Indonesian",
  id: "Indonesian",
  tur: "Turkish",
  tr: "Turkish",
  vie: "Vietnamese",
  vi: "Vietnamese",
  pol: "Polish",
  pl: "Polish",
  dut: "Dutch",
  nld: "Dutch",
  nl: "Dutch",
  swe: "Swedish",
  sv: "Swedish",
  nor: "Norwegian",
  no: "Norwegian",
  dan: "Danish",
  da: "Danish",
  fin: "Finnish",
  fi: "Finnish",
  ell: "Greek",
  el: "Greek",
  heb: "Hebrew",
  he: "Hebrew",
  tha: "Thai",
  th: "Thai",
  cze: "Czech",
  ces: "Czech",
  cs: "Czech",
  hun: "Hungarian",
  hu: "Hungarian",
  rum: "Romanian",
  ron: "Romanian",
  ro: "Romanian",
  ukr: "Ukrainian",
  uk: "Ukrainian",
  tam: "Tamil",
  ta: "Tamil",
  tel: "Telugu",
  te: "Telugu",
  mal: "Malayalam",
  ml: "Malayalam",
  kan: "Kannada",
  kn: "Kannada",
  ben: "Bengali",
  bn: "Bengali",
  urd: "Urdu",
  ur: "Urdu",
  fil: "Tagalog",
  tgl: "Tagalog",
  tl: "Tagalog",
  per: "Persian",
  fas: "Persian",
  fa: "Persian",
};

interface SubtitleTrack {
  label: string;
  src: string;
  lang: string;
  default?: boolean;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const tmdbId = searchParams.get("tmdbId");
  let imdbId = searchParams.get("imdbId");
  const type = searchParams.get("type") === "tv" ? "series" : "movie";
  const season = searchParams.get("season") || "1";
  const episode = searchParams.get("episode") || "1";

  // If no imdbId provided, resolve via TMDB
  if (!imdbId && tmdbId) {
    try {
      const tmdbType = type === "series" ? "tv" : "movie";
      const tmdbRes = await fetch(
        `https://api.themoviedb.org/3/${tmdbType}/${tmdbId}/external_ids?api_key=${TMDB_KEY}`
      );
      if (tmdbRes.ok) {
        const data = await tmdbRes.json();
        imdbId = data.imdb_id;
      }
    } catch (e) {
      console.warn("Failed to resolve IMDB ID from TMDB:", e);
    }
  }

  if (!imdbId) {
    return NextResponse.json({ subtitles: [] });
  }

  try {
    const stremioEndpoint =
      type === "series"
        ? `https://opensubtitles-v3.strem.io/subtitles/series/${imdbId}:${season}:${episode}.json`
        : `https://opensubtitles-v3.strem.io/subtitles/movie/${imdbId}.json`;

    const subRes = await fetch(stremioEndpoint, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
      },
      next: { revalidate: 3600 },
    });

    if (!subRes.ok) {
      return NextResponse.json({ subtitles: [] });
    }

    const subData = await subRes.json();
    const rawSubs: Array<{ id: string; url: string; lang: string; movieReleaseName?: string }> =
      Array.isArray(subData?.subtitles) ? subData.subtitles : [];

    const langCount: Record<string, number> = {};
    const formatted: SubtitleTrack[] = [];
    let hasDefault = false;

    // Sort to prioritize English first, then by language
    const sorted = [...rawSubs].sort((a, b) => {
      const aEng = a.lang === "eng" || a.lang === "en" ? 0 : 1;
      const bEng = b.lang === "eng" || b.lang === "en" ? 0 : 1;
      if (aEng !== bEng) return aEng - bEng;
      return (a.lang || "").localeCompare(b.lang || "");
    });

    for (const sub of sorted) {
      if (!sub.url) continue;

      const code = (sub.lang || "en").toLowerCase();
      const langName = LANG_MAP[code] || code.toUpperCase();
      langCount[langName] = (langCount[langName] || 0) + 1;

      const count = langCount[langName];
      const label = count > 1 ? `${langName} (${count})` : langName;

      // Make the first English track default
      const isEnglish = code === "eng" || code === "en";
      const isDefault = isEnglish && !hasDefault;
      if (isDefault) hasDefault = true;

      // Use our Next.js /api/subs/vtt converter endpoint for seamless WebVTT playback
      const vttSrc = `/api/subs/vtt?url=${encodeURIComponent(sub.url)}`;

      formatted.push({
        label,
        src: vttSrc,
        lang: code.slice(0, 2),
        default: isDefault,
      });
    }

    return NextResponse.json(
      { subtitles: formatted },
      {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
          "Cache-Control": "public, max-age=3600, s-maxage=3600",
        },
      }
    );
  } catch (error: any) {
    console.error("Subtitles fetch failed:", error);
    return NextResponse.json({ subtitles: [] });
  }
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
