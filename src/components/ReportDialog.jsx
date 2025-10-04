import React, { useMemo, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "../../supabaseClient";
import { useToastApi } from "@/components/ui/toast";

// Keep this list conservative to match complaint_reason_enum on the DB
const DEFAULT_REASONS = [
    "fraud",
    "harassment",
    "inappropriate",
    "spam",
    "other",
];

export default function ReportDialog({
    trigger,
    senderId,
    targetUserId,
    targetItemId,
    rentalId,
    reasons = DEFAULT_REASONS,
    title = "Report",
    description,
    onSubmitted,
    disabled,
}) {
    const toast = useToastApi();
    const [open, setOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [reason, setReason] = useState(
        reasons[reasons.length - 1] || "other"
    );
    const [content, setContent] = useState("");

    const canSubmit = useMemo(() => {
        return !!senderId && (!!targetUserId || !!targetItemId);
    }, [senderId, targetUserId, targetItemId]);

    const submit = async (e) => {
        e?.preventDefault?.();
        if (!canSubmit) return;
        try {
            setSubmitting(true);
            // Decide target table: items -> complaints, users -> user_complaints
            const isItemReport = !!targetItemId;
            const table = isItemReport ? "complaints" : "user_complaints";

            // Build payload specific to table shape
            const base = {
                sender_id: senderId,
                rental_id: rentalId || null,
                reason: reason || "other",
                content: content || null,
            };
            const payload = isItemReport
                ? {
                      ...base,
                      target_item_id: targetItemId,
                      target_user_id: targetUserId, // Include owner ID for item reports
                  }
                : { ...base, target_user_id: targetUserId };

            let { error } = await supabase.from(table).insert(payload);
            // Auto-fallback if reason is not part of the enum
            if (
                error &&
                typeof error.message === "string" &&
                /invalid input value for enum/i.test(error.message)
            ) {
                const retryPayload = { ...payload, reason: "other" };
                const retry = await supabase.from(table).insert(retryPayload);
                error = retry.error;
                if (!error) {
                    toast.info("Reason not supported. Saved under 'other'.");
                }
            }
            if (error) throw error;
            toast.success("Report submitted. Our team will review.");
            setOpen(false);
            setContent("");
            setReason(reasons[reasons.length - 1] || "other");
            onSubmitted?.();
        } catch (err) {
            console.error("Report submit failed:", err);
            toast.error(
                err?.message?.includes("invalid input value for enum")
                    ? "Report failed: unsupported reason. Please try 'other'."
                    : err?.message || "Report failed"
            );
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {React.cloneElement(trigger, { disabled: disabled })}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                {description && (
                    <p className="text-sm text-gray-600 mb-2">{description}</p>
                )}
                {!senderId ? (
                    <p className="text-sm text-amber-700">
                        Please sign in to report.
                    </p>
                ) : (
                    <form onSubmit={submit} className="space-y-3">
                        <div className="flex items-center gap-2">
                            <label className="text-sm w-24">Reason</label>
                            <select
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="border rounded px-2 py-1 text-sm flex-1"
                            >
                                {reasons.map((r) => (
                                    <option key={r} value={r}>
                                        {r}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-sm block mb-1">
                                Details (optional)
                            </label>
                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                rows={4}
                                className="w-full border rounded p-2 text-sm"
                                placeholder="Provide context, screenshots, or specifics"
                            />
                        </div>
                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                className="cursor-pointer"
                                onClick={() => setOpen(false)}
                                disabled={submitting}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={!canSubmit || submitting}
                            >
                                {submitting ? "Submitting…" : "Submit Report"}
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
