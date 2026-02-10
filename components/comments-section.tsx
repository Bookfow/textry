'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { supabase, CommentWithProfile } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ThumbsUp, MessageCircle, Send } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface CommentsSectionProps {
  documentId: string
}

// 답글 입력 컴포넌트
function ReplyInput({ 
  commentId, 
  documentId, 
  onSuccess 
}: { 
  commentId: string
  documentId: string
  onSuccess: () => void 
}) {
  const { user } = useAuth()
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!user || !content.trim()) return

    setLoading(true)
    try {
      await supabase
        .from('comments')
        .insert({
          document_id: documentId,
          user_id: user.id,
          parent_id: commentId,
          content: content.trim(),
        })

      setContent('')
      onSuccess()
    } catch (err) {
      console.error('Error posting reply:', err)
      alert('답글 작성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-4 flex gap-2">
      <Textarea
        placeholder="답글을 입력하세요..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="flex-1"
        rows={2}
      />
      <Button
        onClick={handleSubmit}
        disabled={loading || !content.trim()}
        size="sm"
      >
        <Send className="w-4 h-4" />
      </Button>
    </div>
  )
}

export function CommentsSection({ documentId }: CommentsSectionProps) {
  const { user } = useAuth()
  const router = useRouter()
  
  const [comments, setComments] = useState<CommentWithProfile[]>([])
  const [newComment, setNewComment] = useState('')
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'recent' | 'popular'>('recent')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadComments()
  }, [documentId])

  const loadComments = async () => {
    try {
      const { data: topComments, error } = await supabase
        .from('comments')
        .select(`
          *,
          profile:profiles(*)
        `)
        .eq('document_id', documentId)
        .is('parent_id', null)
        .order(sortBy === 'recent' ? 'created_at' : 'likes_count', { ascending: false })

      if (error) throw error

      const commentsWithReplies = await Promise.all(
        (topComments || []).map(async (comment) => {
          const { data: replies } = await supabase
            .from('comments')
            .select(`
              *,
              profile:profiles(*)
            `)
            .eq('parent_id', comment.id)
            .order('created_at', { ascending: true })

          return {
            ...comment,
            replies: replies || []
          }
        })
      )

      setComments(commentsWithReplies as CommentWithProfile[])
    } catch (err) {
      console.error('Error loading comments:', err)
    }
  }

  const handleSubmitComment = async () => {
    if (!user) {
      alert('로그인이 필요합니다.')
      router.push('/login')
      return
    }

    if (!newComment.trim()) return

    setLoading(true)

    try {
      await supabase
        .from('comments')
        .insert({
          document_id: documentId,
          user_id: user.id,
          content: newComment.trim(),
        })

      setNewComment('')
      await loadComments()
    } catch (err) {
      console.error('Error posting comment:', err)
      alert('댓글 작성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleLikeComment = async (commentId: string) => {
    if (!user) {
      alert('로그인이 필요합니다.')
      router.push('/login')
      return
    }

    try {
      const { data: existing } = await supabase
        .from('comment_likes')
        .select('id')
        .eq('comment_id', commentId)
        .eq('user_id', user.id)
        .single()

      if (existing) {
        await supabase
          .from('comment_likes')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id)
      } else {
        await supabase
          .from('comment_likes')
          .insert({
            comment_id: commentId,
            user_id: user.id,
          })
      }

      await loadComments()
    } catch (err) {
      console.error('Error liking comment:', err)
    }
  }

  const handleSortChange = async (newSort: 'recent' | 'popular') => {
    setSortBy(newSort)
    try {
      const { data: topComments, error } = await supabase
        .from('comments')
        .select(`
          *,
          profile:profiles(*)
        `)
        .eq('document_id', documentId)
        .is('parent_id', null)
        .order(newSort === 'recent' ? 'created_at' : 'likes_count', { ascending: false })

      if (error) throw error

      const commentsWithReplies = await Promise.all(
        (topComments || []).map(async (comment) => {
          const { data: replies } = await supabase
            .from('comments')
            .select(`
              *,
              profile:profiles(*)
            `)
            .eq('parent_id', comment.id)
            .order('created_at', { ascending: true })

          return {
            ...comment,
            replies: replies || []
          }
        })
      )

      setComments(commentsWithReplies as CommentWithProfile[])
    } catch (err) {
      console.error('Error loading comments:', err)
    }
  }

  const CommentItem = ({ comment, isReply = false }: { comment: CommentWithProfile; isReply?: boolean }) => (
    <div className={`${isReply ? 'ml-12 mt-4' : 'mb-6'} bg-white p-4 rounded-lg`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
          {(comment.profile.username || comment.profile.email)[0].toUpperCase()}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold">{comment.profile.username || comment.profile.email}</span>
            <span className="text-sm text-gray-500">
              {new Date(comment.created_at).toLocaleDateString('ko-KR')}
            </span>
          </div>
          <p className="text-gray-800 mb-3 whitespace-pre-wrap">{comment.content}</p>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleLikeComment(comment.id)}
              className="gap-1 text-gray-600 hover:text-blue-600"
            >
              <ThumbsUp className="w-4 h-4" />
              <span>{comment.likes_count}</span>
            </Button>
            {!isReply && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReplyTo(replyTo === comment.id ? null : comment.id)}
                className="gap-1 text-gray-600 hover:text-blue-600"
              >
                <MessageCircle className="w-4 h-4" />
                답글
              </Button>
            )}
          </div>
          
          {/* 답글 입력 */}
          {replyTo === comment.id && (
            <ReplyInput 
              commentId={comment.id} 
              documentId={documentId}
              onSuccess={async () => {
                setReplyTo(null)
                await loadComments()
              }}
            />
          )}
        </div>
      </div>

      {/* 대댓글 */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-4">
          {comment.replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} isReply />
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 rounded-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">댓글 {comments.length}개</h2>
        <div className="flex gap-2">
          <Button
            variant={sortBy === 'recent' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSortChange('recent')}
          >
            최신순
          </Button>
          <Button
            variant={sortBy === 'popular' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleSortChange('popular')}
          >
            인기순
          </Button>
        </div>
      </div>

      {/* 댓글 작성 */}
      {user ? (
        <div className="mb-8 bg-white p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
              {user.email ? user.email[0].toUpperCase() : 'U'}
            </div>
            <div className="flex-1 flex gap-2">
              <Textarea
                placeholder="댓글을 입력하세요..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1"
                rows={3}
              />
              <Button
                onClick={handleSubmitComment}
                disabled={loading || !newComment.trim()}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-8 bg-white p-6 rounded-lg text-center">
          <p className="text-gray-600 mb-4">댓글을 작성하려면 로그인이 필요합니다</p>
          <Button onClick={() => router.push('/login')}>로그인</Button>
        </div>
      )}

      {/* 댓글 목록 */}
      {comments.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          첫 댓글을 작성해보세요!
        </div>
      ) : (
        <div>
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </div>
      )}
    </div>
  )
}