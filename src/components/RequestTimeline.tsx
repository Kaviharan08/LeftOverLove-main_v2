import { CheckCircle, Circle, Clock } from "lucide-react";

// Volunteer delivery flow
const VOLUNTEER_STEPS = [
  { key: "accepted",            label: "Accepted" },
  { key: "volunteer_requested", label: "Volunteer Requested" },
  { key: "volunteer_accepted",  label: "Volunteer On Way" },
  { key: "picked_up",           label: "Picked Up" },
  { key: "delivered",           label: "Delivered" },
  { key: "confirmed",           label: "Completed" },
];

// Self-pickup flow (receiver comes themselves)
const SELF_STEPS = [
  { key: "accepted",  label: "Accepted" },
  { key: "confirmed", label: "Picked Up & Done" },
];

function getSteps(req: { self_pickup?: boolean; volunteer_id?: string | null; status: string }) {
  // Use self-pickup steps if:
  // 1. self_pickup flag is true, OR
  // 2. No volunteer was ever assigned and status is confirmed (completed without volunteer)
  const isSelfPickup =
    req.self_pickup === true ||
    (!req.volunteer_id && req.status === "confirmed");
  return isSelfPickup ? SELF_STEPS : VOLUNTEER_STEPS;
}

function stepIndex(status: string, steps: typeof VOLUNTEER_STEPS) {
  // "confirmed" is always the last step regardless of flow
  if (status === "confirmed") return steps.length - 1;
  const idx = steps.findIndex((s) => s.key === status);
  return idx === -1 ? 0 : idx;
}

interface Props {
  status: string;
  selfPickup?: boolean;
  volunteerId?: string | null;
}

export function RequestTimeline({ status, selfPickup, volunteerId }: Props) {
  const steps = getSteps({ self_pickup: selfPickup, volunteer_id: volunteerId, status });
  const current = stepIndex(status, steps);

  return (
    <div className="w-full overflow-x-auto pb-1">
      <div className="flex items-center min-w-max gap-0">
        {steps.map((step, i) => {
          const done = i < current;
          const active = i === current;
          return (
            <div key={step.key} className="flex items-center">
              {/* connector line */}
              {i > 0 && (
                <div
                  className={`h-0.5 w-8 sm:w-12 transition-colors duration-500 ${
                    done ? "bg-primary" : "bg-border"
                  }`}
                />
              )}
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                    done
                      ? "border-primary bg-primary text-primary-foreground"
                      : active
                      ? "border-primary bg-primary/10 text-primary scale-110"
                      : "border-border bg-muted text-muted-foreground"
                  }`}
                >
                  {done ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : active ? (
                    <Clock className="h-3.5 w-3.5 pulse-dot" />
                  ) : (
                    <Circle className="h-3.5 w-3.5" />
                  )}
                </div>
                <span
                  className={`text-[10px] max-w-[64px] text-center leading-tight ${
                    active
                      ? "font-semibold text-primary"
                      : done
                      ? "text-primary/70"
                      : "text-muted-foreground"
                  }`}
                >
                  {step.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
