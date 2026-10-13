"use client";

import { siteConfig } from "@/config/site";
import { cn } from "@/utils/helpers";
import { autoPickIndex, autoRankLess, pickBest, resolvePlayableUrl, type ScrapedLink } from "@/utils/scrape";
import { useScrapeLinks } from "@/hooks/useScrapeLinks";
import { useSubtitles } from "@/hooks/useSubtitles";
import type { PlayersProps } from "@/types";
import { Card, Skeleton } from "@heroui/react";
import { useDisclosure, useDocumentTitle, useIdle } from "@mantine/hooks";
import dynamic from "next/dynamic";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Episode, TvShowDetails } from "tmdb-ts";
import useBreakpoints from "@/hooks/useBreakpoints";
import { SpacingClasses } from "@/utils/constants";

const TvShowPlayerHeader = dynamic(() => import("./Header"));
const TvShowPlayerSourceSelection = dynamic(() => import("./SourceSelection"));
const NetflixPlayer = dynamic(() => import("../../Player/NetflixPlayer"));
const TvShowPlayerEpisodeSelection = dynamic(() => import("./EpisodeSelection"));

export interface TvShowPlayerProps {
  tv: TvShowDetails;
  id: number;
  seriesName: string;
  seasonName: string;
  episode: Episode;
  episodes: Episode[];
  nextEpisodeNumber: number | null;
  prevEpisodeNumber: number | null;
  startAt?: number;
}

