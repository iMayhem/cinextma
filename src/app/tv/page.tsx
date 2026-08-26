"use client";

import { tmdb } from "@/api/tmdb";
import { Spinner } from "@heroui/react";
import { useScrollIntoView } from "@mantine/hooks";
import { useQuery } from "@tanstack/react-query";
import { notFound, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import dynamic from "next/dynamic";
const PhotosSection = dynamic(() => import("@/components/ui/other/PhotosSection"));
const TvShowRelatedSection = dynamic(() => import("@/components/sections/TV/Details/Related"));
const TvShowCastsSection = dynamic(() => import("@/components/sections/TV/Details/Casts"));
const TvShowBackdropSection = dynamic(() => import("@/components/sections/TV/Details/Backdrop"));
const TvShowOverviewSection = dynamic(() => import("@/components/sections/TV/Details/Overview"));
const TvShowsSeasonsSelection = dynamic(() => import("@/components/sections/TV/Details/Seasons"));

function TVShowDetail() {
  const searchParams = useSearchParams();
  const id = Number(searchParams.get("id"));
  const { scrollIntoView, targetRef } = useScrollIntoView<HTMLDivElement>({
    duration: 500,
  });

  const {
    data: tv,
    isPending,
    error,
  } = useQuery({
    queryFn: () =>
      tmdb.tvShows.details(id, [
        "images",
        "videos",
        "credits",
        "keywords",
        "recommendations",
        "similar",
        "reviews",
        "watch/providers",
      ]),
    queryKey: ["tv-show-detail", id],
    enabled: !!id,
  });

  if (!id) notFound();

  if (isPending) {
    return (
      <div className="mx-auto max-w-5xl">
        <Spinner size="lg" className="absolute-center" color="warning" variant="simple" />
      </div>
    );
  }

  if (error) notFound();

  return (
    <div className="mx-auto max-w-5xl">
      <Suspense
        fallback={
          <Spinner size="lg" className="absolute-center" color="warning" variant="simple" />
        }
      >
        <div className="flex flex-col gap-10">
          <TvShowBackdropSection tv={tv} />
          <TvShowOverviewSection
            onViewEpisodesClick={() => scrollIntoView({ alignment: "center" })}
            tv={tv}
          />
          <TvShowCastsSection casts={tv.credits.cast} />
          <PhotosSection images={tv.images.backdrops} type="tv" />
          <TvShowsSeasonsSelection ref={targetRef} id={id} seasons={tv.seasons} />
          <TvShowRelatedSection tv={tv} />
        </div>
      </Suspense>
    </div>
  );
}

export default function TVShowDetailPage() {
  return (
    <Suspense
      fallback={
        <Spinner size="lg" className="absolute-center" color="warning" variant="simple" />
      }
    >
      <TVShowDetail />
    </Suspense>
  );
}
