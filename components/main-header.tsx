'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Plus, FileText, X, Clock } from 'lucide-react'
import { NotificationsBell } from '@/components/notifications-bell'
import { ProfileMenu } from '@/components/profile-menu'
import { useAuth } from '@/lib/auth-context'
import { supabase } from '@/lib/supabase'
import { CATEGORIES } from '@/lib/categories'

interface MainHeaderProps {
  category: string
  onCategoryChange: (value: string) => void
  language: string
  onLanguageChange: (value: string) => void
  sortBy: string
  onSortChange: (value: string) => void
}

type SearchResult = {
  type: 'document' | 'author'
  id: string
  title: string
  subtitle: string
  thumbnail?: string | null
}

export function MainHeader({
  category,
  onCategoryChange,
  language,
  onLanguageChange,
  sortBy,
  onSortChange,
}: MainHeaderProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [suggestions, setSuggestions] = useState<SearchResult[]>([])
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('textry_recent_searches')
    if (saved) setRecentSearches(JSON.parse(saved))
  }, [])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (searchQuery.trim().length < 2) {
      setSuggestions([])
      return
    }
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true)
      try {
        const query = searchQuery.trim()
        const { data: docs } = await supabase
          .from('documents')
          .select('id, title, description, thumbnail_url')
          .eq('is_published', true)
          .ilike('title', `%${query}%`)
          .limit(5)
        const { data: authors } = await supabase
          .from('profiles')
          .select('id, username, email, avatar_url')
          .or(`username.ilike.%${query}%,email.ilike.%${query}%`)
          .limit(3)
        const results: SearchResult[] = [
          ...(docs || []).map(d => ({
            type: 'document' as const, id: d.id, title: d.title,
            subtitle: d.description || '', thumbnail: d.thumbnail_url,
          })),
          ...(authors || []).map(a => ({
            type: 'author' as const, id: a.id, title: a.username || a.email,
            subtitle: '작가', thumbnail: a.avatar_url,
          })),
        ]
        setSuggestions(results)
      } catch (err) {
        console.error('Search error:', err)
      } finally {
        setSearchLoading(false)
      }
    }, 300)
  }, [searchQuery])

  const saveRecentSearch = useCallback((query: string) => {
    const updated = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5)
    setRecentSearches(updated)
    localStorage.setItem('textry_recent_searches', JSON.stringify(updated))
  }, [recentSearches])

  const clearRecentSearches = () => {
    setRecentSearches([])
    localStorage.removeItem('textry_recent_searches')
  }

  const handleResultClick = (result: SearchResult) => {
    setShowDropdown(false)
    saveRecentSearch(result.title)
    router.push(result.type === 'document' ? `/read/${result.id}` : `/author/${result.id}`)
  }

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      saveRecentSearch(searchQuery.trim())
      setShowDropdown(false)
    }
  }

  const handleRecentClick = (query: string) => {
    setSearchQuery(query)
    setShowDropdown(false)
  }

  const hasDropdownContent = showDropdown && (
    (searchQuery.trim().length >= 2 && (searchLoading || suggestions.length > 0)) ||
    (searchQuery.trim().length < 2 && recentSearches.length > 0)
  )

  const dropdownContent = hasDropdownContent ? (
    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden z-50 max-h-[400px] overflow-y-auto">
      {searchQuery.trim().length < 2 && recentSearches.length > 0 && (
        <div>
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-[#2E2620]">
            <span className="text-xs font-medium text-[#9C8B7A]">최근 검색</span>
            <button onClick={clearRecentSearches} className="text-xs text-[#B2967D] hover:underline">삭제</button>
          </div>
          {recentSearches.map((query, i) => (
            <button key={i} onClick={() => handleRecentClick(query)}
              className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-[#EEE4E1] dark:hover:bg-[#2E2620] text-left">
              <Clock className="w-4 h-4 text-[#9C8B7A] flex-shrink-0" />
              <span className="text-sm text-[#2D2016] dark:text-[#EEE4E1] truncate">{query}</span>
            </button>
          ))}
        </div>
      )}
      {searchQuery.trim().length >= 2 && (
        <>
          {searchLoading && <div className="px-4 py-3 text-sm text-[#9C8B7A] text-center">검색 중...</div>}
          {!searchLoading && suggestions.length === 0 && (
            <div className="px-4 py-6 text-sm text-[#9C8B7A] text-center">검색 결과가 없습니다</div>
          )}
          {!searchLoading && suggestions.length > 0 && (
            <>
              {suggestions.filter(s => s.type === 'document').length > 0 && (
                <div className="px-4 py-2 bg-gray-50 dark:bg-[#2E2620] text-xs font-medium text-[#9C8B7A]">문서</div>
              )}
              {suggestions.filter(s => s.type === 'document').map(result => (
                <button key={result.id} onClick={() => handleResultClick(result)}
                  className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-[#EEE4E1] dark:hover:bg-[#2E2620] text-left transition-colors">
                  <div className="relative w-8 h-10 rounded bg-[#EEE4E1] dark:bg-[#2E2620] overflow-hidden flex-shrink-0">
                    {result.thumbnail ? (
                      <Image src={result.thumbnail} alt="" fill className="object-cover" sizes="32px" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><FileText className="w-4 h-4 text-[#E7D8C9]" /></div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#2D2016] dark:text-[#EEE4E1] truncate">{result.title}</p>
                    <p className="text-xs text-[#9C8B7A] truncate">{result.subtitle}</p>
                  </div>
                </button>
              ))}
              {suggestions.filter(s => s.type === 'author').length > 0 && (
                <div className="px-4 py-2 bg-gray-50 dark:bg-[#2E2620] text-xs font-medium text-[#9C8B7A]">작가</div>
              )}
              {suggestions.filter(s => s.type === 'author').map(result => (
                <button key={result.id} onClick={() => handleResultClick(result)}
                  className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-[#EEE4E1] dark:hover:bg-[#2E2620] text-left transition-colors">
                  <div className="relative w-8 h-8 rounded-full bg-gradient-to-br from-[#B2967D] to-[#E6BEAE] overflow-hidden flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
                    {result.thumbnail ? (
                      <Image src={result.thumbnail} alt="" fill className="object-cover" sizes="32px" />
                    ) : result.title[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[#2D2016] dark:text-[#EEE4E1] truncate">{result.title}</p>
                    <p className="text-xs text-[#9C8B7A]">작가</p>
                  </div>
                </button>
              ))}
            </>
          )}
        </>
      )}
    </div>
  ) : null

  return (
    <header className="sticky top-0 z-20 bg-white/80 dark:bg-[#1A1410]/80 backdrop-blur-md border-b border-[#E7D8C9] dark:border-[#3A302A]">
      <div className="px-4 md:px-6 py-3">
      <div className="flex items-center gap-4 max-w-[1400px] mx-auto w-full">
      {/* 로고 */}
          <Link href="/home" className="flex-shrink-0">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-[#a67c52] via-[#f0d58c] to-[#a67c52] bg-clip-text text-transparent" style={{WebkitTextStroke: '0.3px #daa520', paintOrder: 'stroke fill', letterSpacing: '1px'}}>
              Textry
            </h1>
          </Link>

          {/* 데스크톱 검색 + 필터 */}
          <div className="hidden lg:flex flex-1 gap-2 max-w-4xl mx-auto">
            <div className="relative flex-1" ref={dropdownRef}>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9C8B7A] w-5 h-5 pointer-events-none z-10" />
              <input
                type="text"
                placeholder="문서 또는 작가 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setShowDropdown(true)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearchSubmit() }}
                className="w-full h-10 pl-10 pr-10 rounded-full bg-[#EEE4E1] dark:bg-[#2E2620] text-[#2D2016] dark:text-[#EEE4E1] border-none outline-none text-sm placeholder:text-[#9C8B7A]"
              />
              {searchQuery && (
                <button type="button" onClick={() => { setSearchQuery(''); setSuggestions([]) }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9C8B7A] hover:text-[#5C4A38] z-10">
                  <X className="w-4 h-4" />
                </button>
              )}
              {dropdownContent}
            </div>

            <Select value={category} onValueChange={onCategoryChange}>
              <SelectTrigger className="w-40 rounded-full bg-[#EEE4E1] dark:bg-[#2E2620] text-[#2D2016] dark:text-[#EEE4E1] border-0 h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4} className="min-w-[120px] z-[9999]">
                <SelectItem value="all">전체 카테고리</SelectItem>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>{cat.icon} {cat.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={onSortChange}>
              <SelectTrigger className="w-36 rounded-full bg-[#EEE4E1] dark:bg-[#2E2620] text-[#2D2016] dark:text-[#EEE4E1] border-0 h-10 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4} className="min-w-[120px] z-[9999]">
                <SelectItem value="recent">최신순</SelectItem>
                <SelectItem value="popular">인기순</SelectItem>
                <SelectItem value="views">조회수순</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 태블릿 검색 */}
          <div className="hidden md:flex lg:hidden flex-1">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9C8B7A] w-5 h-5 pointer-events-none z-10" />
              <input
                type="text"
                placeholder="문서 또는 작가 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSearchSubmit() }}
                className="w-full h-10 pl-10 pr-10 rounded-full bg-[#EEE4E1] dark:bg-[#2E2620] text-[#2D2016] dark:text-[#EEE4E1] border-none outline-none text-sm placeholder:text-[#9C8B7A]"
              />
              {searchQuery && (
                <button type="button" onClick={() => { setSearchQuery(''); setSuggestions([]) }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9C8B7A] hover:text-[#5C4A38] z-10">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* 우측 */}
          <div className="flex items-center gap-2 ml-auto">
            {user && (
              <Link href="/upload">
                <Button variant="ghost" className="rounded-full hover:bg-[#EEE4E1] dark:hover:bg-[#2E2620] h-10 px-4 text-[#5C4A38] dark:text-[#C4A882]" title="업로드">
                  <Plus className="w-5 h-5 mr-1" />
                  <span className="hidden md:inline">업로드</span>
                </Button>
              </Link>
            )}
            {user && <NotificationsBell />}
            {user && <ProfileMenu />}
          </div>
        </div>

        {/* 모바일 검색 */}
        <div className="md:hidden mt-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9C8B7A] w-5 h-5 pointer-events-none z-10" />
            <input
              type="text"
              placeholder="문서 또는 작가 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSearchSubmit() }}
              className="w-full h-10 pl-10 pr-10 rounded-full bg-[#EEE4E1] dark:bg-[#2E2620] text-[#2D2016] dark:text-[#EEE4E1] border-none outline-none text-sm placeholder:text-[#9C8B7A]"
            />
            {searchQuery && (
              <button type="button" onClick={() => { setSearchQuery(''); setSuggestions([]) }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9C8B7A] hover:text-[#5C4A38] z-10">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
