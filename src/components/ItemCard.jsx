import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle } from "lucide-react";

function ItemCard({
    title,
    description,
    ratings,
    location,
    date,
    price,
    quantity,
    imageUrl,
    onHeartClick,
    isFavorited,
    isOwner,
    onRentClick,
    onMessageOwner,
}) {
    return (
        <Card
            className={`w-full sm:w-64 md:w-80 lg:w-100 overflow-hidden p-0 transition`}
        >
            {imageUrl && (
                <img
                    src={imageUrl}
                    alt={title}
                    className="w-full h-60 object-cover block"
                />
            )}

            <CardHeader className="flex justify-between items-center px-3 pt-2 pb-0">
                <CardTitle className="text-lg font-semibold">{title}</CardTitle>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        onClick={onHeartClick}
                        className={
                            isFavorited
                                ? "bg-red-100 cursor-pointer"
                                : "cursor-pointer"
                        }
                    >
                        <Heart
                            className={`${
                                isFavorited
                                    ? "text-red-500 fill-red-500"
                                    : "text-gray-500"
                            }`}
                        />
                    </Button>
                    {ratings && (
                        <p className="text-sm text-gray-500">⭐ {ratings}</p>
                    )}
                </div>
            </CardHeader>

            <CardContent className="px-3 pt-1 pb-3">
                <CardDescription>{description}</CardDescription>
                <div className="mt-2 text-sm text-gray-600 space-y-1">
                    {location && <p>{location}</p>}
                    {date && <p>{date}</p>}
                    <div className="flex flex-row justify-between items-center gap-2">
                        {price && (
                            <p className="text-[#FFAB00] font-bold text-xl">
                                ₱{price}/day
                            </p>
                        )}
                        {quantity != null && (
                            <p className="text-xs text-gray-600 mr-2">
                                {Number(quantity) || 1} unit
                                {(Number(quantity) || 1) > 1 ? "s" : ""}
                            </p>
                        )}
                        <div className="ml-auto flex items-center gap-2">
                            {onMessageOwner && !isOwner && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="cursor-pointer"
                                    onClick={onMessageOwner}
                                    title="Message owner"
                                >
                                    <MessageCircle className="w-4 h-4 mr-1" />
                                    Message
                                </Button>
                            )}
                            <Button
                                className={`cursor-pointer ${
                                    isOwner
                                        ? "opacity-60 cursor-not-allowed"
                                        : ""
                                }`}
                                disabled={isOwner}
                                onClick={!isOwner ? onRentClick : undefined}
                            >
                                <p>{isOwner ? "Your Item" : "Rent Now"}</p>
                            </Button>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default ItemCard;
