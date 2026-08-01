/**
 * Centralised API client.
 * All calls inject the Bearer token from localStorage and normalise errors.
 * Base URL comes from VITE_API_BASE in .env (default: http://localhost:8000).
 */

const BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

function getToken() {
  return localStorage.getItem('token')
}

async function request(path, { method = 'GET', body, form = false } = {}) {
  const token = getToken()
  const headers = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  let bodyPayload
  if (form) {
    // OAuth2 form-encoded (used by /auth/login)
    bodyPayload = new URLSearchParams(body)
    // don't set Content-Type — browser will set application/x-www-form-urlencoded
  } else if (body) {
    headers['Content-Type'] = 'application/json'
    bodyPayload = JSON.stringify(body)
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: bodyPayload,
  })

  if (!res.ok) {
    let detail = `HTTP ${res.status}`
    try {
      const err = await res.json()
      detail = err.detail || detail
    } catch (_) {}
    const error = new Error(detail)
    error.status = res.status
    throw error
  }

  // 204 / empty bodies
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

// ---------- Auth ----------

export const register = (username, password) =>
  request('/auth/register', { method: 'POST', body: { username, password } })

export const login = (username, password) =>
  request('/auth/login', { method: 'POST', body: { username, password }, form: true })

// ---------- Sessions ----------

export const getSessions = () => request('/sessions')

export const createSession = (title) =>
  request('/sessions', { method: 'POST', body: { title: title || undefined } })

export const deleteSession = (sessionId) =>
  request(`/sessions/${sessionId}`, { method: 'DELETE' })

// ---------- Messages ----------

export const getMessages = (sessionId) =>
  request(`/sessions/${sessionId}/messages`)

export const sendChat = (sessionId, message) =>
  request(`/sessions/${sessionId}/chat`, { method: 'POST', body: { message } })

// ---------- Health ----------

export const healthCheck = () => request('/health')
