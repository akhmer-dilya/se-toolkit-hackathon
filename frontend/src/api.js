const inferredApiUrl =
  typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : 'http://localhost:8000'

const API_URL = import.meta.env.VITE_API_URL || inferredApiUrl

async function request(path, options = {}, token) {
  const headers = {
    ...(options.headers || {}),
  }

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  let response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    })
  } catch {
    throw new Error(`Cannot reach API at ${API_URL}. Check backend server and network/firewall.`)
  }

  const text = await response.text()
  const payload = text ? (() => {
    try {
      return JSON.parse(text)
    } catch {
      return null
    }
  })() : null

  if (!response.ok) {
    throw new Error(payload?.detail || text || 'Request failed')
  }

  return payload
}

export const api = {
  register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  refresh: (payload) => request('/auth/refresh', { method: 'POST', body: JSON.stringify(payload) }),
  logout: (payload, token) => request('/auth/logout', { method: 'POST', body: JSON.stringify(payload) }, token),
  forgotPassword: (payload) => request('/auth/forgot-password', { method: 'POST', body: JSON.stringify(payload) }),
  resetPassword: (payload) => request('/auth/reset-password', { method: 'POST', body: JSON.stringify(payload) }),
  me: (token) => request('/auth/me', {}, token),

  updateProfile: (payload, token) => request('/profile', { method: 'PATCH', body: JSON.stringify(payload) }, token),
  uploadAvatar: (file, token) => {
    const formData = new FormData()
    formData.append('file', file)
    return request('/profile/avatar', { method: 'POST', body: formData }, token)
  },

  listHabits: (token) => request('/habits', {}, token),
  createHabit: (payload, token) => request('/habits', { method: 'POST', body: JSON.stringify(payload) }, token),
  trackHabit: (habitId, payload, token) =>
    request(`/habits/${habitId}/records`, { method: 'POST', body: JSON.stringify(payload) }, token),
  listHabitRecords: (habitId, token) => request(`/habits/${habitId}/records`, {}, token),

  createGroup: (payload, token) => request('/groups', { method: 'POST', body: JSON.stringify(payload) }, token),
  joinGroup: (payload, token) => request('/groups/join', { method: 'POST', body: JSON.stringify(payload) }, token),
  listGroups: (token) => request('/groups', {}, token),
  groupLeaderboard: (groupId, token) => request(`/groups/${groupId}/leaderboard`, {}, token),

  analyticsOverview: (token) => request('/analytics/overview', {}, token),
}
