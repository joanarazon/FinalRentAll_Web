import React from "react";
import { useNavigate } from "react-router-dom";
import TopMenu from "../components/topMenu";
import NotificationPanel from "../components/NotificationPanel";

function Notification({ favorites, searchTerm, setSearchTerm }) {
    const navigate = useNavigate();

    const handleNavigate = (path) => {
        navigate(path);
    };

    // Initialize searchTerm if not provided
    const [localSearchTerm, setLocalSearchTerm] = React.useState(
        searchTerm || ""
    );

    // Sync with TopMenu search
    React.useEffect(() => {
        if (searchTerm !== localSearchTerm) {
            setLocalSearchTerm(searchTerm || "");
        }
    }, [searchTerm]);

    React.useEffect(() => {
        if (setSearchTerm && localSearchTerm !== searchTerm) {
            setSearchTerm(localSearchTerm);
        }
    }, [localSearchTerm, setSearchTerm]);

    return (
        <>
            <div className="bg-[#FFFBF2] min-h-screen">
                <TopMenu
                    activePage="notifications"
                    favorites={favorites}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                />
                <div className="px-4 md:px-30 mt-10">
                    <NotificationPanel
                        onNavigate={handleNavigate}
                        searchTerm={localSearchTerm}
                    />
                </div>
            </div>
        </>
    );
}

export default Notification;
