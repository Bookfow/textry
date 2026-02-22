'use client'

import Link from 'next/link'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <main className="max-w-3xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <h1 className="text-3xl font-bold mb-2 dark:text-white">개인정보처리방침</h1>
        <p className="text-sm text-gray-500 mb-8">시행일: 2026년 2월 14일 | 최종 수정일: 2026년 2월 14일</p>

        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">1. 개인정보의 수집 및 이용 목적</h2>
            <p>Textry(이하 "회사")는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 별도의 동의를 받는 등 필요한 조치를 이행합니다.</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>회원 가입 및 관리: 회원제 서비스 이용에 따른 본인 식별·인증, 회원 자격 유지·관리, 서비스 부정이용 방지</li>
              <li>서비스 제공: 문서 업로드·열람·공유 서비스, 맞춤형 콘텐츠 추천, 구독 및 알림 서비스</li>
              <li>광고 및 마케팅: 이벤트 및 광고성 정보 제공, 서비스 이용 통계 분석</li>
              <li>수익 정산: 큐레이터 광고 수익 정산 및 프리미엄 결제 처리</li>
              <li>고객 지원: 문의 처리 및 불만 해결</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">2. 수집하는 개인정보 항목</h2>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong>필수 항목:</strong> 이메일 주소, 비밀번호(암호화 저장)</li>
              <li><strong>선택 항목:</strong> 사용자 이름, 프로필 이미지, 배너 이미지, 자기소개</li>
              <li><strong>자동 수집 항목:</strong> IP 주소, 쿠키, 서비스 이용 기록, 접속 로그, 기기 정보, 브라우저 종류</li>
              <li><strong>결제 시 수집:</strong> 결제 수단 정보(PG사를 통해 처리되며 회사는 카드번호를 직접 저장하지 않습니다)</li>
              <li><strong>소셜 로그인 시:</strong> 해당 소셜 서비스에서 제공하는 식별 정보(이메일, 프로필 이미지 등)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">3. 개인정보의 보유 및 이용 기간</h2>
            <p>회사는 법령에 따른 개인정보 보유·이용 기간 또는 정보주체로부터 동의받은 기간 내에서 개인정보를 처리·보유합니다.</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>회원 정보: 회원 탈퇴 시까지 (탈퇴 후 30일 이내 파기)</li>
              <li>서비스 이용 기록: 3년 (통신비밀보호법)</li>
              <li>로그인 기록: 3개월 (통신비밀보호법)</li>
              <li>결제 및 재화 공급 기록: 5년 (전자상거래법)</li>
              <li>소비자 불만 또는 분쟁 처리 기록: 3년 (전자상거래법)</li>
              <li>표시·광고에 관한 기록: 6개월 (전자상거래법)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">4. 개인정보의 제3자 제공</h2>
            <p>회사는 원칙적으로 정보주체의 개인정보를 제3자에게 제공하지 않습니다. 다만, 다음의 경우에는 예외로 합니다.</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>정보주체가 사전에 동의한 경우</li>
              <li>법률에 특별한 규정이 있거나 법령상 의무를 준수하기 위하여 불가피한 경우</li>
              <li>수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">5. 개인정보 처리의 위탁</h2>
            <p>회사는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리를 위탁하고 있습니다.</p>
            <div className="not-prose mt-3 overflow-x-auto">
              <table className="w-full text-sm border dark:border-gray-700">
                <thead>
                  <tr className="bg-gray-100 dark:bg-gray-800">
                    <th className="border dark:border-gray-700 px-3 py-2 text-left text-gray-900 dark:text-white">수탁 업체</th>
                    <th className="border dark:border-gray-700 px-3 py-2 text-left text-gray-900 dark:text-white">위탁 업무</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700 dark:text-gray-300">
                  <tr><td className="border dark:border-gray-700 px-3 py-2">Supabase Inc.</td><td className="border dark:border-gray-700 px-3 py-2">데이터 저장 및 인증 서비스</td></tr>
                  <tr><td className="border dark:border-gray-700 px-3 py-2">Vercel Inc.</td><td className="border dark:border-gray-700 px-3 py-2">웹 호스팅 및 콘텐츠 전송</td></tr>
                  <tr><td className="border dark:border-gray-700 px-3 py-2">Google LLC</td><td className="border dark:border-gray-700 px-3 py-2">광고 서비스(AdSense), 소셜 로그인</td></tr>
                  <tr><td className="border dark:border-gray-700 px-3 py-2">주식회사 카카오</td><td className="border dark:border-gray-700 px-3 py-2">소셜 로그인</td></tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3">위탁 업무 내용 및 수탁자가 변경될 경우 지체 없이 본 개인정보처리방침을 통해 공개합니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">6. 정보주체의 권리·의무 및 행사 방법</h2>
            <p>이용자는 개인정보주체로서 다음과 같은 권리를 행사할 수 있습니다.</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>개인정보 열람 요구</li>
              <li>오류 등이 있을 경우 정정 요구</li>
              <li>삭제 요구</li>
              <li>처리 정지 요구</li>
              <li>개인정보 이동 요청</li>
              <li>계정 삭제 (회원 탈퇴)</li>
            </ul>
            <p className="mt-2">위 권리 행사는 설정 페이지에서 직접 처리하거나, 이메일(support@textry.io)을 통해 요청할 수 있으며, 회사는 지체 없이 조치합니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">7. 쿠키의 사용</h2>
            <p>회사는 이용자에게 개별적인 맞춤 서비스를 제공하기 위해 쿠키(cookie)를 사용합니다.</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong>필수 쿠키:</strong> 로그인 세션 유지, 보안</li>
              <li><strong>분석 쿠키:</strong> 서비스 이용 통계 (선택)</li>
              <li><strong>마케팅 쿠키:</strong> 맞춤 광고 (선택)</li>
            </ul>
            <p className="mt-2">이용자는 브라우저 설정 또는 사이드바의 "쿠키 설정"을 통해 쿠키 저장을 거부할 수 있으며, 이 경우 서비스 이용에 일부 제한이 있을 수 있습니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">8. 개인정보의 안전성 확보 조치</h2>
            <p>회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>비밀번호 암호화 저장 (bcrypt)</li>
              <li>SSL/TLS 암호화 통신</li>
              <li>접근 권한 관리 및 최소화</li>
              <li>개인정보 처리 직원의 최소화 및 교육</li>
              <li>정기적 보안 점검</li>
              <li>해킹 등에 대비한 기술적 대책</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">9. 아동 개인정보 보호</h2>
            <p>회사는 만 14세 미만 아동의 개인정보를 의도적으로 수집하지 않습니다. 만 14세 미만 아동의 개인정보가 수집된 사실을 인지할 경우, 즉시 해당 정보를 삭제합니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">10. 국제 데이터 전송</h2>
            <p>회사는 글로벌 서비스로, 사용자의 데이터가 대한민국 외의 서버에 저장될 수 있습니다. 이 경우 관련 법률에 따라 적절한 보호 조치를 취합니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">11. GDPR (EU 사용자)</h2>
            <p>EU 거주자의 경우, GDPR에 따른 추가적인 권리가 보장됩니다. 데이터 처리의 법적 근거, 자동화된 의사결정에 대한 정보, 감독기관에 대한 불만 제기 권리 등이 포함됩니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">12. 개인정보 보호책임자</h2>
            <p>회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 관련 불만 처리 및 피해 구제를 위하여 개인정보 보호책임자를 지정하고 있습니다.</p>
            <ul className="list-none pl-0 space-y-1 mt-2">
              <li><strong>개인정보 보호책임자:</strong> Textry 운영팀</li>
              <li><strong>연락처:</strong> privacy@textry.io</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">13. 권익 침해 구제 방법</h2>
            <p>개인정보 침해에 대한 피해 구제, 상담 등이 필요하신 경우 다음 기관에 문의하실 수 있습니다.</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>개인정보분쟁조정위원회: (국번없이) 1833-6972 (www.kopico.go.kr)</li>
              <li>개인정보침해신고센터: (국번없이) 118 (privacy.kisa.or.kr)</li>
              <li>대검찰청 사이버수사과: (국번없이) 1301 (www.spo.go.kr)</li>
              <li>경찰청 사이버안전국: (국번없이) 182 (cyberbureau.police.go.kr)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold mt-8 mb-3">14. 개인정보처리방침 변경</h2>
            <p>이 개인정보처리방침은 2026년 2월 14일부터 적용됩니다. 변경 사항이 있을 경우 시행 최소 7일 전에 공지사항을 통해 안내하며, 이용자의 권리에 중대한 변경이 있는 경우 최소 30일 전에 공지합니다.</p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t dark:border-gray-800 text-xs text-gray-400">
          <Link href="/policies" className="hover:underline">← 정책 목록으로 돌아가기</Link>
        </div>
      </main>
    </div>
  )
}