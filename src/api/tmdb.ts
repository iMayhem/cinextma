import { env } from "@/utils/env";
import { isEmpty } from "@/utils/helpers";
type TvListResult = {
  page: number;
  results: TV[];
  total_results: number;
  total_pages: number;
};

import type {
  MovieDetails,
  TvShowDetails,
  TV,
  SeasonDetails,
  MoviesPlayingNow,
  PopularMovies,
  TopRatedMovies,
  UpcomingMovies,
  MovieDiscoverResult,
  TvShowDiscoverResult,
  Genre,
  Images,
  Credits,
  Videos,
  SimilarMovies,
  SimilarTvShows,
  Recommendations,
} from "tmdb-ts";

const API = "https://api.themoviedb.org/3";
const key = env.NEXT_PUBLIC_TMDB_ACCESS_TOKEN;

if (isEmpty(key)) {
  throw new Error("TMDB_ACCESS_TOKEN is not defined");
}

export type AppendedMovie = MovieDetails & {
  images: Images;
  videos: Videos;
  credits: Credits;
  recommendations: Recommendations;
  similar: SimilarMovies;
  keywords: { keywords: any[] };
  reviews: { results: any[] };
};

export type AppendedTv = TvShowDetails & {
  images: Images;
  videos: Videos;
  credits: Credits;
  recommendations: Recommendations;
  similar: SimilarTvShows;
  keywords: { keywords: any[] };
  reviews: { results: any[] };
};

async function get<T>(path: string, params: Record<string, any> = {}): Promise<T> {
  const qs = new URLSearchParams({ api_key: key, ...params });
  const res = await fetch(`${API}${path}?${qs.toString()}`);
  if (!res.ok) throw new Error(`TMDB ${path}: ${res.status}`);
  return res.json();
}

export const tmdb = {
  movies: {
    details: (id: string | number, append?: string[]) =>
      get<AppendedMovie>(`/movie/${id}`, append ? { append_to_response: append.join(",") } : {}),
    popular: (options: Record<string, any> = {}) => get<PopularMovies>(`/movie/popular`, options),
    nowPlaying: (options: Record<string, any> = {}) =>
      get<MoviesPlayingNow>(`/movie/now_playing`, options),
    upcoming: (options: Record<string, any> = {}) =>
      get<UpcomingMovies>(`/movie/upcoming`, options),
    topRated: (options: Record<string, any> = {}) => get<TopRatedMovies>(`/movie/top_rated`, options),
  },
  tvShows: {
    details: (id: string | number, append?: string[]) =>
      get<AppendedTv>(`/tv/${id}`, append ? { append_to_response: append.join(",") } : {}),
    popular: (options: Record<string, any> = {}) => get<TvListResult>(`/tv/popular`, options),
    onTheAir: (options: Record<string, any> = {}) => get<TvListResult>(`/tv/on_the_air`, options),
    topRated: (options: Record<string, any> = {}) => get<TvListResult>(`/tv/top_rated`, options),
    season: (id: string | number, seasonNumber: string | number) =>
      get<SeasonDetails>(`/tv/${id}/season/${seasonNumber}`),
  },
  trending: {
    trending: (media: string, time: string, options: Record<string, any> = {}) =>
      get<any>(`/trending/${media}/${time}`, options),
  },
  search: {
    movies: (query: string | Record<string, any>, options: Record<string, any> = {}) =>
      get<any>(`/search/movie`, typeof query === "string" ? { query, ...options } : query),
    tvShows: (query: string | Record<string, any>, options: Record<string, any> = {}) =>
      get<any>(`/search/tv`, typeof query === "string" ? { query, ...options } : query),
  },
  discover: {
    movie: (options: Record<string, any> = {}) => get<MovieDiscoverResult>(`/discover/movie`, options),
    tvShow: (options: Record<string, any> = {}) => get<TvShowDiscoverResult>(`/discover/tv`, options),
  },
  genres: {
    movies: () => get<{ genres: Genre[] }>(`/genre/movie/list`),
    tvShows: () => get<{ genres: Genre[] }>(`/genre/tv/list`),
  },
};