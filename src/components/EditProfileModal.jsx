import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "../../supabaseClient";
import { useToastApi } from "@/components/ui/toast";

export default function EditProfileModal({
    open,
    onOpenChange,
    profile,
    onUpdated,
}) {
    const toast = useToastApi();
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        first_name: profile?.first_name || "",
        last_name: profile?.last_name || "",
        phone: profile?.phone || "",
        password: "",
    });

    useEffect(() => {
        setForm({
            first_name: profile?.first_name || "",
            last_name: profile?.last_name || "",
            phone: profile?.phone || "",
            password: "",
        });
    }, [profile]);

    const onChange = (e) => {
        const { name, value } = e.target;
        setForm((f) => ({ ...f, [name]: value }));
    };

    const save = async () => {
        setSaving(true);
        try {
            // Update user table fields
            const { error } = await supabase
                .from("users")
                .update({
                    first_name: form.first_name.trim() || null,
                    last_name: form.last_name.trim() || null,
                    phone: form.phone.trim() || null,
                })
                .eq("id", profile.id);
            if (error) throw error;

            // Update password if provided
            if (form.password.trim()) {
                const { error: pwError } = await supabase.auth.updateUser({
                    password: form.password.trim(),
                });
                if (pwError) throw pwError;
            }

            toast.success("Profile updated");
            onOpenChange(false);
            onUpdated?.();
        } catch (e) {
            toast.error(e.message || "Update failed");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-[#1E1E1E]">
                        Edit Profile
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-[#1E1E1E] mb-1.5">
                            First Name
                        </label>
                        <input
                            name="first_name"
                            value={form.first_name}
                            onChange={onChange}
                            className="w-full border border-[#1E1E1E]/20 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FFAB00] focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[#1E1E1E] mb-1.5">
                            Last Name
                        </label>
                        <input
                            name="last_name"
                            value={form.last_name}
                            onChange={onChange}
                            className="w-full border border-[#1E1E1E]/20 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FFAB00] focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[#1E1E1E] mb-1.5">
                            Phone Number
                        </label>
                        <input
                            name="phone"
                            value={form.phone}
                            onChange={onChange}
                            className="w-full border border-[#1E1E1E]/20 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FFAB00] focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-[#1E1E1E] mb-1.5">
                            New Password
                        </label>
                        <input
                            name="password"
                            type="password"
                            value={form.password}
                            onChange={onChange}
                            className="w-full border border-[#1E1E1E]/20 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#FFAB00] focus:border-transparent"
                            placeholder="Leave blank to keep current password"
                        />
                    </div>
                </div>
                <div className="mt-6 flex justify-end gap-3">
                    <Button
                        variant="outline"
                        className="cursor-pointer border-[#1E1E1E]/20 hover:bg-[#1E1E1E]/5 bg-transparent"
                        onClick={() => onOpenChange(false)}
                        disabled={saving}
                    >
                        Cancel
                    </Button>
                    <Button
                        className="cursor-pointer bg-[#FFAB00] hover:bg-[#FFAB00]/90 text-[#1E1E1E] font-medium"
                        onClick={save}
                        disabled={saving}
                    >
                        {saving ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