const TvShowPlayer: React.FC<TvShowPlayerProps> = ({
  tv,
  id,
  episode,
  episodes,
  ...props
}) => {
  const year = tv.first_air_date?.slice(0, 4);
  const { links, status, error, abort } = useScrapeLinks({
    title: props.seriesName,
    year,
    type: "tv",
    season: episode.season_number,
    episode: episode.episode_number,
  });
  const { tracks: subtitles } = useSubtitles({
    title: props.seriesName,
    year,
    tmdbId: id,
    type: "tv",
    season: episode.season_number,
    episode: episode.episode_number,
    enabled: !!props.seriesName,
  });

  const router = useRouter();
  const { mobile } = useBreakpoints();
  const idle = useIdle(3000);
  const [sourceOpened, sourceHandlers] = useDisclosure(false);
  const [episodeOpened, episodeHandlers] = useDisclosure(false);
  const [selectedSource, setSelectedSource] = useState(0);
  const [src, setSrc] = useState<string>("");
  const [userPicked, setUserPicked] = useState(false);
  const linksRef = useRef(links);
  linksRef.current = links;
  const userPickedRef = useRef(false);
  const settledRef = useRef(false);
  const triedRef = useRef<Set<number>>(new Set());
  const autoTriesRef = useRef(0);
  const playedRef = useRef(false);
  const handlePlayerErrorRef = useRef<() => void>(() => {});

  useDocumentTitle(
    `Play ${props.seriesName} - ${props.seasonName} - ${episode.name} | ${siteConfig.name}`,
  );

  // hard-stop when switching episode/series
  useEffect(() => {
    setSrc("");
    setSelectedSource(0);
    setUserPicked(false);
    userPickedRef.current = false;
    settledRef.current = false;
    triedRef.current = new Set();
    autoTriesRef.current = 0;
  }, [id, episode.season_number, episode.episode_number]);

  const players: PlayersProps[] = useMemo(
    () =>
      links.map((l, i) => ({
        title: `${l.providerKey || "Provider"}${l.server ? ` [${l.server}]` : ""}${
          l.quality ? ` (${l.quality})` : ""
        }`,
        source: "https://placeholder.invalid",
        recommended: i === 0,
        fast: true,
        ads: false,
        resumable: false,
        ping: l.latencyMs,
        size: l.size,
      })),
    [links],
  );

  const selectSource = useCallback(
    (index: number) => {
      setSrc("");
      setUserPicked(true);
      userPickedRef.current = true;
      setSelectedSource(index);
      abort();
    },
    [abort],
  );

  const PLAYER: ScrapedLink | null = useMemo(
    () => links[selectedSource] || pickBest(links),
    [links, selectedSource],
  );

  // Auto-pick the smallest available link shortly after links start arriving
  // (links stream in live; smallest file starts fastest on mobile).
  useEffect(() => {
    if (userPicked || settledRef.current || links.length === 0) return;
    const t = setTimeout(() => {
      if (userPickedRef.current || settledRef.current) return;
      const cur = linksRef.current;
      if (cur.length === 0) return;
      setSelectedSource(autoPickIndex(cur));
      settledRef.current = true;
    }, 2500);
    return () => clearTimeout(t);
  }, [links.length, userPicked]);

  useEffect(() => {
    let cancelled = false;
    if (!PLAYER) {
      setSrc("");
      return;
    }
    playedRef.current = false;
    triedRef.current.add(links.indexOf(PLAYER));
    resolvePlayableUrl(PLAYER).then((url) => {
      if (!cancelled) setSrc(url);
    });
    // Stall watchdog: if the source never starts playing after 12s,
    // treat as failure and try the next source.
    const stallTimer = setTimeout(() => {
      if (cancelled) return;
      try {
        const vids = Array.from(document.querySelectorAll("video"));
        if (vids.length === 0) return;
        const stalled = vids.every((v) => v.readyState < 2);
        if (stalled && !playedRef.current) handlePlayerErrorRef.current();
      } catch {
        /* ignore */
      }
    }, 12000);
    return () => {
      cancelled = true;
      clearTimeout(stallTimer);
    };
  }, [PLAYER]);

  const handlePlayerError = useCallback(() => {
    // Auto-advance through playable sources (max 4 tries). Manually picked
    // sources keep the player's own retry UI instead.
    if (userPickedRef.current || autoTriesRef.current >= 6) return;
    const cur = linksRef.current;
    const tried = triedRef.current;
    let best = -1;
    for (let i = 0; i < cur.length; i++) {
      if (tried.has(i)) continue;
      if (best < 0) { best = i; continue; }
      if (autoRankLess(cur[i], cur[best])) best = i;
    }
    if (best < 0) return;
    autoTriesRef.current += 1;
    setSelectedSource(best);
  }, []);
  handlePlayerErrorRef.current = handlePlayerError;

  const noSources = status === "done" && links.length === 0;

  return (
    <>
      <div className={cn("relative", SpacingClasses.reset)}>
        <TvShowPlayerHeader
          id={id}
          episode={episode}
          hidden={idle && !mobile}
          selectedSource={selectedSource}
          onOpenSource={sourceHandlers.open}
          onOpenEpisode={episodeHandlers.open}
          {...props}
        />

        <Card shadow="md" radius="none" className="relative h-[100dvh] w-full bg-black">
          <Skeleton className="absolute h-full w-full" />
          {PLAYER && src && (
            <div className="absolute inset-0 z-10">
              <NetflixPlayer
                src={src}
                title={props.seriesName}
                subtitle={`${props.seasonName} · E${episode.episode_number} · ${episode.name}`}
                quality={PLAYER.quality}
                subtitles={subtitles}
                autoPlay
                onError={handlePlayerError}
                onPlayStarted={() => { playedRef.current = true; }}
                onNext={
                  props.nextEpisodeNumber != null
                    ? () =>
                        router.push(
                          `/tv/player?id=${id}&season=${episode.season_number}&episode=${props.nextEpisodeNumber}`,
                        )
                    : undefined
                }
              />
            </div>
          )}
          {status === "error" && (
            <div className="absolute z-20 flex h-full w-full items-center justify-center bg-black/60">
              <p className="px-6 text-center text-sm text-danger-400">
                Scrape failed: {error || "unknown error"}
              </p>
            </div>
          )}
          {noSources && (
            <div className="absolute z-20 flex h-full w-full items-center justify-center bg-black/60">
              <p className="px-6 text-center text-sm text-white/80">
                No sources found for this episode.
              </p>
            </div>
          )}
        </Card>
      </div>

      <TvShowPlayerSourceSelection
        opened={sourceOpened}
        onClose={sourceHandlers.close}
        players={players}
        selectedSource={selectedSource}
        setSelectedSource={selectSource}
      />
      <TvShowPlayerEpisodeSelection
        id={id}
        opened={episodeOpened}
        onClose={episodeHandlers.close}
        episodes={episodes}
      />
    </>
  );
};

export default memo(TvShowPlayer);