"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button, Card, CardBody, Image, Spinner, Chip } from "@heroui/react";
import Link from "next/link";
import { FiClock, FiTrash2, FiPlay, FiLogIn } from "react-icons/fi";
import { tmdbImage } from "@/utils/helpers";

interface HistoryItem {
  id: number;
  media_type: "movie" | "tv";
  tmdb_id: number;
  title: string;
  poster_path: string | null;
  backdrop_path: string | null;
  season: number | null;
  episode: number | null;
  episode_title: string | null;
  watched_at: string;
}

export default function HistoryPage() {
  const { user, isLoading: isAuthLoading, openAuthModal } = useAuth();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/history");
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchHistory();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const handleDeleteItem = async (id: number) => {
    try {
      const res = await fetch(`/api/history?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setHistory((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAll = async () => {
    if (!confirm("Are you sure you want to clear your entire watch history?")) return;
    try {
      setIsDeleting(true);
      const res = await fetch("/api/history", { method: "DELETE" });
      if (res.ok) {
        setHistory([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  if (isAuthLoading || isLoading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Spinner size="lg" color="primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-4 text-center px-4">
        <div className="rounded-full bg-zinc-800/60 p-6 text-4xl text-primary">
          <FiClock />
        </div>
        <h1 className="text-2xl font-bold">Sign in to View Watch History</h1>
        <p className="max-w-md text-sm text-zinc-400">
          Your watch history is saved directly to your account in our database so you can pick up
          where you left off anytime.
        </p>
        <Button
          color="primary"
          variant="shadow"
          startContent={<FiLogIn />}
          onPress={() => openAuthModal("login")}
          className="mt-2 font-semibold"
        >
          Sign In / Register
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl flex items-center gap-2">
            <FiClock className="text-primary" /> Watch History
          </h1>
          <p className="text-sm text-zinc-400">
            Keep track of what you&apos;ve watched ({history.length} items)
          </p>
        </div>
        {history.length > 0 && (
          <Button
            color="danger"
            variant="flat"
            size="sm"
            startContent={<FiTrash2 />}
            onPress={handleClearAll}
            isLoading={isDeleting}
          >
            Clear History
          </Button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="flex h-[50vh] flex-col items-center justify-center gap-4 text-center">
          <div className="rounded-full bg-zinc-900 p-6 text-3xl text-zinc-600">
            <FiClock />
          </div>
          <h2 className="text-xl font-semibold">No Watch History Yet</h2>
          <p className="text-sm text-zinc-400 max-w-sm">
            Start streaming any movie or TV show and it will automatically be recorded here.
          </p>
          <Button as={Link} href="/" color="primary" variant="shadow">
            Browse Movies & Shows
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {history.map((item) => {
            const playUrl =
              item.media_type === "tv" && item.season && item.episode
                ? `/tv/player?id=${item.tmdb_id}&season=${item.season}&episode=${item.episode}`
                : `/movie/player?id=${item.tmdb_id}`;

            const detailUrl =
              item.media_type === "tv" ? `/tv/${item.tmdb_id}` : `/movie/${item.tmdb_id}`;

            const imageSrc = item.poster_path
              ? tmdbImage.poster(item.poster_path, "w342")
              : item.backdrop_path
                ? tmdbImage.backdrop(item.backdrop_path, "w780")
                : "/no-poster.png";

            return (
              <Card
                key={item.id}
                className="group relative overflow-hidden bg-zinc-900/60 border border-zinc-800/80 hover:border-primary/50 transition-all"
              >
                <div className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-950">
                  <Image
                    src={imageSrc}
                    alt={item.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    removeWrapper
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-80 group-hover:opacity-90 transition-opacity" />

                  <div className="absolute top-2 left-2 flex gap-1 z-10">
                    <Chip size="sm" color={item.media_type === "tv" ? "warning" : "primary"}>
                      {item.media_type === "tv" ? "TV" : "Movie"}
                    </Chip>
                  </div>

                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    title="Remove from history"
                    className="absolute top-2 right-2 z-10 rounded-full bg-black/60 p-1.5 text-zinc-400 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-black/90 transition-all"
                  >
                    <FiTrash2 size={14} />
                  </button>

                  <Link
                    href={playUrl}
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  >
                    <div className="rounded-full bg-primary p-3 text-white shadow-lg transform transition-transform group-hover:scale-110">
                      <FiPlay size={20} className="ml-0.5" />
                    </div>
                  </Link>
                </div>

                <CardBody className="p-3">
                  <Link href={detailUrl} className="hover:text-primary transition-colors">
                    <h3 className="line-clamp-1 text-sm font-semibold">{item.title}</h3>
                  </Link>

                  {item.media_type === "tv" && item.season && item.episode && (
                    <p className="mt-0.5 text-xs text-primary font-medium">
                      S{item.season} E{item.episode}
                      {item.episode_title && ` • ${item.episode_title}`}
                    </p>
                  )}

                  <p className="mt-1 text-[10px] text-zinc-500">
                    {new Date(item.watched_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
