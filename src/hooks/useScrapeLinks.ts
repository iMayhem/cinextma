"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiBase, type ScrapedLink } from "@/utils/scrape";

export interface ScrapeRequest {
  title: string;
  year?: string;
  type: "movie" | "tv";
  season?: number;
  episode?: number;
}

export interface ScrapeState {
  links: ScrapedLink[];
  status: "idle" | "scraping" | "done" | "error";
  error: string | null;
  abort: () => void;
}

export function useScrapeLinks(req: ScrapeRequest): ScrapeState {
  const [links, setLinks] = useState<ScrapedLink[]>([]);
  const [status, setStatus] = useState<ScrapeState["status"]>("idle");
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const userAbortedRef = useRef(false);

  const key = JSON.stringify([req.title, req.year, req.type, req.season, req.episode]);

  useEffect(() => {
    if (!req.title) return;
    let cancelled = false;
    userAbortedRef.current = false;

    const run = async () => {
      setStatus("scraping");
      setLinks([]);
      setError(null);

      const controller = new AbortController();
      abortRef.current = controller;

      const qs = new URLSearchParams({ title: req.title, type: req.type, stream: "true" });
      if (req.year) qs.set("year", req.year);
      if (req.season != null) qs.set("season", String(req.season));
      if (req.episode != null) qs.set("episode", String(req.episode));

      try {
        const res = await fetch(`${apiBase}/api/scrape?${qs.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok || !res.body) throw new Error(`Scrape failed: HTTP ${res.status}`);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let idx;
          while ((idx = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, idx).trim();
            buffer = buffer.slice(idx + 1);
            if (!line) continue;
            try {
              const evt = JSON.parse(line);
              if (evt && evt.url) {
                setLinks((prev) =>
                  prev.some((l) => l.url === evt.url) ? prev : [...prev, evt],
                );
              }
            } catch {
              // ignore malformed lines
            }
          }
        }
        if (!cancelled && !userAbortedRef.current) setStatus("done");
      } catch (e: any) {
        if (cancelled) return;
        if (userAbortedRef.current || e?.name === "AbortError") {
          setStatus("done");
        } else {
          setError(e?.message || "Scrape failed");
          setStatus("error");
        }
      } finally {
        abortRef.current = null;
      }
    };

    run();
    return () => {
      cancelled = true;
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const abort = useCallback(() => {
    userAbortedRef.current = true;
    abortRef.current?.abort();
  }, []);

  return { links, status, error, abort };
}