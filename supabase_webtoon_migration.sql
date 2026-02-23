-- ━━━ 웹툰 시스템 마이그레이션 ━━━

-- 1. documents 테이블에 content_type 컬럼 추가
ALTER TABLE documents ADD COLUMN IF NOT EXISTS content_type TEXT DEFAULT 'document'
  CHECK (content_type IN ('document', 'webtoon'));

-- 2. 웹툰 이미지 테이블
CREATE TABLE IF NOT EXISTS webtoon_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_order INTEGER NOT NULL,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_webtoon_images_document ON webtoon_images(document_id, image_order);

-- RLS
ALTER TABLE webtoon_images ENABLE ROW LEVEL SECURITY;

-- 누구나 읽기
CREATE POLICY "webtoon_images_read" ON webtoon_images FOR SELECT USING (true);

-- 작성자만 관리
CREATE POLICY "webtoon_images_insert" ON webtoon_images FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM documents WHERE id = document_id AND author_id = auth.uid())
  );

CREATE POLICY "webtoon_images_delete" ON webtoon_images FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM documents WHERE id = document_id AND author_id = auth.uid())
  );

-- Storage: webtoons 버킷 (이미 있으면 무시)
-- Supabase Dashboard > Storage에서 webtoons 버킷을 public으로 생성하세요.
