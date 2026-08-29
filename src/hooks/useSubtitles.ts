"use client";
import { useEffect, useState } from "react";
import { apiBase } from "@/utils/scrape";

export interface SubtitleTrack {
  label: string;
  src: string;
  lang: string;
  default?: boolean;
}

export function useSubtitles(opts: { title: string; year?: string; tmdbId?: number | string; enabled?: boolean }) {
  const [tracks, setTracks] = useState<SubtitleTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const key = `${opts.title}::${opts.year}::${opts.tmdbId}`;
  useEffect(() => {
    if (!opts.enabled || !opts.title) return;
    let cancelled = false;
    const url = `${apiBase}/api/subs?title=${encodeURIComponent(opts.title)}${opts.year ? `&year=${encodeURIComponent(opts.year)}` : ""}${opts.tmdbId ? `&tmdbId=${encodeURIComponent(String(opts.tmdbId))}` : ""}`;
    setLoading(true);
    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((j) => {
        if (cancelled) return;
        const arr: SubtitleTrack[] = Array.isArray(j.subtitles) ? j.subtitles : [];
        // ensure at least default Off is handled in player, not here
        setTracks(arr);
      })
      .catch(() => {
        if (!cancelled) setTracks([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [key, opts.enabled]);
  return { tracks, loading };
}
