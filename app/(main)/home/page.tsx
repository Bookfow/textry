'use client'

import { useEffect, useState } from 'react'
import { supabase, Document } from '@/lib/supabase'
import { useAuth } from '@/lib/auth-context'
import Link from 'next/link'
import { Eye, ThumbsUp, Play } from 'lucide-react'
import { getCategoryIcon, getCategoryLabel } from '@/lib/categories'
import { getLanguageFlag } from '@/lib/languages'

export default function HomePage() {
  const { user } = useAuth()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadRecommendedDocuments()
  }, [user])

  const loadRecommendedDocuments = async () => {
    try {
      let recommendedDocs: Document[] = []

      if (user) {
        const { data: continueReading } = await supabase
          .from('reading_progress')
          .select('document_id')
          .eq('user_id', user.id)
          .lt('progress', 100)
          .order('updated_at', { ascending: false })
          .limit(5)

        if (continueReading && continueReading.length > 0) {
          const { data: continueDocs } = await supabase
            .from('documents')
            .select('*')
            .in('document_id', continueReading.map(r => r.document_id))

          if (continueDocs) recommendedDocs.push(...continueDocs)
        }

        const { data: subscriptions } = await supabase
          .from('subscriptions')
          .select('author_id')
          .eq('subscriber_id', user.id)

        if (subscriptions && subscriptions.length > 0) {
          const { data: subscribedDocs } = await supabase
            .from('documents')
            .select('*')
            .in('author_id', subscriptions.map(s => s.author_id))
            .eq('is_published', true)
            .order('created_at', { ascending: false })
            .limit(10)

          if (subscribedDocs) recommendedDocs.push(...subscribedDocs)
        }
      }

      const { data: popularDocs } = await supabase
        .from('documents')
        .select('*')
        .eq('is_published', true)
        .order('view_count', { ascending: false })
        .limit(20)

      if (popularDocs) recommendedDocs.push(...popularDocs)

      const uniqueDocs = Array.from(
        new Map(recommendedDocs.map(doc => [doc.id, doc])).values()
      )

      setDocuments(uniqueDocs)
    } catch (err) {
      console.error('Error loading documents:', err)
    } finally {
      setLoading(false)
    }
  }

  const DocumentCard = ({ doc }: { doc: Document }) => (
    <Link href={`/read/${doc.id}`}>
      <div className="group cursor-pointer">
        <div className="relative aspect-[3/4] bg-gradient-to-br from-blue-100 to-purple-100 rounded-xl overflow-hidden mb-3">
          {doc.thumbnail_url ? (
            <img
              src={doc.thumbnail_url}
              alt={doc.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-6xl opacity-20">📄</div>
            </div>
          )}
          
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center">
                <Play className="w-6 h-6 text-black ml-1" fill="black" />
              </div>
            </div>
          </div>

          <div className="absolute top-2 left-2 flex gap-2">
            <span className="px-2 py-1 bg-black/70 text-white text-xs rounded backdrop-blur-sm">
              {getCategoryIcon(doc.category)} {getCategoryLabel(doc.category)}
            </span>
            <span className="text-xl">{getLanguageFlag(doc.language)}</span>
          </div>

          <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded backdrop-blur-sm">
            {Math.floor(doc.total_reading_time / 60)}분
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-sm md:text-base line-clamp-2 mb-1 group-hover:text-blue-600 transition-colors">
            {doc.title}
          </h3>
          
          <p className="text-xs text-gray-600 line-clamp-2 mb-2">
            {doc.description || '설명이 없습니다'}
          </p>

          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <ThumbsUp className="w-3 h-3" />
              {doc.likes_count.toLocaleString()}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {doc.view_count.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    </Link>
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>로딩 중...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="p-4 md:p-6 lg:p-8">
        <div className="max-w-[2000px] mx-auto">
          <div className="mb-6">
            <h2 className="text-2xl md:text-3xl font-bold mb-2">추천 문서</h2>
            <p className="text-gray-600">총 {documents.length}개</p>
          </div>

          {documents.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-gray-500 mb-4">추천할 문서가 없습니다</p>
              <Link href="/browse" className="text-blue-600 hover:underline">
                문서 둘러보기
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
              {documents.map((doc) => (
                <DocumentCard key={doc.id} doc={doc} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}