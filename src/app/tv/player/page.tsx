"use client";

import { tmdb } from "@/api/tmdb";
import { Spinner } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import { notFound, useSearchParams } from "next/navigation";
import { Suspense, useEffect } from "react";
import dynamic from "next/dynamic";
const TvShowPlayer = dynamic(() => import("@/components/sections/TV/Player/Player"));

function TvShowPlayerInner() {
  const searchParams = useSearchParams();
  const id = Number(searchParams.get("id"));
  const season = Number(searchParams.get("season"));
  const episode = Number(searchParams.get("episode"));

  const {
    data: tv,
    isPending: isPendingTv,
    error: errorTv,
  } = useQuery({
    queryFn: () => tmdb.tvShows.details(id),
    queryKey: ["tv-show-player-details", id],
    enabled: !!id,
  });

  const {
    data: seasonDetail,
    isPending: isPendingSeason,
    error: errorSeason,
  } = useQuery({
    queryFn: () => tmdb.tvShows.season(id, season),
    queryKey: ["tv-show-season", id, season],
    enabled: !!id && !!season,
  });

  const EPISODE = seasonDetail?.episodes?.find(
    (e: any) => e.episode_number.toString() === episode.toString(),
  );

  useEffect(() => {
    if (tv && EPISODE && id && season && episode) {
      fetch("/api/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          media_type: "tv",
          tmdb_id: id,
          title: tv.name,
          poster_path: tv.poster_path,
          backdrop_path: tv.backdrop_path,
          season: season,
          episode: episode,
          episode_title: EPISODE.name,
        }),
      }).catch(() => {});
    }
  }, [tv, EPISODE, id, season, episode]);

  if (!id || !season || !episode) notFound();

  if (isPendingTv || isPendingSeason) {
    return <Spinner size="lg" className="absolute-center" color="warning" variant="simple" />;
  }

  const EPISODE = seasonDetail?.episodes.find(
    (e: any) => e.episode_number.toString() === episode.toString(),
  );

  if (!EPISODE || errorTv || errorSeason) notFound();

  const isNotReleased = new Date(EPISODE.air_date) > new Date();

  if (isNotReleased) notFound();

  const currentEpisodeIndex = seasonDetail.episodes.findIndex(
    (e: any) => e.episode_number === EPISODE.episode_number,
  );

  const nextEpisodeNumber =
    currentEpisodeIndex < seasonDetail.episodes.length - 1
      ? new Date(seasonDetail.episodes[currentEpisodeIndex + 1].air_date) > new Date()
        ? null
        : seasonDetail.episodes[currentEpisodeIndex + 1].episode_number
      : null;

  const prevEpisodeNumber =
    currentEpisodeIndex > 0 ? seasonDetail.episodes[currentEpisodeIndex - 1].episode_number : null;

  return (
    <TvShowPlayer
      tv={tv}
      id={id}
      seriesName={tv.name}
      seasonName={seasonDetail.name}
      episode={EPISODE}
      episodes={seasonDetail.episodes}
      nextEpisodeNumber={nextEpisodeNumber}
      prevEpisodeNumber={prevEpisodeNumber}
    />
  );
}

export default function TvShowPlayerPage() {
  return (
    <Suspense
      fallback={
        <Spinner size="lg" className="absolute-center" color="warning" variant="simple" />
      }
    >
      <TvShowPlayerInner />
    </Suspense>
  );
}
