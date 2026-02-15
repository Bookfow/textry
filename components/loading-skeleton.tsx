/**
 * 전 페이지 일관된 Skeleton 로딩 UI
 * 사용법: import { HomeSkeleton, CardGridSkeleton, ... } from '@/components/loading-skeleton'
 */

// ─── 기본 스켈레톤 블록 ───
function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 dark:bg-gray-800 rounded ${className}`} />
}

// ─── 문서 카드 스켈레톤 (그리드용) ───
export function CardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="aspect-[3/4] bg-gray-200 dark:bg-gray-800 rounded-xl mb-2" />
      <Skeleton className="h-4 w-3/4 mb-1" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  )
}

// ─── 카드 그리드 스켈레톤 ───
export function CardGridSkeleton({ count = 6, title }: { count?: number; title?: boolean }) {
  return (
    <div className="space-y-4">
      {title && <Skeleton className="h-7 w-48" />}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        {Array.from({ length: count }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}

// ─── 홈 피드 스켈레톤 (책장 여러 줄) ───
export function HomeSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="p-4 md:p-6 lg:p-8 space-y-8">
        {[1, 2, 3].map(i => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-6 w-40" />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {Array.from({ length: 6 }).map((_, j) => (
                <CardSkeleton key={j} />
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  )
}

// ─── 대시보드 스켈레톤 ───
export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="w-16 h-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white dark:bg-gray-900 rounded-xl p-4 space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-3 w-16" />
              </div>
            ))}
          </div>
          <Skeleton className="h-10 w-full rounded-lg" />
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white dark:bg-gray-900 rounded-xl p-4 flex items-center gap-4">
                <Skeleton className="w-16 h-20 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

// ─── 프로필 스켈레톤 ───
export function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="p-4 md:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Skeleton className="w-20 h-20 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-9 w-24 rounded-lg" />
          </div>
          <Skeleton className="h-px w-full" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

// ─── 작가 페이지 스켈레톤 ───
export function AuthorSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="p-4 md:p-6 lg:p-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <Skeleton className="h-40 w-full rounded-xl" />
          <div className="flex items-center gap-4 -mt-10 ml-6">
            <Skeleton className="w-24 h-24 rounded-full border-4 border-white dark:border-gray-950" />
            <div className="space-y-2 pt-10">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map(i => (
              <CardSkeleton key={i} />
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}

// ─── 시리즈 관리 스켈레톤 ───
export function SeriesSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="p-4 md:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-7 w-36" />
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white dark:bg-gray-900 rounded-xl p-4 space-y-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
              <div className="flex gap-2">
                {[1, 2, 3].map(j => (
                  <Skeleton key={j} className="h-16 w-12 rounded" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
