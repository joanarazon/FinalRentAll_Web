import React from "react";
import { useUser } from "../hooks/useUser";
import TopMenu from "../components/topMenu";

function Home() {
    const user = useUser();

    if (!user) return <p>Loading...</p>;

    return (
        <div className="bg-[#FFFBF2] min-h-screen">
            <TopMenu />
            <div className="flex flex-col md:flex-row gap-4 md:gap-10 mt-10 px-4 md:px-30">
                <p className="cursor-pointer px-2 py-1 md:px-0 md:py-0">Tools</p>
                <p className="cursor-pointer px-2 py-1 md:px-0 md:py-0">Car</p>
                <p className="cursor-pointer px-2 py-1 md:px-0 md:py-0">Clothing & Accessories</p>
                <p className="cursor-pointer px-2 py-1 md:px-0 md:py-0">Electronics</p>
                <p className="cursor-pointer px-2 py-1 md:px-0 md:py-0">Others</p>
            </div>
            <div className="flex flex-col md:flex-row gap-4 md:gap-10 mt-10 px-4 md:px-30">
                <h1 className="text-3xl font-semibold px-2 py-1 md:px-0 md:py-0">Items</h1>
            </div>
        </div>
    );
}

export default Home;