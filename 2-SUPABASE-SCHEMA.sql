-- ===================================
-- Textry Supabase 전체 데이터베이스 스키마
-- 생성일: 2026-02-11
-- ===================================

-- ===================================
-- 1. PROFILES 테이블 (사용자)
-- ===================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  username VARCHAR(100),
  role VARCHAR(20) NOT NULL CHECK (role IN ('author', 'reader')),
  subscribers_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 모든 사용자가 모든 프로필 조회 가능
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

-- RLS 정책: 본인 프로필만 업데이트 가능
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- 인덱스
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);

-- Trigger: 회원가입 시 자동으로 프로필 생성
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'reader')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===================================
-- 2. DOCUMENTS 테이블 (문서)
-- ===================================

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT,
  page_count INTEGER,
  cover_image_url VARCHAR(500),
  category VARCHAR(50),
  language VARCHAR(50),
  is_published BOOLEAN DEFAULT TRUE,
  view_count INTEGER DEFAULT 0,
  total_reading_time INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  dislikes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 공개된 문서는 모두 조회 가능
CREATE POLICY "Published documents are viewable by everyone"
  ON documents FOR SELECT
  TO authenticated
  USING (is_published = true);

-- RLS 정책: 작가만 본인 문서 삽입 가능
CREATE POLICY "Authors can insert own documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

-- RLS 정책: 작가만 본인 문서 업데이트 가능
CREATE POLICY "Authors can update own documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id);

-- RLS 정책: 작가만 본인 문서 삭제 가능
CREATE POLICY "Authors can delete own documents"
  ON documents FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

-- 인덱스
CREATE INDEX idx_documents_author ON documents(author_id);
CREATE INDEX idx_documents_published ON documents(is_published);
CREATE INDEX idx_documents_category ON documents(category);
CREATE INDEX idx_documents_language ON documents(language);
CREATE INDEX idx_documents_created ON documents(created_at DESC);

-- ===================================
-- 3. READING_SESSIONS 테이블 (읽기 세션)
-- ===================================

CREATE TABLE reading_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reader_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  current_page INTEGER DEFAULT 1,
  total_pages INTEGER,
  reading_time INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  last_read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(reader_id, document_id)
);

-- RLS 활성화
ALTER TABLE reading_sessions ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 본인 세션만 조회 가능
CREATE POLICY "Users can view own sessions"
  ON reading_sessions FOR SELECT
  TO authenticated
  USING (auth.uid() = reader_id);

-- RLS 정책: 본인 세션만 삽입 가능
CREATE POLICY "Users can insert own sessions"
  ON reading_sessions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reader_id);

-- RLS 정책: 본인 세션만 업데이트 가능
CREATE POLICY "Users can update own sessions"
  ON reading_sessions FOR UPDATE
  TO authenticated
  USING (auth.uid() = reader_id);

-- 인덱스
CREATE INDEX idx_sessions_reader ON reading_sessions(reader_id);
CREATE INDEX idx_sessions_document ON reading_sessions(document_id);
CREATE INDEX idx_sessions_last_read ON reading_sessions(last_read_at DESC);

-- ===================================
-- 4. DOCUMENT_REACTIONS 테이블 (좋아요/싫어요)
-- ===================================

CREATE TABLE document_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  reaction_type VARCHAR(20) NOT NULL CHECK (reaction_type IN ('like', 'dislike')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, document_id)
);

-- RLS 활성화
ALTER TABLE document_reactions ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 모든 반응 조회 가능
CREATE POLICY "Reactions are viewable by everyone"
  ON document_reactions FOR SELECT
  TO authenticated
  USING (true);

-- RLS 정책: 본인 반응만 삽입 가능
CREATE POLICY "Users can insert own reactions"
  ON document_reactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS 정책: 본인 반응만 업데이트 가능
CREATE POLICY "Users can update own reactions"
  ON document_reactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS 정책: 본인 반응만 삭제 가능
CREATE POLICY "Users can delete own reactions"
  ON document_reactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 인덱스
CREATE INDEX idx_reactions_user ON document_reactions(user_id);
CREATE INDEX idx_reactions_document ON document_reactions(document_id);

-- Trigger: 좋아요/싫어요 카운트 업데이트
CREATE OR REPLACE FUNCTION update_document_reaction_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.reaction_type = 'like' THEN
      UPDATE documents SET likes_count = likes_count + 1 WHERE id = NEW.document_id;
    ELSE
      UPDATE documents SET dislikes_count = dislikes_count + 1 WHERE id = NEW.document_id;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.reaction_type = 'like' AND NEW.reaction_type = 'dislike' THEN
      UPDATE documents SET likes_count = likes_count - 1, dislikes_count = dislikes_count + 1 WHERE id = NEW.document_id;
    ELSIF OLD.reaction_type = 'dislike' AND NEW.reaction_type = 'like' THEN
      UPDATE documents SET likes_count = likes_count + 1, dislikes_count = dislikes_count - 1 WHERE id = NEW.document_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.reaction_type = 'like' THEN
      UPDATE documents SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.document_id;
    ELSE
      UPDATE documents SET dislikes_count = GREATEST(dislikes_count - 1, 0) WHERE id = OLD.document_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_reaction_counts
  AFTER INSERT OR UPDATE OR DELETE ON document_reactions
  FOR EACH ROW EXECUTE FUNCTION update_document_reaction_counts();

-- ===================================
-- 5. SUBSCRIPTIONS 테이블 (구독)
-- ===================================

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(subscriber_id, author_id),
  CHECK (subscriber_id != author_id)
);

-- RLS 활성화
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 모든 구독 조회 가능
CREATE POLICY "Subscriptions are viewable by everyone"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (true);

