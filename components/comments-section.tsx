'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { supabase, CommentWithProfile, Profile } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ThumbsUp, MessageCircle, Send, Trash2, Flag } from 'lucide-react'
import { useToast } from '@/components/toast'
import { useRouter } from 'next/navigation'
import { ReportButton } from '@/components/report-button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface CommentsSectionProps {
  documentId: string
}

export function CommentsSection({ documentId }: CommentsSectionProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  
  const [comments, setComments] = useState<CommentWithProfile[]>([])
  const [newComment, setNewComment] = useState('')
  const [sortBy, setSortBy] = useState<'recent' | 'popular'>('recent')
  const [loading, setLoading] = useState(false)
  
  const [replyModalOpen, setReplyModalOpen] = useState(false)
  const [replyingTo, setReplyingTo] = useState<CommentWithProfile | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [replyLoading, setReplyLoading] = useState(false)

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
      toast.warning('로그인이 필요합니다.')
      router.push('/login')
      return
    }

    if (!newComment.trim()) return

    setLoading(true)

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      const { data: comment, error } = await supabase
        .from('comments')
        .insert({
          document_id: documentId,
          user_id: user.id,
          content: newComment.trim(),
        })
        .select()
        .single()

      if (error) throw error

      const newCommentWithProfile: CommentWithProfile = {
        ...comment,
        profile: profile as Profile,
        replies: []
      }

      if (sortBy === 'recent') {
        setComments([newCommentWithProfile, ...comments])
      } else {
        setComments([...comments, newCommentWithProfile])
      }

      setNewComment('')
    } catch (err) {
      console.error('Error posting comment:', err)
      toast.error('댓글 작성에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteComment = async (commentId: string, isReply: boolean, parentId?: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return

    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)

      if (error) throw error

      if (isReply && parentId) {
        setComments(prev => prev.map(c => 
          c.id === parentId
            ? { ...c, replies: c.replies?.filter(r => r.id !== commentId) }
            : c
        ))
      } else {
        setComments(prev => prev.filter(c => c.id !== commentId))
      }
    } catch (err) {
      console.error('Error deleting comment:', err)
      toast.error('삭제에 실패했습니다.')
    }
  }

  const openReplyModal = (comment: CommentWithProfile) => {
    if (!user) {
      toast.warning('로그인이 필요합니다.')
      router.push('/login')
      return
    }
    setReplyingTo(comment)
    setReplyContent('')
    setReplyModalOpen(true)
  }

  const handleSubmitReply = async () => {
    if (!user || !replyingTo || !replyContent.trim()) return

    setReplyLoading(true)

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      const { data: reply, error } = await supabase
        .from('comments')
        .insert({
          document_id: documentId,
          user_id: user.id,
          parent_id: replyingTo.id,
          content: replyContent.trim(),
        })
        .select()
        .single()

      if (error) throw error

      const newReply: CommentWithProfile = {
        ...reply,
        profile: profile as Profile
      }

      setComments(prev => prev.map(c => 
        c.id === replyingTo.id
          ? { ...c, replies: [...(c.replies || []), newReply] }
          : c
      ))

      setReplyModalOpen(false)
      setReplyContent('')
      setReplyingTo(null)
    } catch (err) {
      console.error('Error posting reply:', err)
      toast.error('답글 작성에 실패했습니다.')
    } finally {
      setReplyLoading(false)
    }
  }

  const handleLikeComment = async (commentId: string) => {
    if (!user) {
      toast.warning('로그인이 필요합니다.')
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

        setComments(prev => prev.map(c => 
          c.id === commentId 
            ? { ...c, likes_count: c.likes_count - 1 }
            : {
                ...c,
                replies: c.replies?.map(r => 
                  r.id === commentId 
                    ? { ...r, likes_count: r.likes_count - 1 }
                    : r
                )
              }
        ))
      } else {
        await supabase
          .from('comment_likes')
          .insert({
            comment_id: commentId,
            user_id: user.id,
          })

        setComments(prev => prev.map(c => 
          c.id === commentId 
            ? { ...c, likes_count: c.likes_count + 1 }
            : {
                ...c,
                replies: c.replies?.map(r => 
                  r.id === commentId 
                    ? { ...r, likes_count: r.likes_count + 1 }
                    : r
                )
              }
        ))
      }
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

  const CommentItem = ({ comment, isReply = false, parentId }: { comment: CommentWithProfile; isReply?: boolean; parentId?: string }) => (
    <div className={`${isReply ? 'ml-8 mt-2' : 'mb-3'} bg-[#EEE4E1]/50 dark:bg-white/5 p-2.5 rounded-lg`}>
      <div className="flex items-start gap-2">
        <div className="w-7 h-7 bg-[#B2967D] rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {(comment.profile.username || comment.profile.email)[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Link href={`/profile/${comment.profile.id}`} className="text-xs font-semibold hover:underline text-[#2D2016] dark:text-[#EEE4E1]">
              {comment.profile.username || comment.profile.email}
            </Link>
            <span className="text-[11px] text-[#9C8B7A]">
              {new Date(comment.created_at).toLocaleDateString()}
            </span>
          </div>
          <p className="text-xs text-[#5C4A38] dark:text-[#C4A882] mb-1.5 whitespace-pre-wrap break-words">{comment.content}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleLikeComment(comment.id)}
              className="flex items-center gap-1 text-[11px] text-[#9C8B7A] hover:text-[#B2967D] transition-colors"
            >
              <ThumbsUp className="w-3 h-3" />
              <span>{comment.likes_count}</span>
            </button>
            {!isReply && (
              <button
                onClick={() => openReplyModal(comment)}
                className="flex items-center gap-1 text-[11px] text-[#9C8B7A] hover:text-[#B2967D] transition-colors"
              >
                <MessageCircle className="w-3 h-3" />
                답글
              </button>
            )}
            {isReply && (
              <button
                onClick={() => openReplyModal({ ...comment, id: parentId || comment.id })}
                className="flex items-center gap-1 text-[11px] text-[#9C8B7A] hover:text-[#B2967D] transition-colors"
              >
                <MessageCircle className="w-3 h-3" />
                답글
              </button>
            )}
            {user?.id === comment.user_id && (
              <button
                onClick={() => handleDeleteComment(comment.id, isReply, parentId)}
                className="flex items-center gap-1 text-[11px] text-[#9C8B7A] hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                삭제
              </button>
            )}
          </div>
        </div>
      </div>

      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-2">
          {comment.replies.map((reply) => (
            <CommentItem key={reply.id} comment={reply} isReply parentId={comment.id} />
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-[#2D2016] dark:text-[#EEE4E1]">댓글 {comments.length}개</h3>
        <div className="flex gap-1">
          <button
            onClick={() => handleSortChange('recent')}
            className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
              sortBy === 'recent' ? 'bg-[#B2967D] text-white' : 'text-[#9C8B7A] hover:text-[#2D2016] dark:hover:text-[#EEE4E1]'
            }`}
          >
            최신순
          </button>
          <button
            onClick={() => handleSortChange('popular')}
            className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
              sortBy === 'popular' ? 'bg-[#B2967D] text-white' : 'text-[#9C8B7A] hover:text-[#2D2016] dark:hover:text-[#EEE4E1]'
            }`}
          >
            인기순
          </button>
        </div>
      </div>

      {user ? (
        <div className="mb-3">
          <div className="flex items-start gap-2">
            <div className="w-7 h-7 bg-[#B2967D] rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user.email ? user.email[0].toUpperCase() : 'U'}
            </div>
            <div className="flex-1 flex gap-1.5">
              <Textarea
                placeholder="댓글을 입력하세요..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 text-xs bg-[#EEE4E1] dark:bg-[#1E1812] border-[#E7D8C9] dark:border-[#3A302A] text-[#2D2016] dark:text-[#EEE4E1] placeholder:text-[#9C8B7A] min-h-[60px] resize-none"
                rows={2}
              />
              <button
                onClick={handleSubmitComment}
                disabled={loading || !newComment.trim()}
                className="p-2 rounded-lg bg-[#B2967D] text-white hover:bg-[#a67c52] disabled:opacity-40 disabled:cursor-not-allowed transition-colors self-end"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-3 p-3 rounded-lg bg-[#EEE4E1] dark:bg-[#2E2620] text-center">
          <p className="text-xs text-[#9C8B7A] mb-2">댓글을 작성하려면 로그인이 필요합니다</p>
          <button
            onClick={() => router.push('/login')}
            className="px-3 py-1 rounded text-xs bg-[#B2967D] text-white hover:bg-[#a67c52] transition-colors"
          >
            로그인
          </button>
        </div>
      )}

      {comments.length === 0 ? (
        <div className="text-center py-6 text-xs text-[#9C8B7A]">
          첫 댓글을 작성해보세요!
        </div>
      ) : (
        <div>
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
        </div>
      )}

      {/* 신고 버튼 - 하단 */}
      {user && (
        <div className="mt-4 pt-3 border-t border-[#E7D8C9] dark:border-[#3A302A] flex justify-end">
          <ReportButton documentId={documentId} />
        </div>
      )}

      <Dialog open={replyModalOpen} onOpenChange={setReplyModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>답글 작성</DialogTitle>
            <DialogDescription>
              {replyingTo && `${replyingTo.profile.username || replyingTo.profile.email}님의 댓글에 답글을 작성합니다`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {replyingTo && (
              <div className="bg-[#EEE4E1] dark:bg-[#2E2620] p-3 rounded-lg">
                <p className="text-xs text-[#9C8B7A] mb-1">원본 댓글:</p>
                <p className="text-sm text-[#2D2016] dark:text-[#EEE4E1]">{replyingTo.content}</p>
              </div>
            )}
            <Textarea
              placeholder="답글을 입력하세요..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              rows={4}
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setReplyModalOpen(false)}
              >
                취소
              </Button>
              <Button
                size="sm"
                onClick={handleSubmitReply}
                disabled={replyLoading || !replyContent.trim()}
                className="bg-[#B2967D] hover:bg-[#a67c52] text-white"
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                답글 작성
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
