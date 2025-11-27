import { Sparkles } from 'lucide-react';
import ItemCard from './ItemCard';
import { Skeleton } from '@/components/ui/skeleton';

function RecommendationsSection({ 
  recommendations, 
  loading, 
  userProfile,
  user,
  isFavorited,
  toggleFavorite,
  onItemClick,
  onMessageOwner
}) {
  if (loading) {
    return (
      <div className="mb-12">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="w-6 h-6 text-[#FFAB00]" />
          <h2 className="text-2xl font-bold text-foreground">Recommended For You</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-full overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <Skeleton className="w-full h-64 rounded-t-xl" />
              <div className="p-5">
                <Skeleton className="h-6 w-3/4 mb-3" />
                <Skeleton className="h-4 w-full mb-2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!recommendations || recommendations.length === 0) {
    return null;
  }

  return (
    <div className="mb-12">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-[#FFAB00]" />
          <h2 className="text-2xl font-bold text-foreground">Recommended For You</h2>
        </div>
        {userProfile?.primaryInterests?.length > 0 && (
          <div className="hidden md:flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Based on your interest in:</span>
            <div className="flex gap-2">
              {userProfile.primaryInterests.slice(0, 2).map((interest, idx) => (
                <span 
                  key={idx}
                  className="px-3 py-1 bg-[#FFAB00]/10 text-[#FFAB00] text-xs font-medium rounded-full"
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {recommendations.map((item, index) => (
          <ItemCard
            key={index}
            title={item.title}
            description={item.description}
            ratings={item.ratings}
            location={item.location}
            date={item.date}
            price={item.price}
            quantity={item.quantity}
            imageUrl={item.imageUrl}
            isOwner={user?.id === item.ownerId}
            isFavorited={isFavorited(item.raw?.item_id)}
            onHeartClick={() => toggleFavorite(item.raw || item)}
            onRentClick={() => onItemClick(item)}
            onMessageOwner={
              user?.id !== item.ownerId
                ? () => onMessageOwner(item)
                : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}

export default RecommendationsSection;