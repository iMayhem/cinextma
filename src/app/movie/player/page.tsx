"use client";

import { tmdb } from "@/api/tmdb";
import MoviePlayer from "@/components/sections/Movie/Player/Player";
import { isEmpty } from "@/utils/helpers";
import { Spinner } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import { notFound, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function MoviePlayerInner() {
  const searchParams = useSearchParams();
  const id = Number(searchParams.get("id"));

  const {
    data: movie,
    isPending,
    error,
  } = useQuery({
    queryFn: () => tmdb.movies.details(id),
    queryKey: ["movie-player-detail", id],
    enabled: !!id,
  });

  if (!id) notFound();

  if (isPending) {
    return <Spinner size="lg" className="absolute-center" variant="simple" />;
  }

  if (error || isEmpty(movie)) return notFound();

  return <MoviePlayer movie={movie} />;
}

export default function MoviePlayerPage() {
  return (
    <Suspense fallback={<Spinner size="lg" className="absolute-center" variant="simple" />}>
      <MoviePlayerInner />
    </Suspense>
  );
}
