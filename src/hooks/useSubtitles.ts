"use client";
import { useEffect, useState } from "react";
import { apiBase } from "@/utils/scrape";

export interface SubtitleTrack {
  label: string;
  src: string;
  lang: string;
  default?: boolean;
}

export interface UseSubtitlesProps {
  title: string;
  year?: string;
  tmdbId?: number | string;
  imdbId?: string;
  type?: "movie" | "tv";
  season?: number | string;
  episode?: number | string;
  enabled?: boolean;
}

export function useSubtitles(opts: UseSubtitlesProps) {
  const [tracks, setTracks] = useState<SubtitleTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const key = `${opts.title}::${opts.year}::${opts.tmdbId}::${opts.type}::${opts.season}::${opts.episode}`;

  useEffect(() => {
    if (!opts.enabled || !opts.title) return;
    let cancelled = false;

    const params = new URLSearchParams();
    if (opts.title) params.set("title", opts.title);
    if (opts.year) params.set("year", opts.year);
    if (opts.tmdbId) params.set("tmdbId", String(opts.tmdbId));
    if (opts.imdbId) params.set("imdbId", opts.imdbId);
    if (opts.type) params.set("type", opts.type);
    if (opts.season != null) params.set("season", String(opts.season));
    if (opts.episode != null) params.set("episode", String(opts.episode));

    const url = `${apiBase}/api/subs?${params.toString()}`;
    setLoading(true);

    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((j) => {
        if (cancelled) return;
        const arr: SubtitleTrack[] = Array.isArray(j.subtitles) ? j.subtitles : [];
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
