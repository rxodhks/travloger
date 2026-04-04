import { Skeleton } from "@/components/ui/skeleton";

export const HomePageSkeleton = () => (
  <div className="min-h-screen bg-background pb-24 max-w-3xl mx-auto">
    <div className="px-5 pt-12 pb-6">
      <Skeleton className="h-5 w-20 mb-2" />
      <Skeleton className="h-8 w-40" />
    </div>
    <div className="mx-5 mb-6 p-5 rounded-2xl bg-card border border-border">
      <Skeleton className="h-4 w-24 mb-4" />
      <div className="flex justify-between">
        {[1, 2, 3].map(i => (
          <div key={i} className="text-center space-y-1">
            <Skeleton className="h-8 w-12 mx-auto" />
            <Skeleton className="h-3 w-8 mx-auto" />
          </div>
        ))}
      </div>
    </div>
    <div className="px-5 mb-8 flex gap-3">
      {[1, 2, 3].map(i => (
        <Skeleton key={i} className="flex-1 h-20 rounded-2xl" />
      ))}
    </div>
    <div className="px-5 space-y-3">
      <Skeleton className="h-6 w-24 mb-2" />
      {[1, 2, 3].map(i => (
        <Skeleton key={i} className="h-20 rounded-xl" />
      ))}
    </div>
  </div>
);

export const ListPageSkeleton = () => (
  <div className="min-h-screen bg-background pb-24 max-w-3xl mx-auto">
    <div className="px-5 pt-12 pb-4">
      <Skeleton className="h-8 w-48 mb-4" />
    </div>
    <div className="px-5 space-y-3">
      {[1, 2, 3, 4].map(i => (
        <Skeleton key={i} className="h-24 rounded-xl" />
      ))}
    </div>
  </div>
);

export const DetailPageSkeleton = () => (
  <div className="min-h-screen bg-background pb-24 max-w-2xl mx-auto">
    <div className="px-5 pt-12 pb-4 flex items-center gap-3">
      <Skeleton className="h-8 w-8 rounded-full" />
      <Skeleton className="h-6 w-32" />
    </div>
    <div className="px-5 space-y-4">
      <Skeleton className="h-48 rounded-2xl" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  </div>
);
