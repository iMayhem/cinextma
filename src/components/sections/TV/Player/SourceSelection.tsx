import { PlayersProps } from "@/types";
import VaulDrawer from "@/components/ui/overlay/VaulDrawer";
import { HandlerType } from "@/types/component";
import { cn } from "@/utils/helpers";
import { Ads, Clock, Rocket, Star } from "@/utils/icons";

interface TvShowPlayerSourceSelectionProps extends HandlerType {
  players: PlayersProps[];
  selectedSource: number;
  setSelectedSource: (source: number) => void;
}

const pingColor = (ping: number) =>
  ping < 500
    ? "bg-success-500/15 text-success-500"
    : ping < 1500
      ? "bg-warning-500/15 text-warning-500"
      : "bg-danger-500/15 text-danger-500";

const TvShowPlayerSourceSelection: React.FC<TvShowPlayerSourceSelectionProps> = ({
  opened,
  onClose,
  players,
  selectedSource,
  setSelectedSource,
}) => {
  return (
    <VaulDrawer
      open={opened}
      onClose={onClose}
      backdrop="blur"
      title="Select Source"
      direction="right"
      hiddenHandler
      withCloseButton
      classNames={{ content: "space-y-0" }}
    >
      <div className="flex flex-col gap-4 p-5">
        <div className="space-y-2 px-1 py-2">
          <div className="flex items-center gap-2">
            <Star className="text-warning-500" />
            <span>Recommended</span>
          </div>
          <div className="flex items-center gap-2">
            <Rocket className="text-danger-500" />
            <span>Fast hosting</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="text-success-500" />
            <span>Watch Progress Support</span>
          </div>
          <div className="flex items-center gap-2">
            <Ads className="text-primary-500" />
            <span>May contain popup ads</span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {players.map((p, index) => {
            const selected = selectedSource === index;
            return (
              <button
                key={`source-${index}`}
                type="button"
                onClick={() => {
                  setSelectedSource(index);
                  onClose();
                }}
                className={cn(
                  "flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-left transition",
                  selected
                    ? "border-warning bg-warning/10"
                    : "border-default-200 bg-default-50 hover:border-warning/60",
                )}
              >
                <span className="min-w-0 flex-1 text-sm font-medium leading-snug break-words">
                  {p.title}
                </span>
                <span className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                  {p.size && (
                    <span className="rounded-full bg-default-100 px-2 py-0.5 text-[10px] font-semibold">
                      {p.size}
                    </span>
                  )}
                  {typeof p.ping === "number" && (
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        pingColor(p.ping),
                      )}
                    >
                      {p.ping}ms
                    </span>
                  )}
                  {p.recommended && <Star className="text-warning" />}
                  {p.fast && <Rocket className="text-danger" />}
                  {p.resumable && <Clock className="text-success" />}
                  {p.ads && <Ads className="text-primary" />}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </VaulDrawer>
  );
};

export default TvShowPlayerSourceSelection;