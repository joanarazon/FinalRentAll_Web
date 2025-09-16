import React from "react";
import { useUser } from "../hooks/useUser";
import TopMenu from "../components/topMenu";
import ItemCard from "../components/ItemCard";
import { useState } from "react";

function Home() {
    const user = useUser();
    const [favorites, setFavorites] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState("");
    const [searchTerm, setSearchTerm] = useState("");

    const toggleFavorite = (item) => {
        setFavorites((prev) => {
            const exists = prev.some((fav) => fav.title === item.title);
            if (exists) {
                // Remove it
                return prev.filter((fav) => fav.title !== item.title);
            } else {
                // Add it
                return [...prev, item];
            }
        });
    };

    const categories = [
        "All",
        "Tools",
        "Car",
        "Clothing & Accessories",
        "Electronics",
        "Others",
    ]


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
            <TopMenu
                activePage="home"
                favorites={favorites}
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
            />
            {/* Desktop category menu */}
            <div className="hidden md:flex flex-row gap-4 md:gap-10 mt-10 px-4 md:px-30">
                {categories.map((cat) => (
                    <p
                        key={cat}
                        className={`cursor-pointer px-2 py-1 md:px-0 md:py-0 ${selectedCategory === cat ? "font-bold underline" : ""
                            }`}
                        onClick={() => setSelectedCategory(cat)}
                    >
                        {cat}
                    </p>
                ))}
            </div>

            {/* Mobile dropdown */}
            <div className="relative block md:hidden mt-10 px-4">
                <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 pr-8 appearance-none"
                >
                    <option value="">Select Category</option>
                    {categories.map((cat) => (
                        <option key={cat} value={cat}>
                            {cat}
                        </option>
                    ))}
                </select>

                {/* Custom arrow */}
                <span className="pointer-events-none absolute right-10 top-1/2 -translate-y-1/2 text-gray-500">
                    ▼
                </span>
            </div>

            <div className="flex flex-col md:flex-row gap-4 md:gap-10 mt-10 px-4 md:px-30">
                <h1 className="text-3xl font-semibold px-2 py-1 md:px-0 md:py-0">Items</h1>
            </div>

            <div className="flex flex-wrap gap-4 mt-10 px-4 md:px-30">
                {(() => {
                    // Filter items first
                    const filteredItems = items.filter((item) => {
                        // Category filter
                        if (selectedCategory && selectedCategory !== "All") {
                            if (!item.description.toLowerCase().includes(selectedCategory.toLowerCase())) {
                                return false;
                            }
                        }
                        // Search filter
                        if (searchTerm) {
                            return (
                                item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                item.location.toLowerCase().includes(searchTerm.toLowerCase())
                            );
                        }
                        return true;
                    });

                    // If no items match, show message
                    if (filteredItems.length === 0) {
                        return <p className="text-gray-500 text-lg">No Item Found</p>;
                    }

                    // Otherwise, render the cards
                    return filteredItems.map((item, index) => {
                        const isFavorited = favorites.some((fav) => fav.title === item.title);
                        return (
                            <ItemCard
                                key={index}
                                title={item.title}
                                description={item.description}
                                ratings={item.ratings}
                                location={item.location}
                                date={item.date}
                                price={item.price}
                                imageUrl={item.imageUrl}
                                isFavorited={isFavorited}
                                onHeartClick={() => toggleFavorite(item)}
                            />
                        );
                    });
                })()}
            </div>

            <button
                className="cursor-pointer fixed bottom-20 left-5 w-16 h-16 bg-[#4F4F4F] text-white text-xl font-bold rounded-full shadow-lg flex items-center justify-center hover:bg-[#303030] transition"
                onClick={() => alert("Add product clicked")}
            >
                +
            </button>
        </div>
    );
}

export default Home;