import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import TopMenu from "../components/topMenu";
import MailSidebar from "../components/MailSidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "../../supabaseClient";
import { Skeleton } from "@/components/ui/skeleton";

function Inbox({ favorites, searchTerm, setSearchTerm }) {
    const [inboxSearch, setInboxSearch] = useState("");
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();

    // State from mobile version
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(null);

    const params = useMemo(
        () => new URLSearchParams(location.search),
        [location.search]
    );
    const toId = params.get("to");
    const itemId = params.get("item");

    // Get current user - same as mobile
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

    // Fetch conversations - same logic as mobile
    const fetchConversations = useCallback(async () => {
        if (!currentUser) return;

        try {
            console.log("Fetching conversations for user:", currentUser.id);

            const { data: convData, error: convError } = await supabase
                .from("conversations")
                .select(
                    `
                    id,
                    user1_id,
                    user2_id,
                    item_id,
                    last_message,
                    last_message_at,
                    created_at
                `
                )
                .or(
                    `user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id}`
                )
                .order("last_message_at", { ascending: false });

            if (convError) {
                console.error("Error fetching conversations:", convError);
                return;
            }

            console.log("Conversations found:", convData?.length || 0);

            if (!convData || convData.length === 0) {
                setConversations([]);
                setLoading(false);
                return;
            }

            // Get user IDs to fetch user details
            const otherUserIds = convData.map((conv) =>
                conv.user1_id === currentUser.id ? conv.user2_id : conv.user1_id
            );

            // Get item IDs to fetch item details
            const itemIds = convData
                .map((conv) => conv.item_id)
                .filter(Boolean);

            // Get conversation IDs to fetch last message details
            const conversationIds = convData.map((conv) => conv.id);

            // Fetch user details
            const { data: usersData, error: usersError } = await supabase
                .from("users")
                .select(
                    "id, first_name, last_name, profile_pic_url, face_image_url"
                )
                .in("id", otherUserIds);

            if (usersError) {
                console.warn("Error fetching users:", usersError);
            }

            // Fetch item details
            let itemsData = [];
            if (itemIds.length > 0) {
                const { data: items, error: itemsError } = await supabase
                    .from("items")
                    .select("item_id, title, user_id")
                    .in("item_id", itemIds);

                if (itemsError) {
                    console.warn("Error fetching items:", itemsError);
                } else {
                    itemsData = items || [];
                }
            }

            // Fetch last message details to get message type
            const { data: lastMessagesData, error: lastMessagesError } =
                await supabase
                    .from("messages")
                    .select(
                        "conversation_id, message_type, content, created_at"
                    )
                    .in("conversation_id", conversationIds)
                    .order("created_at", { ascending: false });

            if (lastMessagesError) {
                console.warn(
                    "Error fetching last messages:",
                    lastMessagesError
                );
            }

            // Group messages by conversation and get the latest one for each
            const lastMessagesByConv = {};
            if (lastMessagesData) {
                lastMessagesData.forEach((msg) => {
                    if (!lastMessagesByConv[msg.conversation_id]) {
                        lastMessagesByConv[msg.conversation_id] = msg;
                    }
                });
            }

            // Combine conversation data with user and item details
            const enrichedConversations = convData.map((conv) => {
                const otherUserId =
                    conv.user1_id === currentUser.id
                        ? conv.user2_id
                        : conv.user1_id;
                const otherUser = usersData?.find(
                    (user) => user.id === otherUserId
                );
                const item = itemsData.find(
                    (item) => item.item_id === conv.item_id
                );
                const lastMessage = lastMessagesByConv[conv.id];

                // Determine preview text based on message type
                let preview = "No messages yet";
                if (lastMessage) {
                    if (lastMessage.message_type === "image") {
                        preview = "📷 Image";
                    } else {
                        preview =
                            conv.last_message ||
                            lastMessage.content ||
                            "No messages yet";
                    }
                } else if (conv.last_message) {
                    preview = conv.last_message;
                }

                // Format time - same as mobile
                const formatMessageTime = (timestamp) => {
                    if (!timestamp) return "";
                    const messageTime = new Date(timestamp);
                    const now = new Date();
                    const diffInHours = (now - messageTime) / (1000 * 60 * 60);

                    if (diffInHours < 1) {
                        const diffInMinutes = Math.floor(
                            (now - messageTime) / (1000 * 60)
                        );
                        return diffInMinutes <= 1
                            ? "Just now"
                            : `${diffInMinutes}m ago`;
                    } else if (diffInHours < 24) {
                        return `${Math.floor(diffInHours)}h ago`;
                    } else if (diffInHours < 48) {
                        return "Yesterday";
                    } else {
                        return messageTime.toLocaleDateString();
                    }
                };

                return {
                    ...conv,
                    otherUserId,
                    otherUserName: otherUser
                        ? `${otherUser.first_name} ${otherUser.last_name}`
                        : "Unknown User",
                    otherUserImage:
                        otherUser?.profile_pic_url ||
                        otherUser?.face_image_url ||
                        null,
                    itemTitle: item?.title || "Item not found",
                    formattedTime: formatMessageTime(conv.last_message_at),
                    preview,
                };
            });

            console.log(
                "Enriched conversations:",
                enrichedConversations.length
            );
            setConversations(enrichedConversations);
            setLoading(false);
        } catch (error) {
            console.error("Error in fetchConversations:", error);
            setLoading(false);
        }
    }, [currentUser]);

    // Load conversations when user is available
    useEffect(() => {
        if (currentUser) {
            fetchConversations();
        }
    }, [currentUser, fetchConversations]);

    // Real-time updates for conversations
    useEffect(() => {
        if (!currentUser) return;

        console.log("Setting up real-time subscription for conversations");

        const channel = supabase
            .channel("inbox_changes")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "conversations",
                    filter: `or(user1_id.eq.${currentUser.id},user2_id.eq.${currentUser.id})`,
                },
                (payload) => {
                    console.log("Conversation change received:", payload);
                    fetchConversations();
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages",
                },
                (payload) => {
                    console.log("New message received:", payload);
                    fetchConversations();
                }
            )
            .subscribe();

        return () => {
            console.log("Cleaning up real-time subscription");
            supabase.removeChannel(channel);
        };
    }, [currentUser, fetchConversations]);

    // Navigate to chat - web version
    const openChat = (conversation) => {
        navigate(
            `/chat?conversationId=${conversation.id}&otherUserId=${conversation.otherUserId}&itemId=${conversation.item_id}`
        );
    };

    // Filter conversations based on search
    const filteredConversations = conversations.filter(
        (conv) =>
            conv.otherUserName
                .toLowerCase()
                .includes(inboxSearch.toLowerCase()) ||
            conv.itemTitle.toLowerCase().includes(inboxSearch.toLowerCase()) ||
            conv.preview.toLowerCase().includes(inboxSearch.toLowerCase())
    );

    if (!currentUser) {
        return (
            <div className="bg-[#FFFBF2] min-h-screen flex flex-col">
                <TopMenu
                    activePage="inbox"
                    favorites={favorites}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                />
                <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <p className="text-lg text-gray-600">
                            Please log in to view messages
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#FFFBF2] min-h-screen flex flex-col">
            <TopMenu
                activePage="inbox"
                favorites={favorites}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
            />

            {/* Container for sidebar + main content */}
            <div className="flex flex-1 relative">
                {/* Sidebar */}
                <div
                    className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#FFFBF2] transform border-r transition-transform duration-300 md:static md:translate-x-0 ${
                        sidebarOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
                >
                    <MailSidebar activePage="inbox" />
                </div>

                {/* Overlay for mobile */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black bg-opacity-10 z-30 md:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                {/* Main content */}
                <div className="flex-1 flex flex-col">
                    {/* Header row with toggle + search */}
                    <div className="flex items-center gap-3 p-4 border-b">
                        {/* Small square toggle button for mobile */}
                        <button
                            className="md:hidden w-10 h-10 bg-white border rounded shadow flex items-center justify-center"
                            onClick={() => setSidebarOpen(true)}
                        >
                            ☰
                        </button>

                        {/* Search bar */}
                        <input
                            type="text"
                            placeholder="Search conversations..."
                            value={inboxSearch}
                            onChange={(e) => setInboxSearch(e.target.value)}
                            className="flex-1 md:w-1/2 px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring focus:border-blue-500"
                        />
                    </div>

                    {/* Inbox content */}
                    <main className="flex-1 p-6">
                        {/* Header info */}
                        <div className="mb-6">
                            <h1 className="text-2xl font-bold text-gray-800">
                                Messages
                            </h1>
                            <p className="text-gray-600">
                                {loading
                                    ? "Loading..."
                                    : `${
                                          filteredConversations.length
                                      } conversation${
                                          filteredConversations.length !== 1
                                              ? "s"
                                              : ""
                                      }`}
                            </p>
                        </div>

                        {loading ? (
                            // Loading skeletons
                            <div className="space-y-4">
                                {[...Array(3)].map((_, index) => (
                                    <div
                                        key={index}
                                        className="flex gap-4 p-4 bg-white rounded-lg shadow"
                                    >
                                        <Skeleton className="w-16 h-16 rounded-full" />
                                        <div className="flex-1 space-y-2">
                                            <Skeleton className="h-5 w-32" />
                                            <Skeleton className="h-4 w-48" />
                                            <Skeleton className="h-4 w-full" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : filteredConversations.length === 0 ? (
                            // Empty state
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="w-20 h-20 mb-4 opacity-30">
                                    {/* You can add your inbox icon here */}
                                    <div className="w-full h-full bg-gray-300 rounded-full flex items-center justify-center">
                                        <span className="text-2xl">📨</span>
                                    </div>
                                </div>
                                <h3 className="text-xl font-bold text-gray-800 mb-2">
                                    No conversations yet
                                </h3>
                                <p className="text-gray-600 max-w-md">
                                    Start messaging item owners from the Home
                                    screen
                                </p>
                            </div>
                        ) : (
                            // Conversations list
                            <div className="space-y-4">
                                {filteredConversations.map((conversation) => (
                                    <div
                                        key={conversation.id}
                                        className="flex gap-4 p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
                                        onClick={() => openChat(conversation)}
                                    >
                                        <div className="flex-shrink-0">
                                            {conversation.otherUserImage ? (
                                                <Avatar className="w-16 h-16">
                                                    <AvatarImage
                                                        src={
                                                            conversation.otherUserImage
                                                        }
                                                        alt={
                                                            conversation.otherUserName
                                                        }
                                                    />
                                                    <AvatarFallback>
                                                        {conversation.otherUserName
                                                            .charAt(0)
                                                            .toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                            ) : (
                                                <Avatar className="w-16 h-16 bg-orange-500">
                                                    <AvatarFallback className="text-white font-bold">
                                                        {conversation.otherUserName
                                                            .charAt(0)
                                                            .toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1">
                                                <h3 className="font-semibold text-gray-800 truncate">
                                                    {conversation.otherUserName}
                                                </h3>
                                                <span className="text-sm text-gray-500 whitespace-nowrap ml-2">
                                                    {conversation.formattedTime}
                                                </span>
                                            </div>

                                            <p className="text-sm text-orange-500 font-medium mb-1 truncate">
                                                📦 {conversation.itemTitle}
                                            </p>

                                            <p className="text-gray-600 text-sm line-clamp-2">
                                                {conversation.preview}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}

export default Inbox;
