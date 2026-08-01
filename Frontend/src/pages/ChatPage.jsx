/**
 * ChatPage — the main authenticated shell.
 * Layout: left sidebar + right chat panel (ChatGPT-style).
 * Manages the session list and which session is active.
 * On narrow viewports the sidebar can be toggled.
 */
import { useState, useEffect, useCallback } from 'react'
import { getSessions, createSession } from '../api'
import Sidebar from '../components/Sidebar'
import ChatPanel from '../components/ChatPanel'

const MenuIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
  </svg>
)

export default function ChatPage() {
  const [sessions, setSessions]         = useState([])
  const [activeSession, setActiveSession] = useState(null)
  const [creatingNew, setCreatingNew]   = useState(false)
  const [sidebarOpen, setSidebarOpen]   = useState(true) // desktop default

  const loadSessions = useCallback(async () => {
    try {
      const data = await getSessions()
      setSessions(data)
      setActiveSession(prev => {
        if (!prev) return prev
        const match = data.find(s => s.session_id === prev.session_id)
        return match || prev
      })
    } catch (_) { /* handled by token expiry redirect */ }
  }, [])

  useEffect(() => { loadSessions() }, [loadSessions])

  async function handleNew() {
    setCreatingNew(true)
    try {
      const session = await createSession()
      setSessions(prev => [session, ...prev])
      setActiveSession(session)
    } catch (_) { /* ignore */ }
    finally { setCreatingNew(false) }
  }

  function handleSelect(session) {
    setActiveSession(session)
    // On mobile, collapse sidebar after selecting
    if (window.innerWidth < 768) setSidebarOpen(false)
  }

  function handleDeleted(sessionId) {
    setSessions(prev => prev.filter(s => s.session_id !== sessionId))
    if (activeSession?.session_id === sessionId) setActiveSession(null)
  }

  // Called after a successful chat send so sidebar timestamps update
  function handleSessionUpdated() {
    loadSessions()
  }

  return (
    <div className="flex h-full bg-[#0f0f13] overflow-hidden">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-10 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed md:relative inset-y-0 left-0 z-20 md:z-auto
        transition-transform duration-300 ease-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <Sidebar
          sessions={sessions}
          activeSessionId={activeSession?.session_id}
          onSelect={handleSelect}
          onNew={handleNew}
          onDeleted={handleDeleted}
          creatingNew={creatingNew}
        />
      </div>

      {/* Main area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] md:hidden flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(s => !s)}
            className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Toggle sidebar"
          >
            <MenuIcon />
          </button>
          <span className="text-sm font-medium text-white/60 truncate">
            {activeSession?.title || 'Podcast RAG Agent'}
          </span>
        </div>

        {/* Chat panel */}
        <ChatPanel
          sessionId={activeSession?.session_id}
          sessionTitle={activeSession?.title}
          onSessionUpdated={handleSessionUpdated}
        />
      </main>
    </div>
  )
}
