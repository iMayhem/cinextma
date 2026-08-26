"use client";

import { ScrapedLink, qualityRank } from "@/utils/scrape";
import { cn } from "@/utils/helpers";
import { Spinner } from "@heroui/react";
import { useMemo } from "react";

interface SourceListProps {
  links: ScrapedLink[];
  selected: number;
  onSelect: (index: number) => void;
  loading: boolean;
}

const pingColor = (ping: number) =>
  ping < 500
    ? "bg-success-500/15 text-success-500"
    : ping < 1500
      ? "bg-warning-500/15 text-warning-500"
      : "bg-danger-500/15 text-danger-500";

const SIZE_PATTERN = /\s*\d+(?:\.\d+)?\s*(TB|GB|MB|KB)\b/gi;

const cleanTitle = (link: ScrapedLink): string => {
  const base = link.server || link.providerKey || "Provider";
  return base.replace(SIZE_PATTERN, "").trim() || base;
};

const SourceList: React.FC<SourceListProps> = ({ links, selected, onSelect, loading }) => {
  const rows = useMemo(
    () =>
      links
        .map((link, index) => ({ link, index }))
        .sort((a, b) => {
          const sa = a.link.sizeBytes ?? -1;
          const sb = b.link.sizeBytes ?? -1;
          if (sa !== sb) return sb - sa;
          const qa = qualityRank(a.link.quality);
          const qb = qualityRank(b.link.quality);
          if (qa !== qb) return qb - qa;
          return (a.link.latencyMs ?? Infinity) - (b.link.latencyMs ?? Infinity);
        }),
    [links],
  );

  return (
    <div className="flex min-h-0 flex-col gap-3 rounded-xl border border-default-200 bg-default-50 p-3 md:h-full">
      <div className="flex items-center justify-between px-1">
        <span className="text-sm font-semibold">
          Sources{links.length > 0 && <span className="text-foreground-500"> · {links.length}</span>}
        </span>
        {loading && (
          <span className="flex items-center gap-2 text-xs text-foreground-500">
            <Spinner size="sm" color="warning" variant="simple" />
            Searching providers…
          </span>
        )}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {rows.length === 0 && !loading && (
          <p className="px-1 text-xs text-foreground-500">No sources found yet.</p>
        )}
        {rows.map(({ link, index }) => {
          const isSelected = selected === index;
          return (
            <button
              key={`source-${index}`}
              type="button"
              onClick={() => onSelect(index)}
              className={cn(
                "flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-left transition",
                isSelected
                  ? "border-warning bg-warning/10"
                  : "border-default-200 bg-default-100/50 hover:border-warning/60",
              )}
            >
              <span className="min-w-0 flex-1 text-xs font-medium leading-snug break-words">
                {cleanTitle(link)}
              </span>
              <span className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                {link.quality && link.quality !== "Auto" && (
                  <span className="rounded-full bg-default-100 px-1.5 py-0.5 text-[9px] font-semibold">
                    {link.quality}
                  </span>
                )}
                {link.size && (
                  <span className="rounded-full bg-default-100 px-1.5 py-0.5 text-[9px] font-semibold">
                    {link.size}
                  </span>
                )}
                {link.direct && (
                  <span className="rounded-full bg-success-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-success-500">
                    Direct
                  </span>
                )}
                {typeof link.latencyMs === "number" && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
                      pingColor(link.latencyMs),
                    )}
                  >
                    {link.latencyMs}ms
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default SourceList;