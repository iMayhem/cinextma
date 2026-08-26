"use client";

import { siteConfig } from "@/config/site";
import { cn } from "@/utils/helpers";
import { pickBest, resolvePlayableUrl, type ScrapedLink } from "@/utils/scrape";
import { useScrapeLinks } from "@/hooks/useScrapeLinks";
import type { PlayersProps } from "@/types";
import { Card, Skeleton, Spinner } from "@heroui/react";
import { useDisclosure, useDocumentTitle, useIdle } from "@mantine/hooks";
import dynamic from "next/dynamic";
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Episode, TvShowDetails } from "tmdb-ts";
import useBreakpoints from "@/hooks/useBreakpoints";
import { SpacingClasses } from "@/utils/constants";

const TvShowPlayerHeader = dynamic(() => import("./Header"));
const TvShowPlayerSourceSelection = dynamic(() => import("./SourceSelection"));
const SourceList = dynamic(() => import("../../Player/SourceList"));
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

  const router = useRouter();
  const { mobile } = useBreakpoints();
  const idle = useIdle(3000);
  const [sourceOpened, sourceHandlers] = useDisclosure(false);
  const [episodeOpened, episodeHandlers] = useDisclosure(false);
  const [selectedSource, setSelectedSource] = useState(0);
  const [src, setSrc] = useState<string>("");

  useDocumentTitle(
    `Play ${props.seriesName} - ${props.seasonName} - ${episode.name} | ${siteConfig.name}`,
  );

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
      setSelectedSource(index);
      abort();
    },
    [setSelectedSource, abort],
  );

  const PLAYER: ScrapedLink | null = useMemo(
    () => links[selectedSource] || pickBest(links),
    [links, selectedSource],
  );

  useEffect(() => {
    let cancelled = false;
    if (!PLAYER) {
      setSrc("");
      return;
    }
    resolvePlayableUrl(PLAYER).then((url) => {
      if (!cancelled) setSrc(url);
    });
    return () => {
      cancelled = true;
    };
  }, [PLAYER]);

  const loading = status === "idle" || status === "scraping";
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

        <div className="mx-auto grid h-[100dvh] w-full max-w-[1700px] grid-rows-[auto_minmax(0,1fr)] gap-4 p-2 md:h-[100dvh] md:grid-cols-[minmax(0,1fr)_400px] md:grid-rows-[minmax(0,1fr)]">
        <Card shadow="md" radius="none" className="relative aspect-video w-full bg-black md:h-full">
          <Skeleton className="absolute h-full w-full" />
          {!loading && PLAYER && src && (
            <div className="absolute inset-0 z-10">
              <NetflixPlayer
                src={src}
                title={props.seriesName}
                subtitle={`${props.seasonName} · E${episode.episode_number} · ${episode.name}`}
                quality={PLAYER.quality}
                autoPlay
                onNext={
                  props.nextEpisodeNumber != null
                    ? () =>
                        router.push(
                          `/tv/${id}/${episode.season_number}/${props.nextEpisodeNumber}/player`,
                        )
                    : undefined
                }
              />
            </div>
          )}
          {loading && (
            <div className="absolute z-20 flex h-full w-full flex-col items-center justify-center gap-4 bg-black/60">
              <Spinner size="lg" color="warning" variant="simple" />
              <p className="text-sm text-white/80">
                Searching providers for {props.seriesName} S{episode.season_number}E
                {episode.episode_number}…
              </p>
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
          <SourceList
            links={links}
            selected={selectedSource}
            onSelect={selectSource}
            loading={loading}
          />
        </div>
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