-- RLS 정책: 본인 구독만 삽입 가능
CREATE POLICY "Users can insert own subscriptions"
  ON subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = subscriber_id);

-- RLS 정책: 본인 구독만 삭제 가능
CREATE POLICY "Users can delete own subscriptions"
  ON subscriptions FOR DELETE
  TO authenticated
  USING (auth.uid() = subscriber_id);

-- 인덱스
CREATE INDEX idx_subscriptions_subscriber ON subscriptions(subscriber_id);
CREATE INDEX idx_subscriptions_author ON subscriptions(author_id);

-- Trigger: 구독자 수 업데이트
CREATE OR REPLACE FUNCTION update_subscribers_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE profiles SET subscribers_count = subscribers_count + 1 WHERE id = NEW.author_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE profiles SET subscribers_count = GREATEST(subscribers_count - 1, 0) WHERE id = OLD.author_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_subscribers_count
  AFTER INSERT OR DELETE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_subscribers_count();

-- ===================================
-- 6. COMMENTS 테이블 (댓글)
-- ===================================

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 모든 댓글 조회 가능
CREATE POLICY "Comments are viewable by everyone"
  ON comments FOR SELECT
  TO authenticated
  USING (true);

-- RLS 정책: 로그인한 사용자만 댓글 작성 가능
CREATE POLICY "Authenticated users can insert comments"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS 정책: 본인 댓글만 업데이트 가능
CREATE POLICY "Users can update own comments"
  ON comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS 정책: 본인 댓글만 삭제 가능
CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 인덱스
CREATE INDEX idx_comments_document ON comments(document_id);
CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);
CREATE INDEX idx_comments_created ON comments(created_at DESC);

-- Trigger: 댓글 수 업데이트
CREATE OR REPLACE FUNCTION update_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE documents SET comments_count = comments_count + 1 WHERE id = NEW.document_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE documents SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.document_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_comments_count
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_comments_count();

-- ===================================
-- 7. COMMENT_LIKES 테이블 (댓글 좋아요)
-- ===================================

CREATE TABLE comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);

-- RLS 활성화
ALTER TABLE comment_likes ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 모든 좋아요 조회 가능
CREATE POLICY "Comment likes are viewable by everyone"
  ON comment_likes FOR SELECT
  TO authenticated
  USING (true);

-- RLS 정책: 본인 좋아요만 삽입 가능
CREATE POLICY "Users can insert own comment likes"
  ON comment_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS 정책: 본인 좋아요만 삭제 가능
CREATE POLICY "Users can delete own comment likes"
  ON comment_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 인덱스
CREATE INDEX idx_comment_likes_comment ON comment_likes(comment_id);
CREATE INDEX idx_comment_likes_user ON comment_likes(user_id);

-- Trigger: 댓글 좋아요 수 업데이트
CREATE OR REPLACE FUNCTION update_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE comments SET likes_count = likes_count + 1 WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE comments SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.comment_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_comment_likes_count
  AFTER INSERT OR DELETE ON comment_likes
  FOR EACH ROW EXECUTE FUNCTION update_comment_likes_count();

-- ===================================
-- 8. READING_LIST 테이블 (읽기 목록)
-- ===================================

CREATE TABLE reading_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, document_id)
);

-- RLS 활성화
ALTER TABLE reading_list ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 본인 읽기 목록만 조회 가능
CREATE POLICY "Users can view own reading list"
  ON reading_list FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS 정책: 본인 읽기 목록만 삽입 가능
CREATE POLICY "Users can insert own reading list"
  ON reading_list FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS 정책: 본인 읽기 목록만 삭제 가능
CREATE POLICY "Users can delete own reading list"
  ON reading_list FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 인덱스
CREATE INDEX idx_reading_list_user ON reading_list(user_id);
CREATE INDEX idx_reading_list_document ON reading_list(document_id);

-- ===================================
-- 9. NOTIFICATIONS 테이블 (알림)
-- ===================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  link VARCHAR(500),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 활성화
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 본인 알림만 조회 가능
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS 정책: 본인 알림만 업데이트 가능
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- 인덱스
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, is_read);

-- Trigger: 새 문서 업로드 시 구독자들에게 알림 생성
CREATE OR REPLACE FUNCTION notify_subscribers_on_new_document()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (user_id, type, title, message, link)
  SELECT 
    subscriber_id,
    'new_document',
    '새 문서 업로드',
    (SELECT username FROM profiles WHERE id = NEW.author_id) || '님이 새 문서를 업로드했습니다: ' || NEW.title,
    '/read/' || NEW.id
  FROM subscriptions
  WHERE author_id = NEW.author_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_notify_subscribers
  AFTER INSERT ON documents
  FOR EACH ROW
  WHEN (NEW.is_published = TRUE)
  EXECUTE FUNCTION notify_subscribers_on_new_document();

-- ===================================
-- STORAGE 설정
-- ===================================

-- documents 버킷 생성 (Supabase UI에서 수동 생성 필요)
-- 버킷 이름: documents
-- 공개 설정: 공개 (Public)

-- Storage RLS 정책 (Supabase UI에서 설정)
-- 1. 모든 사용자가 documents 버킷의 파일 조회 가능
-- 2. 작가만 본인 폴더에 파일 업로드 가능
-- 3. 작가만 본인 파일 삭제 가능

-- ===================================
-- 기존 문서에 카테고리 설정 (선택사항)
-- ===================================

UPDATE documents 
SET category = 'other' 
WHERE category IS NULL;

UPDATE documents 
SET language = 'ko' 
WHERE language IS NULL;

-- ===================================
-- 완료!
-- ===================================