'use client'

import Link from 'next/link'
import { FileText, Shield, Lock, BookOpen, Scale } from 'lucide-react'

const POLICY_LINKS = [
  { href: '/policies/about', icon: BookOpen, label: 'TeXTREME 소개', desc: 'TeXTREME가 어떻게 작동하는지 알아보세요' },
  { href: '/policies/terms', icon: FileText, label: '서비스 약관', desc: 'TeXTREME 서비스 이용에 관한 약관' },
  { href: '/policies/privacy', icon: Lock, label: '개인정보처리방침', desc: '개인정보의 수집, 이용, 보호에 관한 정책' },
  { href: '/policies/copyright', icon: Scale, label: '저작권 정책', desc: '저작권 보호 및 침해 신고 절차' },
  { href: '/policies/safety', icon: Shield, label: '정책 및 안전', desc: '커뮤니티 가이드라인과 신고 절차' },
]

export default function PoliciesPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <h1 className="text-3xl font-bold mb-2 dark:text-white">정책 및 지침</h1>
        <p className="text-sm text-gray-500 mb-8">TeXTREME의 운영 정책과 가이드라인</p>

        <div className="space-y-3">
          {POLICY_LINKS.map(link => (
            <Link key={link.href} href={link.href}>
              <div className="flex items-center gap-4 p-5 bg-white dark:bg-gray-900 rounded-xl border dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors cursor-pointer group">
                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                  <link.icon className="w-5 h-5 text-gray-500 group-hover:text-blue-600 transition-colors" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors">{link.label}</h3>
                  <p className="text-sm text-gray-500">{link.desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t dark:border-gray-800 text-center text-xs text-gray-400 space-y-2">
          <p>© 2026 TeXTREME. All rights reserved.</p>
          <p>문의: support@textreme.io</p>
        </div>
      </main>
    </div>
  )
}
