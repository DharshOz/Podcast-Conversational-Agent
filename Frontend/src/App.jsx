import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import AuthPage from './pages/AuthPage'
import ChatPage from './pages/ChatPage'

function RequireAuth({ children }) {
  const { token, validating } = useAuth()
  if (validating) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2 h-2 rounded-full bg-brand-500 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    )
  }
  return token ? children : <Navigate to="/login" replace />
}

function GuestOnly({ children }) {
  const { token, validating } = useAuth()
  if (validating) return null
  return token ? <Navigate to="/" replace /> : children
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route
          path="/login"
          element={<GuestOnly><AuthPage /></GuestOnly>}
        />
        <Route
          path="/*"
          element={<RequireAuth><ChatPage /></RequireAuth>}
        />
      </Routes>
    </AuthProvider>
  )
}
