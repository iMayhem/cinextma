"use client";

import useBreakpoints from "@/hooks/useBreakpoints";
import { Accordion, AccordionItem } from "@heroui/react";

const FAQS = [
  {
    title: "⚡ How does StreamAggregator find streams?",
    description:
      "StreamAggregator connects with multiple high-speed media providers across the web in real-time. When you open a title, our system queries all available sources, sorts them by stream quality and latency, and automatically selects the fastest, most reliable source for instant playback.",
  },
  {
    title: "🎬 What is the difference between Direct and Proxied sources?",
    description:
      "Direct sources (marked with a green badge ⚡) stream directly from ultra-fast content delivery networks (CDNs) to your browser for minimal latency. Proxied sources route through our backend proxy engine to seamlessly handle custom headers and CORS restrictions, ensuring maximum link availability.",
  },
  {
    title: "⏱️ How does Watch History work?",
    description:
      "When you create a free account and log in, your watch progress is automatically synchronized. You can resume movies, keep track of TV show seasons & episodes, and manage your viewing history from the History page anytime.",
  },
  {
    title: "💬 Are subtitles supported?",
    description:
      "Yes! Our video player includes automated multi-language subtitle integration. Click the subtitle (CC) button on the player controls to select your preferred language or load custom caption tracks.",
  },
  {
    title: "🔄 What should I do if a source buffers or fails to play?",
    description:
      "Simply open the 'Sources' panel on the right side of the video player (or top menu on mobile) and select another provider from the list. We provide multiple fallback streams in various resolutions (4K, 1080p, 720p) so you always have a working stream.",
  },
  {
    title: "🛡️ Is my account and data safe?",
    description:
      "StreamAggregator uses secure session authentication with industry-standard bcrypt password hashing. We do not track personal telemetry or sell user information.",
  },
];

const FAQ = () => {
  const { mobile } = useBreakpoints();

  return (
    <Accordion variant="splitted" isCompact={mobile} className="px-0">
      {FAQS.map(({ title, description }) => (
        <AccordionItem
          key={title}
          aria-label={title}
          title={<span className="text-sm font-semibold">{title}</span>}
          className="bg-default-50 border border-default-200/60 shadow-none hover:border-primary/40 transition"
        >
          <p className="text-xs sm:text-sm text-foreground-600 leading-relaxed pb-2">
            {description}
          </p>
        </AccordionItem>
      ))}
    </Accordion>
  );
};

export default FAQ;
