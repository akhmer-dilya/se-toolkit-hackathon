import { useEffect, useMemo, useState } from 'react'
import { api } from './api'

const defaultRegister = { username: '', email: '', password: '' }
const defaultLogin = { username_or_email: '', password: '' }
const defaultHabit = {
  title: '',
  description: '',
  frequency_per_week: 3,
  is_group: false,
  group_tag: '',
}

function AuthView({ onToken }) {
  const [mode, setMode] = useState('login')
  const [registerForm, setRegisterForm] = useState(defaultRegister)
  const [loginForm, setLoginForm] = useState(defaultLogin)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submitRegister = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      await api.register(registerForm)
      const tokenData = await api.login({
        username_or_email: registerForm.username,
        password: registerForm.password,
      })
      onToken(tokenData.access_token)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const submitLogin = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const tokenData = await api.login(loginForm)
      onToken(tokenData.access_token)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="auth-shell">
      <h1>Healthy habits</h1>
      <p>Build tiny wins every day and watch your streaks grow.</p>

      <div className="tabs" role="tablist">
        <button
          className={mode === 'login' ? 'active' : ''}
          onClick={() => setMode('login')}
          type="button"
        >
          Login
        </button>
        <button
          className={mode === 'register' ? 'active' : ''}
          onClick={() => setMode('register')}
          type="button"
        >
          Register
        </button>
      </div>

      {mode === 'login' ? (
        <form onSubmit={submitLogin} className="card">
          <label>
            Username or email
            <input
              required
              value={loginForm.username_or_email}
              onChange={(e) => setLoginForm({ ...loginForm, username_or_email: e.target.value })}
            />
          </label>
          <label>
            Password
            <input
              required
              type="password"
              value={loginForm.password}
              onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
            />
          </label>
          <button disabled={loading} type="submit">{loading ? 'Loading...' : 'Enter app'}</button>
        </form>
      ) : (
        <form onSubmit={submitRegister} className="card">
          <label>
            Username
            <input
              required
              minLength={3}
              value={registerForm.username}
              onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
            />
          </label>
          <label>
            Email
            <input
              required
              type="email"
              value={registerForm.email}
              onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
            />
          </label>
          <label>
            Password
            <input
              required
              type="password"
              minLength={6}
              value={registerForm.password}
              onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
            />
          </label>
          <button disabled={loading} type="submit">{loading ? 'Loading...' : 'Create account'}</button>
        </form>
      )}

      {error ? <p className="error">{error}</p> : null}
    </section>
  )
}

