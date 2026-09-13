"use client";

import { siteConfig } from "@/config/site";
import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Card, CardBody, Chip } from "@heroui/react";
import { 
  IoFlashOutline, 
  IoFilmOutline, 
  IoTimeOutline, 
  IoLayersOutline, 
  IoShieldCheckmarkOutline,
  IoSparklesOutline 
} from "react-icons/io5";

const FAQ = dynamic(() => import("@/components/sections/About/FAQ"));

const FEATURES = [
  {
    icon: <IoFlashOutline className="text-xl text-primary" />,
    title: "Multi-Source Aggregation",
    description: "Queries high-speed global providers in real-time to locate the fastest, most reliable 4K & 1080p stream links available.",
  },
  {
    icon: <IoFilmOutline className="text-xl text-primary" />,
    title: "Vast Catalog & Discovery",
    description: "Explore trending movies, top-rated TV series, actor filmographies, trailers, and genre filters powered by TMDB.",
  },
  {
    icon: <IoLayersOutline className="text-xl text-primary" />,
    title: "Smart Proxy & Direct Streaming",
    description: "Zero buffering with intelligent CDN direct links and automated HLS m3u8 proxy segment rewriting.",
  },
  {
    icon: <IoTimeOutline className="text-xl text-primary" />,
    title: "Watch History & Sync",
    description: "Never lose your place. Your watch activity, movie timestamps, and TV show episodes are automatically saved to your profile.",
  },
  {
    icon: <IoSparklesOutline className="text-xl text-primary" />,
    title: "Modern Netflix-Style Player",
    description: "Enjoy a cinema-grade video player with keyboard controls, multi-track subtitles, playback speeds, and source switching.",
  },
  {
    icon: <IoShieldCheckmarkOutline className="text-xl text-primary" />,
    title: "Fast & Clean Experience",
    description: "Designed from the ground up for speed, responsiveness on all devices, and an ad-free viewing experience.",
  },
];

export default function AboutContent() {
  return (
    <div className="flex w-full justify-center px-4 py-8 md:py-12">
      <div className="flex w-full max-w-4xl flex-col gap-10">
        {/* Hero Header */}
        <div className="flex flex-col items-center text-center gap-3">
          <Chip color="primary" variant="flat" size="sm" className="font-semibold px-3">
            About {siteConfig.name}
          </Chip>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
            Stream Everything in <span className="text-primary">One Place</span>
          </h1>
          <p className="max-w-2xl text-sm md:text-base text-foreground-500 leading-relaxed">
            {siteConfig.name} is a modern, high-performance media discovery and streaming aggregation platform designed to deliver instant access to movies and TV shows with zero hassle.
          </p>
        </div>

        {/* Features Grid */}
        <div className="flex flex-col gap-4">
          <h2 className="text-xl font-bold tracking-tight text-foreground-800">
            Why Choose {siteConfig.name}?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon, title, description }) => (
              <Card
                key={title}
                shadow="none"
                className="border border-default-200/70 bg-default-50/50 hover:bg-default-100/60 hover:border-primary/40 transition p-1"
              >
                <CardBody className="gap-2.5 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                    {icon}
                  </div>
                  <h3 className="text-sm font-bold text-foreground-900">{title}</h3>
                  <p className="text-xs text-foreground-500 leading-relaxed">
                    {description}
                  </p>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold tracking-tight text-foreground-800">
              Frequently Asked Questions
            </h2>
            <p className="text-xs text-foreground-500">
              Common questions about using {siteConfig.name} and stream playback.
            </p>
          </div>
          <Suspense>
            <FAQ />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
