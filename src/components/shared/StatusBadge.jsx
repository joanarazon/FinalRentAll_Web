import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status, className = "" }) {
    const s = String(status || "").toLowerCase();
    const map = {
        pending: "bg-amber-100 text-amber-800 border-amber-200",
        confirmed: "bg-green-100 text-green-800 border-green-200",
        deposit_submitted: "bg-blue-100 text-blue-800 border-blue-200",
        on_the_way: "bg-blue-100 text-blue-800 border-blue-200",
        ongoing: "bg-green-100 text-green-800 border-green-200",
        awaiting_owner_confirmation:
            "bg-purple-100 text-purple-800 border-purple-200",
        completed: "bg-emerald-100 text-emerald-800 border-emerald-200",
        expired: "bg-gray-100 text-gray-700 border-gray-200",
        cancelled: "bg-red-100 text-red-800 border-red-200",
        rejected: "bg-red-100 text-red-800 border-red-200",
    };
    const cls = map[s] || "bg-gray-100 text-gray-700 border-gray-200";
    return (
        <Badge
            variant="secondary"
            className={`capitalize border ${cls} ${className}`}
        >
            {s.replaceAll("_", " ")}
        </Badge>
    );
}
