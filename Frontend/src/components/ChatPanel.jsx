/**
 * ChatPanel — main content area.
 * - Renders message history with MessageBubble.
 * - Shows TypingIndicator while waiting for the chat response.
 * - Auto-scrolls to the bottom on new messages.
 * - Handles Shift+Enter for newline, Enter to send.
 * - Maps HTTP error codes to human-readable messages.
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { getMessages, sendChat } from '../api'
import MessageBubble from './MessageBubble'
import TypingIndicator from './TypingIndicator'

const ERROR_MESSAGES = {
  400: 'Your message was blocked by content filters.',
  401: 'Session expired — please log in again.',
  404: 'Conversation not found.',
  429: "You're sending messages too quickly. Please wait a moment.",
}
function friendlyError(err) {
  return ERROR_MESSAGES[err?.status] || `Server error: ${err?.message || 'Please try again.'}`
}

const MicIcon = () => (
  <svg className="w-5 h-5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round"
      d="M8.625 9.75a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375m-13.5 3.01c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
  </svg>
)

const SendIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.269 20.876L5.999 12zm0 0h7.5" />
  </svg>
)

export default function ChatPanel({ sessionId, sessionTitle, onSessionUpdated }) {
  const [messages, setMessages]   = useState([])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [fetchingHistory, setFetchingHistory] = useState(false)
  const [error, setError]         = useState(null)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  // Load history whenever the active session changes
  useEffect(() => {
    if (!sessionId) { setMessages([]); return }
    setFetchingHistory(true)
    setError(null)
    getMessages(sessionId)
      .then(setMessages)
      .catch(() => setMessages([]))
      .finally(() => setFetchingHistory(false))
  }, [sessionId])

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || loading || !sessionId) return

    setInput('')
    setError(null)
    setMessages(prev => [...prev, { role: 'user', content: text, ts: new Date().toISOString() }])
    setLoading(true)

    try {
      const data = await sendChat(sessionId, text)
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply, ts: new Date().toISOString() }])
      onSessionUpdated?.()
    } catch (err) {
      setError(friendlyError(err))
    } finally {
      setLoading(false)
    }
  }, [input, loading, sessionId, onSessionUpdated])

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Auto-resize textarea
  function handleInput(e) {
    setInput(e.target.value)
    const ta = textareaRef.current
    if (ta) { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 160) + 'px' }
  }

  if (!sessionId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-white/20">
        <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
          <MicIcon />
        </div>
        <p className="text-sm">Select a conversation or start a new one</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/[0.07] flex-shrink-0">
        <h2 className="font-semibold text-white/80 text-sm truncate">{sessionTitle || 'Conversation'}</h2>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
        {fetchingHistory && (
          <div className="flex justify-center py-8">
            <span className="text-white/30 text-sm">Loading messages…</span>
          </div>
        )}

        {!fetchingHistory && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-white/20 py-16">
            <div className="p-3 rounded-2xl bg-brand-500/10 border border-brand-500/20">
              <MicIcon />
            </div>
            <p className="text-sm">Ask anything about the podcast episodes.</p>
            <p className="text-xs opacity-60">Try: "What did they discuss about AI safety?"</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble key={i} role={msg.role} content={msg.content} />
        ))}

        {loading && <TypingIndicator />}

        {error && (
          <div id="chat-error" className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 animate-fade-in max-w-lg mx-auto text-center">
            {error}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="px-6 pb-6 pt-2 flex-shrink-0">
        <div className="relative flex items-end gap-3 bg-white/[0.04] border border-white/10 rounded-2xl p-3
                        focus-within:border-brand-500/40 transition-colors duration-150">
          <textarea
            id="chat-input"
            ref={textareaRef}
            className="flex-1 bg-transparent text-sm text-white placeholder-white/30 resize-none
                       focus:outline-none leading-relaxed min-h-[24px] max-h-[160px] py-1"
            placeholder="Ask about the podcast… (Enter to send, Shift+Enter for newline)"
            value={input}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            disabled={loading}
            rows={1}
          />
          <button
            id="chat-send"
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="flex-shrink-0 p-2.5 rounded-xl
                       bg-brand-600 hover:bg-brand-500 active:scale-95
                       disabled:opacity-30 disabled:cursor-not-allowed
                       text-white transition-all duration-150 shadow-lg shadow-brand-900/40"
            aria-label="Send message"
          >
            <SendIcon />
          </button>
        </div>
        <p className="text-xs text-white/20 text-center mt-2">
          Answers are grounded in real transcript data. Always verify timestamps.
        </p>
      </div>
    </div>
  )
}
