export default function Loading() {
  return (
    <main className="max-w-[1600px] mx-auto px-4 md:px-6 py-8">
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-[#EEE4E1] dark:bg-[#2E2620] rounded w-32" />
        <div className="flex gap-2">
          <div className="h-9 w-28 bg-[#EEE4E1] dark:bg-[#2E2620] rounded-full" />
          <div className="h-9 w-28 bg-[#EEE4E1] dark:bg-[#2E2620] rounded-full" />
        </div>
        {[1, 2].map(i => (
          <div key={i}>
            <div className="flex gap-4 px-6 pt-6 pb-2">
              {[1,2,3,4,5].map(j => (
                <div key={j} className="w-[120px] aspect-[3/4] bg-[#EEE4E1] dark:bg-[#2E2620] rounded-sm" />
              ))}
            </div>
            <div className="h-6 bg-[#E7D8C9] dark:bg-[#3A302A] rounded-sm" />
          </div>
        ))}
      </div>
    </main>
  )
}