function HabitCard({ habit, token, refreshHabits }) {
  const [records, setRecords] = useState([])
  const [showRecords, setShowRecords] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const loadRecords = async () => {
    setError('')
    try {
      const list = await api.listHabitRecords(habit.id, token)
      setRecords(list)
    } catch (e) {
      setError(e.message)
    }
  }

  const trackToday = async () => {
    setError('')
    setLoading(true)
    try {
      await api.trackHabit(habit.id, { note }, token)
      setNote('')
      await loadRecords()
      refreshHabits()
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const completedThisWeek = useMemo(() => {
    const now = new Date()
    const start = new Date(now)
    start.setDate(now.getDate() - 6)

    return records.filter((record) => new Date(record.done_on) >= start).length
  }, [records])

  return (
    <article className="habit-card">
      <div className="habit-head">
        <h3>{habit.title}</h3>
        <span>{habit.is_group ? `Group: ${habit.group_tag}` : 'Personal'}</span>
      </div>
      <p>{habit.description || 'No description yet.'}</p>
      <p className="meta">
        Goal: {habit.frequency_per_week} times per week | Done this week: {completedThisWeek}
      </p>

      <div className="track-row">
        <input
          placeholder="Optional note for today"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button disabled={loading} onClick={trackToday} type="button">
          {loading ? 'Saving...' : 'Track today'}
        </button>
      </div>

      <button
        type="button"
        className="link-btn"
        onClick={async () => {
          const next = !showRecords
          setShowRecords(next)
          if (next) {
            await loadRecords()
          }
        }}
      >
        {showRecords ? 'Hide records' : 'Show records'}
      </button>

      {showRecords ? (
        <ul className="records">
          {records.length ? (
            records.map((record) => (
              <li key={record.id}>
                <strong>{record.done_on}</strong>
                <span>{record.note || 'No note'}</span>
              </li>
            ))
          ) : (
            <li>No records yet. Start your streak today.</li>
          )}
        </ul>
      ) : null}

      {error ? <p className="error">{error}</p> : null}
    </article>
  )
}

function Dashboard({ token, onLogout }) {
  const [profile, setProfile] = useState(null)
  const [habits, setHabits] = useState([])
  const [habitForm, setHabitForm] = useState(defaultHabit)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const loadAll = async () => {
    setError('')
    setLoading(true)

    try {
      const [me, list] = await Promise.all([api.me(token), api.listHabits(token)])
      setProfile(me)
      setHabits(list)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [])

  const submitHabit = async (event) => {
    event.preventDefault()
    setError('')

    try {
      await api.createHabit(
        {
          ...habitForm,
          group_tag: habitForm.is_group ? habitForm.group_tag : null,
        },
        token,
      )
      setHabitForm(defaultHabit)
      await loadAll()
    } catch (e) {
      setError(e.message)
    }
  }

  if (loading) {
    return <main className="dashboard"><p className="loading">Loading your habits...</p></main>
  }

  return (
    <main className="dashboard">
      <header>
        <div>
          <h2>Hi, {profile?.username}</h2>
          <p>Keep going. Tiny progress compounds.</p>
        </div>
        <button type="button" onClick={onLogout}>Logout</button>
      </header>

      <section className="grid">
        <form onSubmit={submitHabit} className="card form-card">
          <h3>Create habit</h3>
          <label>
            Title
            <input
              required
              value={habitForm.title}
              onChange={(e) => setHabitForm({ ...habitForm, title: e.target.value })}
            />
          </label>

          <label>
            Description
            <textarea
              value={habitForm.description}
              onChange={(e) => setHabitForm({ ...habitForm, description: e.target.value })}
            />
          </label>

          <label>
            Frequency per week
            <input
              required
              type="number"
              min={1}
              max={7}
              value={habitForm.frequency_per_week}
              onChange={(e) => setHabitForm({ ...habitForm, frequency_per_week: Number(e.target.value) })}
            />
          </label>

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={habitForm.is_group}
              onChange={(e) => setHabitForm({ ...habitForm, is_group: e.target.checked })}
            />
            Group habit
          </label>

          {habitForm.is_group ? (
            <label>
              Group tag
              <input
                required
                value={habitForm.group_tag}
                onChange={(e) => setHabitForm({ ...habitForm, group_tag: e.target.value })}
                placeholder="example: dorm-2026"
              />
            </label>
          ) : null}

          <button type="submit">Create habit</button>
        </form>

        <section>
          <h3>Your habits and available group habits</h3>
          <div className="habit-list">
            {habits.length ? (
              habits.map((habit) => (
                <HabitCard key={habit.id} habit={habit} token={token} refreshHabits={loadAll} />
              ))
            ) : (
              <p className="empty">No habits yet. Create your first one.</p>
            )}
          </div>
        </section>
      </section>

      {error ? <p className="error global">{error}</p> : null}
    </main>
  )
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('healthy_token'))

  const handleToken = (nextToken) => {
    localStorage.setItem('healthy_token', nextToken)
    setToken(nextToken)
  }

  const logout = () => {
    localStorage.removeItem('healthy_token')
    setToken(null)
  }

  return (
    <div className="app-bg">
      <div className="blob one" />
      <div className="blob two" />
      <div className="blob three" />
      {token ? <Dashboard token={token} onLogout={logout} /> : <AuthView onToken={handleToken} />}
    </div>
  )
}
