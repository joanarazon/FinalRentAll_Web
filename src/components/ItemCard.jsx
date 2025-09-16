import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";

function ItemCard({ title, description, ratings, location, date, price, imageUrl }) {
    return (
        <Card className="w-full sm:w-64 md:w-80 lg:w-96 overflow-hidden p-0">
            {imageUrl && (
                <img
                    src={imageUrl}
                    alt={title}
                    className="w-full h-40 object-cover block"
                />
            )}

            <CardHeader className="flex justify-between items-center px-3 pt-2 pb-0">
                <CardTitle className="text-lg font-semibold">{title}</CardTitle>
                <div className="flex items-center gap-2">
                    <Button variant="ghost">
                        <Heart className="text-gray-500 w-5 h-5 md:w-6 md:h-6" />
                    </Button>
                    {ratings && <p className="text-sm text-gray-500">⭐ {ratings}</p>}
                </div>
            </CardHeader>

            <CardContent className="px-3 pt-1 pb-3">
                <CardDescription>{description}</CardDescription>
                <div className="mt-2 text-sm text-gray-600 space-y-1">
                    {location && <p>{location}</p>}
                    {date && <p>{date}</p>}
                    <div className="flex flex-row justify-between">
                        {price && <p className="text-[#FFAB00] font-bold text-xl">₱{price}/day</p>}
                        <Button>
                            <p>Rent Now</p>
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default ItemCard;
