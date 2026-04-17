const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

async function request(path, options = {}, token) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

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
