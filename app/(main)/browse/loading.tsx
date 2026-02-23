import { CardGridSkeleton } from '@/components/loading-skeleton'

export default function Loading() {
  return (
    <main className="max-w-[1600px] mx-auto px-4 md:px-6 py-6">
      <div className="h-8 w-48 bg-[#EEE4E1] dark:bg-[#2E2620] rounded-lg mb-6 animate-pulse" />
      <div className="flex gap-2 mb-6">
        {[1,2,3,4,5].map(i => (
          <div key={i} className="h-9 w-20 bg-[#EEE4E1] dark:bg-[#2E2620] rounded-full animate-pulse" />
        ))}
      </div>
      <CardGridSkeleton count={12} />
    </main>
  )
}
