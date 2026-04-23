const inferredApiUrl =
  typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : 'http://localhost:8000'

const API_URL = import.meta.env.VITE_API_URL || inferredApiUrl

async function request(path, options = {}, token) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
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

  if (!response.ok) {
    const text = await response.text()
    let detail = 'Request failed'

    try {
      const parsed = JSON.parse(text)
      detail = parsed.detail || detail
    } catch {
      detail = text || detail
    }

    throw new Error(detail)
  }

  return response.json()
}

export const api = {
  register: (payload) => request('/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => request('/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  me: (token) => request('/auth/me', {}, token),
  listHabits: (token) => request('/habits', {}, token),
  createHabit: (payload, token) => request('/habits', { method: 'POST', body: JSON.stringify(payload) }, token),
  trackHabit: (habitId, payload, token) =>
    request(`/habits/${habitId}/records`, { method: 'POST', body: JSON.stringify(payload) }, token),
  listHabitRecords: (habitId, token) => request(`/habits/${habitId}/records`, {}, token),
}
