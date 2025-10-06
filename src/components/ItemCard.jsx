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
        <Card className="w-full overflow-hidden p-0 transition-all duration-200 hover:shadow-lg flex flex-col h-full">
            {imageUrl && (
                <img
                    src={imageUrl}
                    alt={title}
                    className="w-full h-60 object-cover block"
                />
            )}

            <CardHeader className="flex justify-between items-center px-4 pt-3 pb-2 flex-shrink-0">
                <CardTitle className="text-lg font-semibold text-gray-900 line-clamp-1">
                    {title}
                </CardTitle>
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

            <CardContent className="px-4 pt-2 pb-4 flex flex-col flex-grow">
                {/* Description - flexible height */}
                <CardDescription className="text-gray-600 text-sm mb-3 line-clamp-2 flex-grow-0">
                    {description}
                </CardDescription>

                {/* Location and Date Info */}
                <div className="text-sm text-gray-500 space-y-1 mb-3 flex-grow-0">
                    {location && (
                        <p className="flex items-center">{location}</p>
                    )}
                    {date && <p>{date}</p>}
                </div>

                {/* Spacer to push content to bottom */}
                <div className="flex-grow"></div>

                {/* Bottom section - always at bottom */}
                <div className="space-y-3 flex-shrink-0">
                    {/* Price and Quantity */}
                    <div className="flex items-center justify-between">
                        {price && (
                            <p className="text-[#FFAB00] font-bold text-xl">
                                ₱{price}/day
                            </p>
                        )}
                        {quantity != null && (
                            <p className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                {Number(quantity) || 0} unit
                                {(Number(quantity) || 0) !== 1 ? "s" : ""}{" "}
                                available
                            </p>
                        )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-stretch gap-2">
                        {onMessageOwner && !isOwner && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="flex-1 h-9"
                                onClick={onMessageOwner}
                                title="Message owner"
                            >
                                <MessageCircle className="w-4 h-4 mr-1" />
                                Message
                            </Button>
                        )}
                        <Button
                            size="sm"
                            className={`flex-1 h-9 ${
                                isOwner ? "opacity-60 cursor-not-allowed" : ""
                            }`}
                            disabled={isOwner}
                            onClick={!isOwner ? onRentClick : undefined}
                        >
                            {isOwner ? "Your Item" : "Rent Now"}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export default ItemCard;
