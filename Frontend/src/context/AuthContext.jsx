/**
 * AuthContext — provides token state and auth helpers across the app.
 * On mount, validates any stored token by calling GET /sessions; if it
 * fails with 401 the token is cleared so the user is sent back to login.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { getSessions } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [validating, setValidating] = useState(!!localStorage.getItem('token'))

  // Validate stored token on page load
  useEffect(() => {
    if (!token) { setValidating(false); return }
    getSessions()
      .catch((err) => {
        if (err.status === 401) {
          localStorage.removeItem('token')
          setToken(null)
        }
      })
      .finally(() => setValidating(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const saveToken = useCallback((t) => {
    localStorage.setItem('token', t)
    setToken(t)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('token')
    setToken(null)
  }, [])

  return (
    <AuthContext.Provider value={{ token, validating, saveToken, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
