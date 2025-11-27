import { Clock, CheckCircle2, Truck, PackageCheck } from "lucide-react";
import {
    Tooltip,
    TooltipTrigger,
    TooltipContent,
} from "@/components/ui/tooltip";

const STEPS = [
    { key: "pending", label: "Pending", icon: Clock },
    { key: "confirmed", label: "Confirmed", icon: CheckCircle2 },
    { key: "deposit_submitted", label: "Deposit", icon: CheckCircle2 },
    { key: "on_the_way", label: "On the way", icon: Truck },
    { key: "ongoing", label: "Ongoing", icon: PackageCheck },
    {
        key: "awaiting_owner_confirmation",
        label: "Returned",
        icon: CheckCircle2,
    },
    { key: "completed", label: "Completed", icon: CheckCircle2 },
];

export function BookingSteps({
    status,
    compact = false,
    timestamps = {},
    labelsOverride = null,
}) {
    const s = String(status || "").toLowerCase();
    if (!s) return null;
    const idxS = STEPS.findIndex((st) => st.key === s);

    return (
        <div
            className={
                "mt-2 w-full flex items-center gap-2 " +
                (compact ? "opacity-80" : "")
            }
        >
            {STEPS.map(({ key, label }, i) => {
                const displayLabel = labelsOverride?.[key] || label;
                const active = idxS === i;
                const passed = idxS > i;
                const ts = timestamps?.[key];
                const tip = ts ? new Date(ts).toLocaleString() : displayLabel;

                // Circle styles
                const circleBase =
                    "rounded-full border-2 w-3 h-3 sm:w-4 sm:h-4";
                const circleCls = active
                    ? "bg-[#FFAB00] border-amber-300"
                    : passed
                    ? "bg-amber-500 border-amber-500"
                    : "bg-white border-gray-300";

                // Connector line styles (between this step and the next)
                const lineBase = "flex-1 h-[2px] sm:h-[3px] rounded-full";
                const lineCls = idxS > i ? "bg-amber-300" : "bg-gray-200";

                return (
                    <div
                        key={key}
                        className="flex items-center gap-2 min-w-0 flex-1"
                    >
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <span
                                    aria-label={displayLabel}
                                    className={`${circleBase} ${circleCls}`}
                                />
                            </TooltipTrigger>
                            <TooltipContent sideOffset={6}>
                                {tip}
                            </TooltipContent>
                        </Tooltip>
                        {i < STEPS.length - 1 && (
                            <span className={`${lineBase} ${lineCls}`} />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export function ProgressLegend() {
    return (
        <div className="flex flex-wrap items-center gap-2 text-xs">
            {STEPS.map(({ key, label, icon: Icon }) => (
                <span
                    key={key}
                    className="border bg-white text-gray-600 border-gray-200 px-2 py-0.5 rounded-md inline-flex items-center gap-1"
                >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{label}</span>
                </span>
            ))}
        </div>
    );
}
