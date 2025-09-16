import React from "react";
import TopMenu from "../components/topMenu";

function Notification({ favorites, searchTerm, setSearchTerm }) {
    return (
        <>
            <div className='bg-[#FFFBF2] min-h-screen'>
                <TopMenu
                    activePage="notifications"
                    favorites={favorites}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                />
                <div className="px-4 md:px-30 mt-10">

                </div>
            </div>
        </>
    );
}

export default Notification;