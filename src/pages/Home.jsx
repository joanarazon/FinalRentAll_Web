import React from "react";
import { useUser } from "../hooks/useUser";
import TopMenu from "../components/topMenu";
import ItemCard from "../components/ItemCard";

function Home() {
    const user = useUser();

    const items = [
        {
            title: "Hammer",
            description: "Tools category",
            ratings: '5.0',
            location: 'Igpit-Opol',
            date: '04-15-2025',
            price: '100',
            imageUrl: "https://picsum.photos/400/300?random=1"
        },
        {
            title: "Car Tire",
            description: "Car category",
            ratings: '4.5',
            location: 'CDO City',
            date: '04-12-2025',
            price: '150',
            imageUrl: "https://picsum.photos/400/300?random=2"
        },
        {
            title: "T-Shirt",
            description: "Clothing category",
            ratings: '4.8',
            location: 'City Mall',
            date: '04-10-2025',
            price: '25',
            imageUrl: "https://picsum.photos/400/300?random=3"
        },
        {
            title: "Headphones",
            description: "Electronics category",
            ratings: '4.9',
            location: 'Gaisano Mall',
            date: '04-18-2025',
            price: '80',
            imageUrl: "https://picsum.photos/400/300?random=4"
        },
    ];

    if (!user) return <p>Loading...</p>;

    return (
        <div className="bg-[#FFFBF2] min-h-screen">
            <TopMenu activePage="home" />
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

            <div className="flex flex-wrap gap-4 mt-10 px-4 md:px-30">
                {items.map((item, index) => (
                    <ItemCard
                        key={index}
                        title={item.title}
                        description={item.description}
                        ratings={item.ratings}
                        location={item.location}
                        date={item.date}
                        price={item.price}
                        imageUrl={item.imageUrl}
                    />
                ))}
            </div>

            <button
                className="cursor-pointer fixed bottom-20 left-5 w-16 h-16 bg-[#4F4F4F] text-white text-2xl font-bold rounded-full shadow-lg flex items-center justify-center hover:bg-[#303030] transition"
                onClick={() => alert("Add product clicked")}
            >
                +
            </button>
        </div>
    );
}

export default Home;