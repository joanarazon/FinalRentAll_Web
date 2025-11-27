import { useEffect, useState } from "react";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "../../supabaseClient";
import Swal from "sweetalert2";

export default function AddItemModal({
    open,
    onOpenChange,
    userId,
    onCreated,
}) {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        title: "",
        category_id: "",
        description: "",
        price_per_day: "",
        deposit_fee: "0",
        location: "",
        available: true,
        quantity: "1",
    });
    const [imageFile, setImageFile] = useState(null);

    useEffect(() => {
        if (!open) return;
        (async () => {
            const { data, error } = await supabase
                .from("categories")
                .select("category_id,name")
                .order("name");
            if (!error) setCategories(data || []);
        })();
    }, [open]);

    const onChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm((f) => ({
            ...f,
            [name]: type === "checkbox" ? checked : value,
        }));
    };

    const handleSubmit = async () => {
        if (!userId) {
            Swal.fire({
                icon: "info",
                title: "Sign in required",
                text: "You must be logged in to add an item.",
            });
            return;
        }

        // Comprehensive required field validation
        const errors = [];
        const trimmed = {
            title: form.title.trim(),
            category_id: String(form.category_id || "").trim(),
            description: form.description.trim(),
            price_per_day: form.price_per_day,
            deposit_fee: form.deposit_fee,
            location: form.location.trim(),
            quantity: form.quantity,
        };

        if (!trimmed.title) errors.push("Title is required");
        if (!trimmed.category_id) errors.push("Category is required");
        if (!trimmed.description) errors.push("Description is required");
        if (!trimmed.price_per_day) errors.push("Price per day is required");
        if (trimmed.price_per_day && Number(trimmed.price_per_day) <= 0)
            errors.push("Price per day must be greater than 0");
        if (!trimmed.deposit_fee && trimmed.deposit_fee !== "0")
            errors.push("Deposit fee is required (use 0 if none)");
        if (trimmed.deposit_fee && Number(trimmed.deposit_fee) < 0)
            errors.push("Deposit fee cannot be negative");
        if (!trimmed.quantity) errors.push("Quantity is required");
        if (trimmed.quantity && Number(trimmed.quantity) < 1)
            errors.push("Quantity must be at least 1");
        if (!trimmed.location) errors.push("Location is required");
        if (!imageFile) errors.push("Item image is required");

        if (errors.length) {
            Swal.fire({
                icon: "warning",
                title: "Please fix the following",
                html: `<ul style='text-align:left'>${errors
                    .map((e) => `<li>• ${e}</li>`)
                    .join("")}</ul>`,
            });
            return;
        }
        try {
            setLoading(true);

            // Step 1: Insert item; let DB generate item_id
            const basePayload = {
                user_id: userId,
                title: trimmed.title,
                description: trimmed.description,
                price_per_day: parseFloat(trimmed.price_per_day),
                deposit_fee: parseFloat(trimmed.deposit_fee || "0"),
                location: trimmed.location,
                available: !!form.available,
                category_id: Number(trimmed.category_id),
                main_image_url: null,
                quantity: Math.max(1, parseInt(trimmed.quantity, 10) || 1),
            };

            const { data: inserted, error: insertErr } = await supabase
                .from("items")
                .insert([basePayload])
                .select("item_id")
                .single();
            if (insertErr) throw insertErr;
            const itemId = inserted?.item_id;

            let publicUrl = null;

            // Step 2: If image provided, upload to Storage
            // Image is required (validated earlier)
            if (imageFile && itemId) {
                const path = `${userId}/${itemId}/${Date.now()}-${
                    imageFile.name
                }`;
                const { error: upErr } = await supabase.storage
                    .from("Items-photos")
                    .upload(path, imageFile, {
                        upsert: true,
                        cacheControl: "3600",
                    });
                if (upErr) {
                    console.warn("Image upload failed:", upErr.message);
                } else {
                    const { data: pub } = supabase.storage
                        .from("Items-photos")
                        .getPublicUrl(path);
                    publicUrl = pub?.publicUrl || null;

                    if (publicUrl) {
                        const { error: updateErr } = await supabase
                            .from("items")
                            .update({ main_image_url: publicUrl })
                            .eq("item_id", itemId);
                        if (updateErr) {
                            console.error(
                                "Failed to update item with image:",
                                updateErr.message
                            );
                        }
                    }
                }
            }

            // Step 3: Send notification to user about submission
            try {
                const { ItemNotifications } = await import(
                    "../lib/notifications"
                );
                await ItemNotifications.notifyItemSubmittedForReview(
                    userId,
                    itemId,
                    trimmed.title
                );
            } catch (notificationError) {
                console.error(
                    "Failed to send submission notification:",
                    notificationError
                );
            }

            // Step 4: Callback + UI reset
            onCreated?.({
                item_id: itemId,
                ...basePayload,
                main_image_url: publicUrl,
            });
            Swal.fire({
                icon: "success",
                title: "Item created",
                text: `Item created successfully and submitted for admin review${
                    publicUrl ? " (image uploaded)" : ""
                }`,
                timer: 3000,
                showConfirmButton: false,
            });

            setForm({
                title: "",
                category_id: "",
                description: "",
                price_per_day: "",
                deposit_fee: "0",
                location: "",
                available: true,
                quantity: "1",
            });
            setImageFile(null);
            onOpenChange(false);
        } catch (e) {
            console.error("Create item error:", e.message);
            Swal.fire({
                icon: "error",
                title: "Create failed",
                text: "Failed to create item: " + e.message,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="right"
                className="w-full sm:max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl"
            >
                <SheetHeader>
                    <SheetTitle>Add Product</SheetTitle>
                </SheetHeader>
                {/* Scrollable content area */}
                <div className="flex-1 overflow-y-auto px-4 pb-4 flex flex-col gap-3 min-h-0">
                    <label className="text-sm">
                        Title<span className="text-red-500">*</span>
                    </label>
                    <Input
                        name="title"
                        value={form.title}
                        onChange={onChange}
                        placeholder="e.g., Cordless Drill"
                    />

                    <label className="text-sm">
                        Category<span className="text-red-500">*</span>
                    </label>
                    <select
                        name="category_id"
                        value={form.category_id}
                        onChange={onChange}
                        className="border rounded-md px-3 py-2 text-sm"
                    >
                        <option value="">Select a category</option>
                        {categories.map((c) => (
                            <option key={c.category_id} value={c.category_id}>
                                {c.name}
                            </option>
                        ))}
                    </select>

                    <label className="text-sm">
                        Description<span className="text-red-500">*</span>
                    </label>
                    <textarea
                        name="description"
                        value={form.description}
                        onChange={onChange}
                        className="border rounded-md px-3 py-2 text-sm min-h-24"
                        placeholder="Condition, accessories, etc."
                    />
                    <div>
                        <label className="text-sm">
                            Price per day (₱)
                            <span className="text-red-500">*</span>
                        </label>
                        <Input
                            name="price_per_day"
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.price_per_day}
                            onChange={onChange}
                        />
                    </div>
                    <div>
                        <label className="text-sm">
                            Deposit fee (₱)
                            <span className="text-red-500">*</span>
                        </label>
                        <Input
                            name="deposit_fee"
                            type="number"
                            min="0"
                            step="0.01"
                            value={form.deposit_fee}
                            onChange={onChange}
                        />
                    </div>
                    <div>
                        <label className="text-sm">
                            Quantity<span className="text-red-500">*</span>
                        </label>
                        <Input
                            name="quantity"
                            type="number"
                            min="1"
                            step="1"
                            value={form.quantity}
                            onChange={onChange}
                        />
                    </div>

                    <label className="text-sm">
                        Location<span className="text-red-500">*</span>
                    </label>
                    <Input
                        name="location"
                        value={form.location}
                        onChange={onChange}
                        placeholder="City / Barangay"
                    />

                    <label className="text-sm">
                        Image<span className="text-red-500">*</span>
                    </label>
                    <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                            setImageFile(e.target.files?.[0] || null)
                        }
                    />
                    {imageFile && (
                        <p className="text-xs text-gray-500">
                            Selected: {imageFile.name}
                        </p>
                    )}
                </div>
                <SheetFooter className="border-t bg-white/60 backdrop-blur supports-[backdrop-filter]:bg-white/40 sticky bottom-0">
                    <Button
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => onOpenChange(false)}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button
                        className="cursor-pointer"
                        onClick={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? "Saving..." : "Save"}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    );
}
