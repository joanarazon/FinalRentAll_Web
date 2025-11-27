import React, { useEffect, useState, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import TopMenu from "../components/topMenu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Image, ArrowLeft, Clock, CheckCheck } from "lucide-react";

const Chat = ({ favorites, searchTerm, setSearchTerm }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    // Get parameters from URL
    const searchParams = new URLSearchParams(location.search);
    const conversationId = searchParams.get("conversationId");
    const otherUserId = searchParams.get("otherUserId");
    const itemId = searchParams.get("itemId");

    // State
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [selectedImage, setSelectedImage] = useState(null);
    const [showImageModal, setShowImageModal] = useState(false);
    const [otherUserProfile, setOtherUserProfile] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [otherUserName, setOtherUserName] = useState("");
    const [itemTitle, setItemTitle] = useState("");
    const [uploadingImages, setUploadingImages] = useState({});
    const [isOnline, setIsOnline] = useState(false);

    // Scroll to bottom
    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    // Get current user
    useEffect(() => {
        const getCurrentUser = async () => {
            try {
                const {
                    data: { user },
                    error,
                } = await supabase.auth.getUser();
                if (error) {
                    console.error("Error getting user:", error);
                    return;
                }
                setCurrentUser(user);
            } catch (error) {
                console.error("Error in getCurrentUser:", error);
            }
        };
        getCurrentUser();
    }, []);

    // Fetch other user profile
    const fetchOtherUserProfile = useCallback(async () => {
        try {
            if (otherUserId) {
                const { data: otherUserData, error: otherUserError } =
                    await supabase
                        .from("users")
                        .select(
                            "id, first_name, last_name, profile_pic_url, face_image_url"
                        )
                        .eq("id", otherUserId)
                        .single();

                if (!otherUserError && otherUserData) {
                    setOtherUserProfile(otherUserData);
                    setOtherUserName(
                        `${otherUserData.first_name} ${otherUserData.last_name}`
                    );
                    // Simulate online status (you can implement real presence detection)
                    setIsOnline(Math.random() > 0.3);
                }
            }
        } catch (error) {
            console.error("Error fetching other user profile:", error);
        }
    }, [otherUserId]);

    // Fetch item details
    const fetchItemDetails = useCallback(async () => {
        try {
            if (itemId) {
                const { data: itemData, error: itemError } = await supabase
                    .from("items")
                    .select("title, price_per_day")
                    .eq("item_id", itemId)
                    .single();

                if (!itemError && itemData) {
                    setItemTitle(itemData.title);
                }
            }
        } catch (error) {
            console.error("Error fetching item details:", error);
        }
    }, [itemId]);

    // Mark messages as read
    const markMessagesAsRead = useCallback(async () => {
        if (!currentUser?.id || !conversationId) return;

        try {
            const { data: unreadMessages, error: checkError } = await supabase
                .from("messages")
                .select("id, sender_id, content, read_at, conversation_id")
                .eq("conversation_id", conversationId)
                .neq("sender_id", currentUser.id)
                .is("read_at", null);

            if (checkError) {
                console.error("Error checking unread messages:", checkError);
                return;
            }

            if (!unreadMessages || unreadMessages.length === 0) {
                return;
            }

            const messageIds = unreadMessages.map((msg) => msg.id);

            const { data, error } = await supabase
                .from("messages")
                .update({ read_at: new Date().toISOString() })
                .in("id", messageIds)
                .select("id, read_at");

            if (error) {
                console.error("Error marking messages as read:", error);
                return;
            }
        } catch (error) {
            console.error("Error in markMessagesAsRead:", error);
        }
    }, [currentUser?.id, conversationId]);

    // Upload image to Supabase Storage
    const uploadImage = async (file) => {
        try {
            const fileName = `${currentUser.id}_${Date.now()}.jpg`;

            const { data, error } = await supabase.storage
                .from("chat-images")
                .upload(`public/${fileName}`, file, {
                    contentType: file.type,
                    upsert: true,
                });

            if (error) {
                console.error("Upload error:", error);
                return null;
            }

            const { data: publicUrlData } = supabase.storage
                .from("chat-images")
                .getPublicUrl(`public/${fileName}`);

            return publicUrlData.publicUrl;
        } catch (err) {
            console.error("Error uploading image:", err);
            return null;
        }
    };

    // Handle image upload
    const handleImageUpload = async (event) => {
        const file = event.target.files[0];
        if (!file || !currentUser) return;

        setUploadingImage(true);

        try {
            // Create temporary message
            const tempMessageId = `temp_${Date.now()}`;
            const tempMessage = {
                id: tempMessageId,
                conversation_id: conversationId,
                sender_id: currentUser.id,
                content: "",
                image_url: URL.createObjectURL(file),
                message_type: "image",
                created_at: new Date().toISOString(),
                read_at: null,
                is_uploading: true,
            };

            setMessages((prev) => [...prev, tempMessage]);
            setUploadingImages((prev) => ({ ...prev, [tempMessageId]: true }));

            const imageUrl = await uploadImage(file);

            if (!imageUrl) {
                throw new Error("Failed to upload image");
            }

            const { data: messageData, error: messageError } = await supabase
                .from("messages")
                .insert([
                    {
                        conversation_id: conversationId,
                        sender_id: currentUser.id,
                        content: "",
                        image_url: imageUrl,
                        message_type: "image",
                    },
                ])
                .select()
                .single();

            if (messageError) throw messageError;

            await supabase
                .from("conversations")
                .update({
                    last_message: "📷 Image",
                    last_message_at: new Date().toISOString(),
                })
                .eq("id", conversationId);

            setMessages((prev) => {
                const filtered = prev.filter((msg) => msg.id !== tempMessageId);
                const messageExists = filtered.some(
                    (msg) => msg.id === messageData.id
                );
                if (!messageExists) {
                    return [
                        ...filtered,
                        { ...messageData, is_uploading: false },
                    ];
                }
                return filtered;
            });

            setUploadingImages((prev) => {
                const newState = { ...prev };
                delete newState[tempMessageId];
                return newState;
            });
        } catch (error) {
            console.error("Error sending image:", error);
            setMessages((prev) =>
                prev.filter((msg) => msg.id !== tempMessageId)
            );
            setUploadingImages((prev) => {
                const newState = { ...prev };
                delete newState[tempMessageId];
                return newState;
            });
            import("sweetalert2").then(({ default: Swal }) =>
                Swal.fire({
                    icon: "error",
                    title: "Failed",
                    text: "Failed to send image. Please try again.",
                })
            );
        } finally {
            setUploadingImage(false);
            event.target.value = "";
        }
    };

    // Fetch messages
    const fetchMessages = useCallback(async () => {
        if (!conversationId) return;

        try {
            const { data, error } = await supabase
                .from("messages")
                .select(
                    `
                    id,
                    conversation_id,
                    sender_id,
                    content,
                    image_url,
                    message_type,
                    created_at,
                    read_at
                `
                )
                .eq("conversation_id", conversationId)
                .order("created_at", { ascending: true });

            if (error) {
                console.error("Error fetching messages:", error);
                return;
            }

            setMessages(data || []);
        } catch (error) {
            console.error("Error in fetchMessages:", error);
        } finally {
            setLoading(false);
        }
    }, [conversationId]);

    // Send text message
    const sendMessage = async () => {
        if (!newMessage.trim() || !currentUser || sending) return;

        const messageContent = newMessage.trim();
        setNewMessage("");
        setSending(true);

        try {
            const { data: messageData, error: messageError } = await supabase
                .from("messages")
                .insert([
                    {
                        conversation_id: conversationId,
                        sender_id: currentUser.id,
                        content: messageContent,
                        message_type: "text",
                    },
                ])
                .select()
                .single();

            if (messageError) {
                console.error("Error sending message:", messageError);
                throw messageError;
            }

            await supabase
                .from("conversations")
                .update({
                    last_message: messageContent,
                    last_message_at: new Date().toISOString(),
                })
                .eq("id", conversationId);
        } catch (error) {
            console.error("Error sending message:", error);
            import("sweetalert2").then(({ default: Swal }) =>
                Swal.fire({
                    icon: "error",
                    title: "Failed",
                    text: "Failed to send message. Please try again.",
                })
            );
            setNewMessage(messageContent);
        } finally {
            setSending(false);
        }
    };

    // Format message time
    const formatMessageTime = (timestamp) => {
        const messageTime = new Date(timestamp);
        const now = new Date();

        if (messageTime.toDateString() === now.toDateString()) {
            return messageTime.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
            });
        } else {
            return messageTime.toLocaleDateString([], {
                month: "short",
                day: "numeric",
            });
        }
    };

    // Check if message is uploading
    const isMessageUploading = (messageId) => {
        return uploadingImages[messageId] || false;
    };

    // Handle Enter key press
    const handleKeyPress = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // Effects
    useEffect(() => {
        if (currentUser && conversationId) {
            fetchMessages();
            fetchOtherUserProfile();
            fetchItemDetails();
        }
    }, [
        currentUser,
        conversationId,
        fetchMessages,
        fetchOtherUserProfile,
        fetchItemDetails,
    ]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (messages.length > 0 && currentUser?.id && conversationId) {
            markMessagesAsRead();
        }
    }, [messages.length, currentUser?.id, conversationId, markMessagesAsRead]);

    // Real-time subscription
    useEffect(() => {
        if (!conversationId || !currentUser?.id) return;

        const channel = supabase
            .channel(`chat_${conversationId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages",
                    filter: `conversation_id=eq.${conversationId}`,
                },
                (payload) => {
                    const newMessage = payload.new;
                    setMessages((prev) => {
                        const messageExists = prev.some(
                            (m) => m.id === newMessage.id
                        );
                        if (!messageExists) {
                            return [...prev, newMessage];
                        }
                        return prev;
                    });

                    if (newMessage.sender_id !== currentUser.id) {
                        setTimeout(() => {
                            markMessagesAsRead();
                        }, 500);
                    }
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "UPDATE",
                    schema: "public",
                    table: "messages",
                    filter: `conversation_id=eq.${conversationId}`,
                },
                (payload) => {
                    const updatedMessage = payload.new;
                    setMessages((prev) =>
                        prev.map((msg) =>
                            msg.id === updatedMessage.id ? updatedMessage : msg
                        )
                    );
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [conversationId, currentUser?.id, markMessagesAsRead]);

    if (!currentUser) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
                <TopMenu
                    activePage="chat"
                    favorites={favorites}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                />
                <div className="flex-1 flex items-center justify-center">
                    <p>Please log in to view messages</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
            <TopMenu
                activePage="chat"
                favorites={favorites}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
            />

            {/* Full Width Chat Container */}
            <div className="w-full h-[calc(100vh-80px)] bg-white shadow-xl">
                {/* Header */}
                <div className="bg-white border-b border-gray-200 p-4 shadow-sm">
                    <div className="flex items-center space-x-4 max-w-7xl mx-auto">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate("/inbox")}
                            className="hover:bg-gray-100"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>

                        <Avatar className="w-12 h-12 border-2 border-white shadow-sm">
                            <AvatarImage
                                src={
                                    otherUserProfile?.profile_pic_url ||
                                    otherUserProfile?.face_image_url
                                }
                                alt={otherUserName}
                            />
                            <AvatarFallback className="bg-gradient-to-br from-orange-500 to-amber-500 text-white font-semibold">
                                {otherUserName?.charAt(0)?.toUpperCase()}
                            </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                                <h1 className="font-bold text-lg text-gray-800 truncate">
                                    {otherUserName}
                                </h1>
                                {isOnline && (
                                    <Badge
                                        variant="secondary"
                                        className="bg-green-100 text-green-700 text-xs"
                                    >
                                        Online
                                    </Badge>
                                )}
                            </div>
                            <p className="text-sm text-gray-600 truncate flex items-center">
                                <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                                {itemTitle}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Messages Area - Full Width */}
                <div className="flex-1 overflow-hidden flex flex-col bg-gradient-to-b from-white to-orange-50/30 h-[calc(100%-140px)]">
                    {loading ? (
                        // Modern loading skeleton
                        <div className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
                            {[...Array(8)].map((_, index) => (
                                <div
                                    key={index}
                                    className={`flex ${
                                        index % 2 === 0
                                            ? "justify-start"
                                            : "justify-end"
                                    } space-x-3`}
                                >
                                    {index % 2 === 0 && (
                                        <Skeleton className="w-10 h-10 rounded-full" />
                                    )}
                                    <div
                                        className={`max-w-md ${
                                            index % 2 === 0
                                                ? "bg-gray-100"
                                                : "bg-orange-500"
                                        } rounded-2xl p-4`}
                                    >
                                        <Skeleton className="h-4 w-48 mb-2" />
                                        <Skeleton className="h-3 w-32" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto p-6 space-y-4 max-w-7xl mx-auto w-full">
                            {messages.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4 h-full">
                                    <div className="w-24 h-24 bg-gradient-to-br from-orange-100 to-amber-100 rounded-full flex items-center justify-center">
                                        <Send className="h-10 w-10 text-orange-500" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-semibold text-gray-800 mb-2">
                                            No messages yet
                                        </h3>
                                        <p className="text-gray-600 max-w-sm">
                                            Start the conversation by sending a
                                            message about {itemTitle}
                                        </p>
                                    </div>
                                </div>
                            ) : (
                                messages.map((message, index) => {
                                    const isMyMessage =
                                        message.sender_id === currentUser.id;
                                    const showTimestamp =
                                        index === 0 ||
                                        new Date(message.created_at) -
                                            new Date(
                                                messages[index - 1].created_at
                                            ) >
                                            300000;
                                    const isUploading =
                                        isMessageUploading(message.id) ||
                                        message.is_uploading;

                                    return (
                                        <div key={message.id}>
                                            {showTimestamp && (
                                                <div className="text-center my-6">
                                                    <Badge
                                                        variant="outline"
                                                        className="bg-white/80 backdrop-blur-sm"
                                                    >
                                                        <Clock className="h-3 w-3 mr-1" />
                                                        {formatMessageTime(
                                                            message.created_at
                                                        )}
                                                    </Badge>
                                                </div>
                                            )}
                                            <div
                                                className={`flex items-end space-x-2 ${
                                                    isMyMessage
                                                        ? "justify-end"
                                                        : "justify-start"
                                                }`}
                                            >
                                                {!isMyMessage && (
                                                    <Avatar className="w-8 h-8">
                                                        <AvatarImage
                                                            src={
                                                                otherUserProfile?.profile_pic_url ||
                                                                otherUserProfile?.face_image_url
                                                            }
                                                            alt={otherUserName}
                                                        />
                                                        <AvatarFallback className="text-xs bg-gray-200">
                                                            {otherUserName
                                                                ?.charAt(0)
                                                                ?.toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                )}

                                                <div
                                                    className={`max-w-md px-4 py-3 rounded-2xl relative ${
                                                        isMyMessage
                                                            ? "bg-gradient-to-br from-orange-500 to-amber-500 text-white rounded-br-none shadow-lg"
                                                            : "bg-white text-gray-800 rounded-bl-none shadow-sm border border-gray-100"
                                                    } ${
                                                        isUploading
                                                            ? "opacity-70"
                                                            : ""
                                                    }`}
                                                >
                                                    {message.message_type ===
                                                        "image" &&
                                                    (message.image_url ||
                                                        isUploading) ? (
                                                        <div className="relative">
                                                            <img
                                                                src={
                                                                    message.image_url
                                                                }
                                                                alt="Shared image"
                                                                className="rounded-xl max-w-full h-48 object-cover cursor-pointer hover:opacity-95 transition-opacity"
                                                                onClick={() => {
                                                                    if (
                                                                        !isUploading &&
                                                                        message.image_url
                                                                    ) {
                                                                        setSelectedImage(
                                                                            message.image_url
                                                                        );
                                                                        setShowImageModal(
                                                                            true
                                                                        );
                                                                    }
                                                                }}
                                                            />
                                                            {isUploading && (
                                                                <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                                                    <div className="text-white text-center">
                                                                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent mx-auto"></div>
                                                                        <p className="text-sm mt-2 font-medium">
                                                                            Sending...
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <p className="break-words leading-relaxed">
                                                            {message.content}
                                                        </p>
                                                    )}

                                                    <div
                                                        className={`text-xs mt-2 flex items-center space-x-1 ${
                                                            isMyMessage
                                                                ? "text-orange-100"
                                                                : "text-gray-500"
                                                        }`}
                                                    >
                                                        <span>
                                                            {formatMessageTime(
                                                                message.created_at
                                                            )}
                                                        </span>
                                                        {isMyMessage &&
                                                            !isUploading && (
                                                                <>
                                                                    {message.read_at ? (
                                                                        <CheckCheck className="h-3 w-3" />
                                                                    ) : (
                                                                        <span>
                                                                            ✓
                                                                        </span>
                                                                    )}
                                                                </>
                                                            )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    )}

                    {/* Input Area */}
                    <div className="bg-white border-t border-gray-200 p-6">
                        <div className="flex items-end space-x-3 max-w-7xl mx-auto w-full">
                            {/* Image Upload Button */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                disabled={uploadingImage}
                                className="hidden"
                            />
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingImage}
                                className="rounded-full w-12 h-12 border-2 border-dashed border-gray-300 hover:border-orange-500 hover:bg-orange-50 transition-all"
                            >
                                {uploadingImage ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-orange-500 border-t-transparent"></div>
                                ) : (
                                    <Image className="h-5 w-5 text-gray-600" />
                                )}
                            </Button>

                            {/* Message Input */}
                            <div className="flex-1">
                                <Input
                                    value={newMessage}
                                    onChange={(e) =>
                                        setNewMessage(e.target.value)
                                    }
                                    onKeyPress={handleKeyPress}
                                    placeholder={`Message ${otherUserName}...`}
                                    className="rounded-2xl px-4 py-3 border-2 border-gray-200 focus:border-orange-500 focus:ring-0 resize-none transition-all"
                                    disabled={sending}
                                />
                            </div>

                            {/* Send Button */}
                            <Button
                                onClick={sendMessage}
                                disabled={!newMessage.trim() || sending}
                                size="icon"
                                className="rounded-full w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:bg-gray-300 transition-all shadow-lg hover:shadow-xl"
                            >
                                {sending ? (
                                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                                ) : (
                                    <Send className="h-5 w-5" />
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Image Modal */}
            {showImageModal && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="relative max-w-4xl max-h-full">
                        <img
                            src={selectedImage}
                            alt="Full size"
                            className="max-w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
                        />
                        <Button
                            onClick={() => setShowImageModal(false)}
                            className="absolute top-4 right-4 bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 border-0"
                            size="icon"
                        >
                            ✕
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Chat;
