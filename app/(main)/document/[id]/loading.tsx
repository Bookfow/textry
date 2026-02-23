export default function Loading() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-6">
      <div className="animate-pulse">
        <div className="flex gap-6 mb-6">
          <div className="w-[200px] aspect-[3/4] bg-[#EEE4E1] dark:bg-[#2E2620] rounded-xl flex-shrink-0" />
          <div className="flex-1 space-y-3 py-2">
            <div className="h-7 bg-[#EEE4E1] dark:bg-[#2E2620] rounded w-3/4" />
            <div className="h-4 bg-[#EEE4E1] dark:bg-[#2E2620] rounded w-1/2" />
            <div className="h-4 bg-[#EEE4E1] dark:bg-[#2E2620] rounded w-1/3" />
            <div className="h-10 bg-[#B2967D]/30 rounded-xl w-32 mt-4" />
          </div>
        </div>
        <div className="flex gap-2 mb-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-9 w-20 bg-[#EEE4E1] dark:bg-[#2E2620] rounded-full" />
          ))}
        </div>
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="h-4 bg-[#EEE4E1] dark:bg-[#2E2620] rounded w-full" />
          ))}
        </div>
      </div>
    </main>
  )
}
