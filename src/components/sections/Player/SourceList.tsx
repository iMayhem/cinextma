"use client";

import { ScrapedLink, qualityRank } from "@/utils/scrape";
import { cn } from "@/utils/helpers";
import { Spinner, Tooltip } from "@heroui/react";
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

const parseSizeBytes = (link: ScrapedLink): number => {
  if (typeof link.sizeBytes === "number" && link.sizeBytes > 0) {
    return link.sizeBytes;
  }
  const text = `${link.size || ""} ${link.server || ""}`;
  const match = text.match(/(\d+(?:\.\d+)?)\s*(TB|GB|MB|KB)\b/i);
  if (match) {
    const val = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    if (unit === "TB") return val * 1024 * 1024 * 1024 * 1024;
    if (unit === "GB") return val * 1024 * 1024 * 1024;
    if (unit === "MB") return val * 1024 * 1024;
    if (unit === "KB") return val * 1024;
  }
  return -1;
};

const cleanTitle = (link: ScrapedLink): string => {
  const base = link.server || link.providerKey || "Provider";
  return base.replace(SIZE_PATTERN, "").trim() || base;
};

const SourceList: React.FC<SourceListProps> = ({ links, selected, onSelect, loading }) => {
  const directCount = useMemo(() => links.filter((l) => l.direct).length, [links]);

  const rows = useMemo(
    () =>
      links
        .map((link, index) => ({ link, index }))
        .sort((a, b) => {
          // Sort ascending: smaller files & lower quality first, 4K/huge files downwards at the bottom
          const sa = parseSizeBytes(a.link);
          const sb = parseSizeBytes(b.link);
          if (sa > 0 && sb > 0 && sa !== sb) return sa - sb; // ascending size (bytes)
          if (sa > 0 && sb <= 0) return -1; // known size before unknown if both non-empty
          if (sb > 0 && sa <= 0) return 1;

          const qa = qualityRank(a.link.quality);
          const qb = qualityRank(b.link.quality);
          if (qa !== qb) return qa - qb; // ascending quality (360p -> 480p -> 720p -> 1080p -> 4K)

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
        <div className="flex items-center gap-2">
          {directCount > 0 && !loading && (
            <Tooltip
              content="Direct sources stream from CDN — faster and don't use server bandwidth"
              placement="left"
              size="sm"
            >
              <span className="cursor-help rounded-full bg-success-500/15 px-2 py-0.5 text-[10px] font-semibold text-success-500">
                ⚡ {directCount} direct
              </span>
            </Tooltip>
          )}
          {loading && (
            <span className="flex items-center gap-2 text-xs text-foreground-500">
              <Spinner size="sm" color="warning" variant="simple" />
              Searching…
            </span>
          )}
        </div>
      </div>

      {/* Legend */}
      {links.length > 0 && (
        <div className="flex gap-3 border-b border-default-100 pb-2 text-[10px] text-foreground-400">
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-success-500" /> Direct = from CDN
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-primary" /> Proxied = via server
          </span>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {rows.length === 0 && !loading && (
          <p className="px-1 text-xs text-foreground-500">No sources found yet.</p>
        )}
        {rows.map(({ link, index }) => {
          const isSelected = selected === index;
          const isDirect = Boolean(link.direct);
          return (
            <Tooltip
              key={`source-${index}`}
              content={
                isDirect
                  ? "✅ Direct — streams from CDN, zero server load"
                  : "🔁 Proxied — streams through server (adds custom headers)"
              }
              placement="left"
              size="sm"
              delay={600}
            >
              <button
                type="button"
                onClick={() => onSelect(index)}
                className={cn(
                  "flex items-start justify-between gap-3 rounded-lg border px-3 py-2 text-left transition",
                  isSelected
                    ? "border-warning bg-warning/10"
                    : "border-default-200 bg-default-100/50 hover:border-warning/60",
                )}
              >
                {/* Direct / Proxied dot indicator */}
                <span className="mt-0.5 shrink-0">
                  <span
                    className={cn(
                      "inline-block h-2 w-2 rounded-full",
                      isDirect ? "bg-success-500" : "bg-primary",
                    )}
                  />
                </span>

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
                  {isDirect && (
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
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
};

export default SourceList;
