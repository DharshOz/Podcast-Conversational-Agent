/**
 * Sidebar — shows the list of past conversations and the New Conversation button.
 * Handles mobile collapse via the `collapsed` prop.
 */
import { useState } from 'react'
import { deleteSession } from '../api'
import { useAuth } from '../context/AuthContext'

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
)
const LogoutIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
  </svg>
)
const TrashIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
)

function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now - d
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  const diffDays = Math.floor(diffHrs / 24)
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function Sidebar({ sessions, activeSessionId, onSelect, onNew, onDeleted, creatingNew }) {
  const { logout } = useAuth()
  const [deletingId, setDeletingId] = useState(null)

  async function handleDelete(e, sessionId) {
    e.stopPropagation()
    if (!window.confirm('Delete this conversation?')) return
    setDeletingId(sessionId)
    try {
      await deleteSession(sessionId)
      onDeleted(sessionId)
    } catch (_) {/* ignore */}
    finally { setDeletingId(null) }
  }

  return (
    <aside className="flex flex-col h-full w-64 flex-shrink-0 border-r border-white/[0.06] bg-[#0d0d11]">
      {/* Logo */}
      <div className="px-4 pt-5 pb-4 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-brand-500/20 border border-brand-500/30 flex items-center justify-center">
            <svg className="w-4 h-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 016 0v8.25a3 3 0 01-3 3z" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-white/80">Podcast RAG</span>
        </div>
      </div>

      {/* New conversation button */}
      <div className="px-3 pt-3 pb-2">
        <button
          id="new-session-btn"
          onClick={onNew}
          disabled={creatingNew}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium
                     text-brand-300 bg-brand-500/10 border border-brand-500/20
                     hover:bg-brand-500/20 hover:border-brand-500/40
                     active:scale-[0.98] disabled:opacity-50
                     transition-all duration-150"
        >
          <PlusIcon />
          {creatingNew ? 'Creating…' : 'New conversation'}
        </button>
      </div>

      {/* Session list */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {sessions.length === 0 && (
          <p className="text-xs text-white/20 text-center pt-8 px-2">
            No conversations yet.<br />Start one above!
          </p>
        )}
        {sessions.map(s => (
          <div
            key={s.session_id}
            id={`session-${s.session_id}`}
            className={`sidebar-item group ${activeSessionId === s.session_id ? 'active' : ''}`}
            onClick={() => onSelect(s)}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && onSelect(s)}
          >
            <span className="text-sm font-medium text-white/80 truncate pr-6 group-hover:text-white transition-colors">
              {s.title}
            </span>
            <span className="text-xs text-white/30">{formatTime(s.updated_at)}</span>

            {/* Delete button */}
            <button
              onClick={(e) => handleDelete(e, s.session_id)}
              disabled={deletingId === s.session_id}
              className="absolute right-2 top-1/2 -translate-y-1/2
                         opacity-0 group-hover:opacity-100 transition-opacity
                         p-1 rounded-lg hover:bg-red-500/20 hover:text-red-400 text-white/30"
              aria-label="Delete conversation"
            >
              {deletingId === s.session_id
                ? <span className="w-3.5 h-3.5 border border-white/30 border-t-white/80 rounded-full animate-spin block" />
                : <TrashIcon />}
            </button>
          </div>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-3 border-t border-white/[0.06]">
        <button
          id="logout-btn"
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm
                     text-white/40 hover:text-white/70 hover:bg-white/[0.05]
                     transition-all duration-150"
        >
          <LogoutIcon />
          Logout
        </button>
      </div>
    </aside>
  )
}
