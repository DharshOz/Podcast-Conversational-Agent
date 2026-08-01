/**
 * MessageBubble — renders a single chat message.
 * User messages: right-aligned indigo bubble.
 * Assistant messages: left-aligned dark glass bubble with Markdown rendered via react-markdown
 * and a Copy button that copies the raw Markdown source.
 */
import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const UserAvatar = () => (
  <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-white/10 border border-white/10
                  flex items-center justify-center text-white/70 text-xs font-bold">
    You
  </div>
)

const AssistantAvatar = () => (
  <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-brand-500/20 border border-brand-500/30
                  flex items-center justify-center text-brand-400 text-xs font-bold">
    AI
  </div>
)

const CopyIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-4" />
  </svg>
)

const CheckIcon = () => (
  <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
)

const markdownComponents = {
  table: ({ children }) => (
    <div className="overflow-x-auto my-2">
      <table className="text-sm border-collapse w-full">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="px-3 py-1.5 border border-white/10 bg-white/[0.08] text-left font-semibold text-white/80">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-1.5 border border-white/10 text-white/70">{children}</td>
  ),
  code: ({ inline, children }) =>
    inline ? (
      <code className="bg-white/10 rounded px-1 py-0.5 text-xs text-brand-300 font-mono">
        {children}
      </code>
    ) : (
      <code className="block bg-black/30 rounded-xl p-3 text-xs font-mono text-brand-200 overflow-x-auto my-2">
        {children}
      </code>
    ),
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noopener noreferrer"
       className="text-brand-400 underline underline-offset-2 hover:text-brand-300 transition-colors">
      {children}
    </a>
  ),
  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
  ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
}

export default function MessageBubble({ role, content }) {
  const isUser = role === 'user'
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={`flex items-end gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} animate-slide-up`}>
      {isUser ? <UserAvatar /> : <AssistantAvatar />}

      {isUser ? (
        <div className="bubble-user">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        </div>
      ) : (
        <div className="relative bubble-assistant prose prose-invert max-w-none text-sm group">
          <button
            onClick={handleCopy}
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/5 hover:bg-white/15
                       text-white/40 hover:text-white/90 border border-white/10
                       opacity-0 group-hover:opacity-100 transition-all duration-150 flex items-center gap-1 text-xs"
            title="Copy raw Markdown"
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
            <span className="text-[10px]">{copied ? 'Copied!' : 'Copy'}</span>
          </button>

          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {content}
          </ReactMarkdown>
        </div>
      )}
    </div>
  )
}
