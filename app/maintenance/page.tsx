export default function MaintenancePage() {
  return (
    <html lang="ko">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>TeXTREME — 점검 중</title>
      </head>
      <body style={{
        margin: 0,
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#F7F2EF',
        fontFamily: "'Pretendard Variable', -apple-system, sans-serif",
      }}>
        <div style={{
          textAlign: 'center',
          padding: '40px 24px',
          maxWidth: '400px',
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '20px',
          }}>🔧</div>
          <h1 style={{
            fontSize: '24px',
            fontWeight: 800,
            color: '#2D2016',
            marginBottom: '12px',
            letterSpacing: '-0.5px',
          }}>서비스 점검 중</h1>
          <p style={{
            fontSize: '15px',
            color: '#9C8B7A',
            lineHeight: 1.6,
            margin: 0,
          }}>
            더 나은 서비스를 위해 점검 중입니다.<br />
            빠른 시일 내에 돌아오겠습니다.
          </p>
          <div style={{
            marginTop: '32px',
            fontSize: '13px',
            color: '#C4A882',
            fontWeight: 600,
            letterSpacing: '2px',
          }}>TeXTREME</div>
        </div>
      </body>
    </html>
  );
}
