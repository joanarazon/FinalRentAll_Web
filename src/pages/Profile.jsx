import React, { useEffect, useMemo, useState } from "react";
import { useUserContext } from "@/context/UserContext.jsx";
import { supabase } from "../../supabaseClient";
import { useToastApi } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Camera } from "lucide-react";
import TopMenu from "@/components/topMenu";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Profile() {
    const { user, loading, refresh } = useUserContext();
    const [search, setSearch] = useState("");
    const navigate = useNavigate();
    const toast = useToastApi();
    const [form, setForm] = useState({
        first_name: "",
        last_name: "",
        phone: "",
        dob: "",
    });
    const [uploading, setUploading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (user) {
            setForm({
                first_name: user.first_name || "",
                last_name: user.last_name || "",
                phone: user.phone || "",
                dob: user.dob || "",
            });
        }
    }, [user]);

    const initials = useMemo(() => {
        const f = (user?.first_name || "").trim();
        const l = (user?.last_name || "").trim();
        return `${f[0] || ""}${l[0] || ""}`.toUpperCase() || "U";
    }, [user]);

    const onUploadFace = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!user?.id) {
            toast.error("No user context");
            return;
        }
        try {
            setUploading(true);
            const picPath = `${user.id}/profile/${Date.now()}_${file.name}`;
            const { error: upErr } = await supabase.storage
                .from("user-profile-pic")
                .upload(picPath, file, { upsert: false });
            if (upErr) throw upErr;
            const { data: pub } = supabase.storage
                .from("user-profile-pic")
                .getPublicUrl(picPath);
            const publicUrl = pub?.publicUrl;
            if (!publicUrl) throw new Error("Could not get public URL");

            const { error: updErr } = await supabase
                .from("users")
                .update({ profile_pic_url: publicUrl })
                .eq("id", user.id);
            if (updErr) throw updErr;

            await refresh();
            toast.success("Profile picture updated");
        } catch (err) {
            console.error("Upload error:", err);
            toast.error("Failed to upload: " + err.message);
        } finally {
            setUploading(false);
        }
    };

    const onSave = async () => {
        if (!user?.id) return;
        try {
            setSaving(true);
            const payload = {
                first_name: form.first_name,
                last_name: form.last_name,
                phone: form.phone,
                dob: form.dob || null,
            };
            const { error } = await supabase
                .from("users")
                .update(payload)
                .eq("id", user.id);
            if (error) throw error;
            await refresh();
            toast.success("Profile saved");
        } catch (err) {
            console.error("Save error:", err);
            toast.error("Failed to save: " + err.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-6">Loading...</div>;
    if (!user) return <div className="p-6">Not signed in</div>;

    return (
        <div className="min-h-screen bg-[#FFFBF2]">
            <TopMenu
                activePage="profile"
                searchTerm={search}
                setSearchTerm={setSearch}
            />
            <div className="max-w-2xl mx-auto p-4">
                <div className="flex items-center gap-2 mb-4">
                    <Button
                        variant="ghost"
                        onClick={() =>
                            window.history.length > 1
                                ? navigate(-1)
                                : navigate("/home")
                        }
                        className="flex items-center gap-2"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Back
                    </Button>
                </div>
                <h1 className="text-2xl font-semibold mb-4">My Profile</h1>
                <div className="flex items-center gap-4 mb-6">
                    <div className="relative h-16 w-16">
                        <Avatar className="h-16 w-16">
                            <AvatarImage
                                src={
                                    user.profile_pic_url ||
                                    user.face_image_url ||
                                    ""
                                }
                                alt="Profile"
                            />
                            <AvatarFallback>{initials}</AvatarFallback>
                        </Avatar>
                        <input
                            id="face-upload-input"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={onUploadFace}
                        />
                        <button
                            type="button"
                            onClick={() =>
                                document
                                    .getElementById("face-upload-input")
                                    ?.click()
                            }
                            className="absolute -bottom-1 -right-1 bg-black/80 hover:bg-black text-white rounded-full p-1 shadow-md"
                            title={uploading ? "Uploading..." : "Change photo"}
                            disabled={uploading}
                        >
                            <Camera className="h-4 w-4" />
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        Recommended: clear face photo. Stored in
                        user-profile-pic.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">
                            First name
                        </label>
                        <input
                            className="w-full border rounded-lg px-3 py-2"
                            value={form.first_name}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    first_name: e.target.value,
                                }))
                            }
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">
                            Last name
                        </label>
                        <input
                            className="w-full border rounded-lg px-3 py-2"
                            value={form.last_name}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    last_name: e.target.value,
                                }))
                            }
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">
                            Phone
                        </label>
                        <input
                            className="w-full border rounded-lg px-3 py-2"
                            value={form.phone}
                            onChange={(e) =>
                                setForm((f) => ({
                                    ...f,
                                    phone: e.target.value,
                                }))
                            }
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-gray-600 mb-1">
                            Date of birth
                        </label>
                        <input
                            type="date"
                            className="w-full border rounded-lg px-3 py-2"
                            value={form.dob || ""}
                            onChange={(e) =>
                                setForm((f) => ({ ...f, dob: e.target.value }))
                            }
                        />
                    </div>
                </div>

                <div className="mt-6 flex gap-2">
                    <Button onClick={onSave} disabled={saving}>
                        {saving ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            </div>
        </div>
    );
}
