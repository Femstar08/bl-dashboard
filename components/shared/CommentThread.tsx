'use client'
import { useState } from 'react'
import { Send } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Comment } from '@/lib/types-requirements'

interface CommentThreadProps {
  entityType: 'requirement' | 'content_calendar'
  entityId: string
  comments: Comment[]
  onRefresh: () => void
}

function timeAgo(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffMs = now - then
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay}d ago`
}

export default function CommentThread({ entityType, entityId, comments, onRefresh }: CommentThreadProps) {
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyBody, setReplyBody] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const topLevel = comments
    .filter(c => c.parent_id === null)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  const getReplies = (parentId: string) =>
    comments
      .filter(c => c.parent_id === parentId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

  const submitComment = async (body: string, parentId: string | null) => {
    if (!body.trim() || submitting) return
    setSubmitting(true)
    await supabase.from('bl_comments').insert({
      entity_type: entityType,
      entity_id: entityId,
      parent_id: parentId,
      author: 'Femi',
      body: body.trim(),
    })
    setSubmitting(false)
    setNewComment('')
    setReplyBody('')
    setReplyingTo(null)
    onRefresh()
  }

  const inputStyle: React.CSSProperties = {
    flex: 1,
    padding: '6px 10px',
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    fontSize: 11,
    fontFamily: 'inherit',
    outline: 'none',
  }

  const sendBtnStyle: React.CSSProperties = {
    background: 'var(--accent)',
    border: 'none',
    borderRadius: 6,
    padding: '6px 10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--bg-primary)',
    flexShrink: 0,
  }

  return (
    <div>
      {/* Top-level comments */}
      {topLevel.map(comment => (
        <div key={comment.id}>
          {/* Comment bubble */}
          <div style={{ padding: 8, background: 'var(--bg-mid)', borderRadius: 6, marginBottom: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent)' }}>{comment.author}</span>
              <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{timeAgo(comment.created_at)}</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-primary)', marginBottom: 4 }}>{comment.body}</div>
            <button
              onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 9,
                color: 'var(--text-muted)',
                padding: 0,
                fontFamily: 'inherit',
              }}
            >
              Reply
            </button>
          </div>

          {/* Replies */}
          {getReplies(comment.id).map(reply => (
            <div
              key={reply.id}
              style={{
                marginLeft: 16,
                borderLeft: '2px solid var(--accent)',
                paddingLeft: 8,
              }}
            >
              <div style={{ padding: 8, background: 'var(--bg-mid)', borderRadius: 6, marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent)' }}>{reply.author}</span>
                  <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{timeAgo(reply.created_at)}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-primary)' }}>{reply.body}</div>
              </div>
            </div>
          ))}

          {/* Inline reply input */}
          {replyingTo === comment.id && (
            <div style={{ marginLeft: 16, paddingLeft: 8, display: 'flex', gap: 6, marginBottom: 8 }}>
              <input
                style={inputStyle}
                placeholder="Write a reply..."
                value={replyBody}
                onChange={e => setReplyBody(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') submitComment(replyBody, comment.id) }}
                autoFocus
              />
              <button
                style={sendBtnStyle}
                onClick={() => submitComment(replyBody, comment.id)}
                disabled={submitting}
              >
                <Send size={12} />
              </button>
            </div>
          )}
        </div>
      ))}

      {/* New top-level comment */}
      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
        <input
          style={inputStyle}
          placeholder="Add a comment..."
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') submitComment(newComment, null) }}
        />
        <button
          style={sendBtnStyle}
          onClick={() => submitComment(newComment, null)}
          disabled={submitting}
        >
          <Send size={12} />
        </button>
      </div>
    </div>
  )
}
