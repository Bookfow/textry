'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { supabase, CommentWithProfile, Profile } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ThumbsUp, MessageCircle, Send, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
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
      alert('로그인이 필요합니다.')
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
      alert('댓글 작성에 실패했습니다.')
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
      alert('삭제에 실패했습니다.')
    }
  }

  const openReplyModal = (comment: CommentWithProfile) => {
    if (!user) {
      alert('로그인이 필요합니다.')
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
      alert('답글 작성에 실패했습니다.')
    } finally {
      setReplyLoading(false)
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
    <div className={`${isReply ? 'ml-8 mt-2' : 'mb-3'} bg-white/5 p-2.5 rounded-lg`}>
      <div className="flex items-start gap-2">
        <div className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {(comment.profile.username || comment.profile.email)[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Link href={`/profile/${comment.profile.id}`} className="text-xs font-semibold hover:underline text-gray-200">
              {comment.profile.username || comment.profile.email}
            </Link>
            <span className="text-[11px] text-gray-500">
              {new Date(comment.created_at).toLocaleDateString('ko-KR')}
            </span>
          </div>
          <p className="text-xs text-gray-300 mb-1.5 whitespace-pre-wrap break-words">{comment.content}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleLikeComment(comment.id)}
              className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-blue-400 transition-colors"
            >
              <ThumbsUp className="w-3 h-3" />
              <span>{comment.likes_count}</span>
            </button>
            {!isReply && (
              <button
                onClick={() => openReplyModal(comment)}
                className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-blue-400 transition-colors"
              >
                <MessageCircle className="w-3 h-3" />
                답글
              </button>
            )}
            {isReply && (
              <button
                onClick={() => openReplyModal({ ...comment, id: parentId || comment.id })}
                className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-blue-400 transition-colors"
              >
                <MessageCircle className="w-3 h-3" />
                답글
              </button>
            )}
            {user?.id === comment.user_id && (
              <button
                onClick={() => handleDeleteComment(comment.id, isReply, parentId)}
                className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-red-400 transition-colors"
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
        <h3 className="text-sm font-semibold text-white">댓글 {comments.length}개</h3>
        <div className="flex gap-1">
          <button
            onClick={() => handleSortChange('recent')}
            className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
              sortBy === 'recent' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            최신순
          </button>
          <button
            onClick={() => handleSortChange('popular')}
            className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
              sortBy === 'popular' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            인기순
          </button>
        </div>
      </div>

      {user ? (
        <div className="mb-3">
          <div className="flex items-start gap-2">
            <div className="w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {user.email ? user.email[0].toUpperCase() : 'U'}
            </div>
            <div className="flex-1 flex gap-1.5">
              <Textarea
                placeholder="댓글을 입력하세요..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="flex-1 text-xs bg-gray-800 border-gray-700 text-white placeholder:text-gray-500 min-h-[60px] resize-none"
                rows={2}
              />
              <button
                onClick={handleSubmitComment}
                disabled={loading || !newComment.trim()}
                className="p-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors self-end"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-3 p-3 rounded-lg bg-gray-800/50 text-center">
          <p className="text-xs text-gray-400 mb-2">댓글을 작성하려면 로그인이 필요합니다</p>
          <button
            onClick={() => router.push('/login')}
            className="px-3 py-1 rounded text-xs bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            로그인
          </button>
        </div>
      )}

      {comments.length === 0 ? (
        <div className="text-center py-6 text-xs text-gray-500">
          첫 댓글을 작성해보세요!
        </div>
      ) : (
        <div>
          {comments.map((comment) => (
            <CommentItem key={comment.id} comment={comment} />
          ))}
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
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">원본 댓글:</p>
                <p className="text-sm">{replyingTo.content}</p>
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
