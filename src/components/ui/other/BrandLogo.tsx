"use client";

import Link from "next/link";
import { Saira } from "@/utils/fonts";
import { cn } from "@/utils/helpers";
import useDiscoverFilters from "@/hooks/useDiscoverFilters";

export interface BrandLogoProps {
  animate?: boolean;
  className?: string;
}

const BrandLogo: React.FC<BrandLogoProps> = ({ animate = false, className }) => {
  const { content } = useDiscoverFilters();

  return (
    <Link href="/" className="group">
      <span
        className={cn(
          "flex items-center bg-linear-to-r from-transparent from-80% via-white to-transparent bg-size-[200%_100%] bg-clip-text bg-position-[40%] text-sm font-semibold text-foreground/60 md:text-base",
          "tracking-wider transition-[letter-spacing] group-hover:tracking-[0.1em]",
          {
            "animate-shine": animate,
            "text-foreground": !animate,
          },
          Saira.className,
          className,
        )}
      >
        STREAM
        <span
          className={cn("transition-colors", {
            "text-primary": content === "movie",
            "text-warning": content === "tv",
          })}
        >
          AGGREGATOR
        </span>
      </span>
    </Link>
  );
};

export default BrandLogo;
