'use client'

import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <h1 className="text-3xl font-bold mb-2 dark:text-white">개인정보처리방침</h1>
        <p className="text-sm text-gray-500 mb-8">최종 업데이트: 2026년 2월 13일</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">1. 수집하는 개인정보</h2>
            <p>Textry는 서비스 제공을 위해 다음과 같은 개인정보를 수집합니다:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong>필수 정보:</strong> 이메일 주소, 사용자 이름</li>
              <li><strong>선택 정보:</strong> 프로필 이미지, 배너 이미지, 자기소개</li>
              <li><strong>자동 수집 정보:</strong> IP 주소, 브라우저 정보, 접속 일시, 서비스 이용 기록, 쿠키</li>
              <li><strong>결제 정보:</strong> 프리미엄 구독 시 결제 관련 정보 (결제 대행사를 통해 처리)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">2. 개인정보 수집 및 이용 목적</h2>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>회원 가입 및 계정 관리</li>
              <li>서비스 제공 및 개선</li>
              <li>맞춤형 콘텐츠 추천</li>
              <li>프리미엄 구독 결제 처리</li>
              <li>작가 수익 정산</li>
              <li>고객 지원 및 문의 처리</li>
              <li>부정 이용 방지 및 서비스 보안</li>
              <li>법적 의무 이행</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">3. 개인정보 보유 및 파기</h2>
            <p>개인정보는 수집 목적이 달성되거나 사용자가 삭제를 요청한 경우 지체 없이 파기합니다.</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong>회원 정보:</strong> 회원 탈퇴 시 즉시 파기 (법률에 의한 보존 의무가 있는 경우 제외)</li>
              <li><strong>결제 기록:</strong> 전자상거래법에 따라 5년간 보존</li>
              <li><strong>접속 로그:</strong> 통신비밀보호법에 따라 3개월간 보존</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">4. 개인정보의 제3자 제공</h2>
            <p>Textry는 원칙적으로 사용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 다음의 경우에는 예외로 합니다:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>사용자가 사전에 동의한 경우</li>
              <li>법률에 의해 요구되는 경우</li>
              <li>서비스 제공에 필요한 최소한의 범위 내에서 업무 위탁하는 경우</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">5. 쿠키 사용</h2>
            <p>Textry는 사용자 경험 개선을 위해 쿠키를 사용합니다. 쿠키는 다음 목적으로 사용됩니다:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>로그인 상태 유지</li>
              <li>사용자 환경 설정 저장 (테마, 언어 등)</li>
              <li>서비스 이용 통계 분석</li>
            </ul>
            <p className="mt-2">브라우저 설정을 통해 쿠키를 거부할 수 있으나, 일부 서비스 이용이 제한될 수 있습니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">6. 사용자의 권리</h2>
            <p>사용자는 언제든지 다음 권리를 행사할 수 있습니다:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>개인정보 열람, 정정, 삭제 요청</li>
              <li>개인정보 처리 정지 요청</li>
              <li>계정 삭제 (회원 탈퇴)</li>
              <li>개인정보 이동 요청</li>
            </ul>
            <p className="mt-2">요청은 설정 페이지 또는 이메일(support@textry.io)을 통해 가능합니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">7. 국제 데이터 전송</h2>
            <p>Textry는 글로벌 서비스로, 사용자의 데이터가 대한민국 외의 서버에 저장될 수 있습니다. 이 경우 관련 법률에 따라 적절한 보호 조치를 취합니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">8. GDPR (EU 사용자)</h2>
            <p>EU 거주자의 경우, GDPR에 따른 추가적인 권리가 보장됩니다. 데이터 처리의 법적 근거, 자동화된 의사결정에 대한 정보, 감독기관에 대한 불만 제기 권리 등이 포함됩니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">9. 아동 개인정보 보호</h2>
            <p>Textry는 만 14세 미만 아동의 개인정보를 의도적으로 수집하지 않습니다. 만 14세 미만 아동의 개인정보가 수집된 사실을 인지할 경우, 즉시 해당 정보를 삭제합니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">10. 개인정보 보호 책임자</h2>
            <p>이메일: privacy@textry.io</p>
            <p className="mt-2">개인정보 처리에 관한 문의, 불만, 피해 구제는 위 연락처로 문의해주세요.</p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t dark:border-gray-800 text-xs text-gray-400">
          <Link href="/policies" className="hover:underline">← 정책 목록으로 돌아가기</Link>
        </div>
      </main>
    </div>
  )
}
