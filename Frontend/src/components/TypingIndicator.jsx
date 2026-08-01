/**
 * TypingIndicator — animated three-dot pulse shown while waiting for /chat response.
 */
export default function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 animate-fade-in">
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-brand-500/20 border border-brand-500/30
                      flex items-center justify-center text-brand-400 text-xs font-bold">
        AI
      </div>

      <div className="bubble-assistant flex items-center gap-1.5 py-4 px-5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-brand-400/70 animate-bounce"
            style={{ animationDelay: `${i * 0.18}s` }}
          />
        ))}
      </div>
    </div>
  )
}
