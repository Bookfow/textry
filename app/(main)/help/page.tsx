'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { MainHeader } from '@/components/main-header'
import { Search, ChevronDown, ChevronRight } from 'lucide-react'

const FAQ_DATA = [
  {
    category: '시작하기',
    questions: [
      {
        q: 'Textry는 무엇인가요?',
        a: 'Textry는 PDF 문서를 유튜브처럼 쉽게 공유하고 소비할 수 있는 플랫폼입니다. 작가는 문서를 업로드하여 수익을 얻고, 독자는 무료로 다양한 문서를 읽을 수 있습니다.'
      },
      {
        q: '작가와 독자의 차이는 무엇인가요?',
        a: '작가는 문서를 업로드하고 광고 수익을 얻을 수 있으며, 독자는 문서를 읽고 좋아요, 댓글, 구독 등의 활동을 할 수 있습니다. 회원가입 시 역할을 선택할 수 있습니다.'
      },
      {
        q: '무료로 사용할 수 있나요?',
        a: '네! 모든 사용자가 무료로 문서를 읽을 수 있으며, 작가 역시 무료로 문서를 업로드할 수 있습니다.'
      }
    ]
  },
  {
    category: '문서 업로드',
    questions: [
      {
        q: '어떤 파일 형식을 업로드할 수 있나요?',
        a: '현재 PDF 파일만 업로드 가능합니다. 파일 크기는 최대 100MB까지 지원합니다.'
      },
      {
        q: '문서를 업로드하면 바로 공개되나요?',
        a: '네, 업로드 즉시 공개되며 다른 사용자들이 검색하고 읽을 수 있습니다.'
      },
      {
        q: '업로드한 문서를 삭제할 수 있나요?',
        a: '네, 대시보드에서 언제든지 삭제할 수 있습니다. 삭제된 문서는 복구할 수 없으니 신중하게 결정해주세요.'
      }
    ]
  },
  {
    category: '수익',
    questions: [
      {
        q: '수익은 어떻게 발생하나요?',
        a: '문서 조회수와 읽기 시간을 기반으로 광고 수익이 계산됩니다. 조회수당 $0.01, 읽기 시간(분)당 $0.05의 수익이 발생합니다.'
      },
      {
        q: '수익은 언제 정산되나요?',
        a: '현재 수익 정산 기능은 개발 중입니다. 대시보드에서 예상 수익을 확인할 수 있습니다.'
      }
    ]
  },
  {
    category: '기능',
    questions: [
      {
        q: '구독 기능은 어떻게 사용하나요?',
        a: '좋아하는 작가의 프로필 또는 문서 페이지에서 구독 버튼을 클릭하면 됩니다. 구독한 작가의 새 문서는 홈 피드와 알림에서 확인할 수 있습니다.'
      },
      {
        q: '읽기 목록은 무엇인가요?',
        a: '나중에 읽고 싶은 문서를 저장해두는 기능입니다. 문서 카드의 북마크 버튼을 클릭하면 읽기 목록에 추가됩니다.'
      },
      {
        q: '카테고리와 언어 필터는 어떻게 사용하나요?',
        a: '상단 검색바 또는 사이드바에서 원하는 카테고리와 언어를 선택하면 해당 조건에 맞는 문서만 볼 수 있습니다.'
      }
    ]
  },
  {
    category: '계정 및 설정',
    questions: [
      {
        q: '프로필 정보를 수정하려면?',
        a: '프로필 메뉴 → 설정에서 사용자 이름과 프로필 이미지를 변경할 수 있습니다.'
      },
      {
        q: '계정을 삭제하려면?',
        a: '현재 계정 삭제 기능은 지원하지 않습니다. 계정 삭제가 필요한 경우 고객센터로 문의해주세요.'
      }
    ]
  }
]

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [category, setCategory] = useState('all')
  const [language, setLanguage] = useState('all')
  const [sortBy, setSortBy] = useState('recent')
  const [faqSearch, setFaqSearch] = useState('')
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  const toggleItem = (id: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedItems(newExpanded)
  }

  const filteredFAQ = FAQ_DATA.map(category => ({
    ...category,
    questions: category.questions.filter(q =>
      faqSearch === '' ||
      q.q.toLowerCase().includes(faqSearch.toLowerCase()) ||
      q.a.toLowerCase().includes(faqSearch.toLowerCase())
    )
  })).filter(category => category.questions.length > 0)

  return (
    <div className="flex flex-col min-h-screen">
      <MainHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        category={category}
        onCategoryChange={setCategory}
        language={language}
        onLanguageChange={setLanguage}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      <main className="flex-1 p-4 md:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto">
          {/* 헤더 */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">고객센터</h1>
            <p className="text-gray-600 mb-6">
              자주 묻는 질문을 확인하세요
            </p>

            {/* FAQ 검색 */}
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="궁금한 내용을 검색하세요..."
                value={faqSearch}
                onChange={(e) => setFaqSearch(e.target.value)}
                className="pl-10 h-12 text-base"
              />
            </div>
          </div>

          {/* FAQ 목록 */}
          <div className="space-y-6">
            {filteredFAQ.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">검색 결과가 없습니다.</p>
              </div>
            ) : (
              filteredFAQ.map((category, catIndex) => (
                <div key={catIndex}>
                  <h2 className="text-xl font-bold mb-4 text-blue-600">
                    {category.category}
                  </h2>
                  <div className="space-y-2">
                    {category.questions.map((item, qIndex) => {
                      const id = `${catIndex}-${qIndex}`
                      const isExpanded = expandedItems.has(id)

                      return (
                        <Card key={id} className="overflow-hidden">
                          <button
                            onClick={() => toggleItem(id)}
                            className="w-full text-left p-4 hover:bg-gray-50 transition-colors flex items-center justify-between"
                          >
                            <span className="font-semibold pr-4">{item.q}</span>
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            )}
                          </button>
                          {isExpanded && (
                            <div className="px-4 pb-4 text-gray-600 border-t">
                              <p className="pt-4">{item.a}</p>
                            </div>
                          )}
                        </Card>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 추가 도움말 */}
          <Card className="mt-8 bg-blue-50 border-blue-200">
            <CardHeader>
              <CardTitle>추가 도움이 필요하신가요?</CardTitle>
              <CardDescription>
                FAQ에서 답을 찾지 못하셨다면 의견 보내기를 통해 문의해주세요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                프로필 메뉴 → 의견 보내기에서 문의사항을 보내실 수 있습니다.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}