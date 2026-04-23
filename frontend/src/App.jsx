import { useEffect, useMemo, useState } from 'react'
import { api } from './api'

const inferredApiUrl =
  typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : 'http://localhost:8000'

const API_BASE = import.meta.env.VITE_API_URL || inferredApiUrl

const defaultRegister = { username: '', email: '', password: '' }
const defaultLogin = { username_or_email: '', password: '' }
const defaultReset = { email: '', reset_token: '', new_password: '' }
const defaultHabit = {
  title: '',
  description: '',
  frequency_per_week: 3,
  is_group: false,
  group_id: '',
}

function AuthView({ onTokens }) {
  const [mode, setMode] = useState('login')
  const [registerForm, setRegisterForm] = useState(defaultRegister)
  const [loginForm, setLoginForm] = useState(defaultLogin)
  const [resetForm, setResetForm] = useState(defaultReset)
  const [generatedResetToken, setGeneratedResetToken] = useState('')
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
      onTokens(tokenData)
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
      onTokens(tokenData)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const requestResetToken = async (event) => {
    event.preventDefault()
    setError('')
    setGeneratedResetToken('')
    setLoading(true)
    try {
      const data = await api.forgotPassword({ email: resetForm.email })
      setGeneratedResetToken(data?.reset_token || '')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const submitPasswordReset = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.resetPassword({
        reset_token: resetForm.reset_token,
        new_password: resetForm.new_password,
      })
      setMode('login')
      setResetForm(defaultReset)
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
        <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')} type="button">Login</button>
        <button className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')} type="button">Register</button>
        <button className={mode === 'reset' ? 'active' : ''} onClick={() => setMode('reset')} type="button">Reset</button>
      </div>

      {mode === 'login' ? (
        <form onSubmit={submitLogin} className="card" data-testid="login-form">
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
      ) : null}

      {mode === 'register' ? (
        <form onSubmit={submitRegister} className="card" data-testid="register-form">
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
      ) : null}

      {mode === 'reset' ? (
        <div className="card">
          <form onSubmit={requestResetToken} className="subgrid">
            <label>
              Account email
              <input
                required
                type="email"
                value={resetForm.email}
                onChange={(e) => setResetForm({ ...resetForm, email: e.target.value })}
              />
            </label>
            <button disabled={loading} type="submit">Generate reset token</button>
          </form>
          {generatedResetToken ? <p className="pill">Dev reset token: {generatedResetToken}</p> : null}
          <form onSubmit={submitPasswordReset} className="subgrid">
            <label>
              Reset token
              <input
                required
                value={resetForm.reset_token}
                onChange={(e) => setResetForm({ ...resetForm, reset_token: e.target.value })}
              />
            </label>
            <label>
              New password
              <input
                required
                type="password"
                minLength={6}
                value={resetForm.new_password}
                onChange={(e) => setResetForm({ ...resetForm, new_password: e.target.value })}
              />
            </label>
            <button disabled={loading} type="submit">Reset password</button>
          </form>
        </div>
      ) : null}

      {error ? <p className="error">{error}</p> : null}
    </section>
  )
}

function HabitCard({ habit, accessToken, refreshHabits, withAuth }) {
  const [records, setRecords] = useState([])
  const [showRecords, setShowRecords] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const loadRecords = async () => {
    setError('')
    try {
      const list = await withAuth((token) => api.listHabitRecords(habit.id, token))
      setRecords(list || [])
    } catch (e) {
      setError(e.message)
    }
  }

  const trackToday = async () => {
    setError('')
    setLoading(true)
    try {
      await withAuth((token) => api.trackHabit(habit.id, { note }, token))
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
        <span>{habit.is_group ? `Group #${habit.group_id}` : 'Personal'}</span>
      </div>
      <p>{habit.description || 'No description yet.'}</p>
      <p className="meta">
        Goal: {habit.frequency_per_week} times per week | Done this week: {completedThisWeek}
      </p>

      <div className="track-row">
        <input placeholder="Optional note for today" value={note} onChange={(e) => setNote(e.target.value)} />
        <button disabled={loading} onClick={trackToday} type="button">{loading ? 'Saving...' : 'Track today'}</button>
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

function Dashboard({ session, onSessionChange, onLogout }) {
  const [profile, setProfile] = useState(null)
  const [habits, setHabits] = useState([])
  const [groups, setGroups] = useState([])
  const [leaderboard, setLeaderboard] = useState([])
  const [selectedGroup, setSelectedGroup] = useState('')
  const [analytics, setAnalytics] = useState({ weekly_chart: [], habits: [] })
  const [habitForm, setHabitForm] = useState(defaultHabit)
  const [newGroupName, setNewGroupName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [timezone, setTimezone] = useState('UTC')
  const [avatarFile, setAvatarFile] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const withAuth = async (action) => {
    try {
      return await action(session.accessToken)
    } catch (e) {
      if (!String(e.message).toLowerCase().includes('invalid token')) {
        throw e
      }

      if (!session.refreshToken) {
        throw e
      }

      const refreshed = await api.refresh({ refresh_token: session.refreshToken })
      const nextSession = {
        accessToken: refreshed.access_token,
        refreshToken: refreshed.refresh_token,
      }
      onSessionChange(nextSession)
      return action(nextSession.accessToken)
    }
  }

  const loadAll = async () => {
    setError('')
    setLoading(true)

    try {
      const [me, list, groupList, analyticsData] = await Promise.all([
        withAuth((token) => api.me(token)),
        withAuth((token) => api.listHabits(token)),
        withAuth((token) => api.listGroups(token)),
        withAuth((token) => api.analyticsOverview(token)),
      ])
      setProfile(me)
      setHabits(list || [])
      setGroups(groupList || [])
      setAnalytics(analyticsData || { weekly_chart: [], habits: [] })
      setTimezone(me?.timezone || 'UTC')
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
      await withAuth((token) =>
        api.createHabit(
          {
            ...habitForm,
            group_id: habitForm.is_group ? Number(habitForm.group_id) : null,
          },
          token,
        ),
      )
      setHabitForm(defaultHabit)
      await loadAll()
    } catch (e) {
      setError(e.message)
    }
  }

  const submitGroup = async (event) => {
    event.preventDefault()
    setError('')
    try {
      await withAuth((token) => api.createGroup({ name: newGroupName }, token))
      setNewGroupName('')
      await loadAll()
    } catch (e) {
      setError(e.message)
    }
  }

  const submitJoin = async (event) => {
    event.preventDefault()
    setError('')
    try {
      await withAuth((token) => api.joinGroup({ invite_code: inviteCode }, token))
      setInviteCode('')
      await loadAll()
    } catch (e) {
      setError(e.message)
    }
  }

  const loadLeaderboard = async (groupId) => {
    setSelectedGroup(groupId)
    setError('')
    try {
      const board = await withAuth((token) => api.groupLeaderboard(groupId, token))
      setLeaderboard(board || [])
    } catch (e) {
      setError(e.message)
    }
  }

  const saveTimezone = async () => {
    setError('')
    try {
      await withAuth((token) => api.updateProfile({ timezone }, token))
      await loadAll()
    } catch (e) {
      setError(e.message)
    }
  }

  const uploadAvatar = async () => {
    if (!avatarFile) {
      return
    }
    setError('')
    try {
      await withAuth((token) => api.uploadAvatar(avatarFile, token))
      setAvatarFile(null)
      await loadAll()
    } catch (e) {
      setError(e.message)
    }
  }

  const logoutEverywhere = async () => {
    try {
      if (session.refreshToken) {
        await api.logout({ refresh_token: session.refreshToken }, session.accessToken)
      }
    } finally {
      onLogout()
    }
  }

  if (loading) {
    return <main className="dashboard"><p className="loading">Loading your playful productivity zone...</p></main>
  }

  return (
    <main className="dashboard">
      <header>
        <div className="profile-head">
          {profile?.avatar_url ? <img className="avatar" src={`${API_BASE}${profile.avatar_url}`} alt="avatar" /> : null}
          <div>
            <h2>Hi, {profile?.username}</h2>
            <p>Consistency beats intensity. Keep stacking tiny wins.</p>
          </div>
        </div>
        <button type="button" onClick={logoutEverywhere}>Logout</button>
      </header>

      <section className="grid">
        <div className="left-column">
          <form onSubmit={submitHabit} className="card form-card" data-testid="create-habit-form">
            <h3>Create habit</h3>
            <label>
              Title
              <input required value={habitForm.title} onChange={(e) => setHabitForm({ ...habitForm, title: e.target.value })} />
            </label>

            <label>
              Description
              <textarea value={habitForm.description} onChange={(e) => setHabitForm({ ...habitForm, description: e.target.value })} />
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
                Group
                <select
                  required
                  value={habitForm.group_id}
                  onChange={(e) => setHabitForm({ ...habitForm, group_id: e.target.value })}
                >
                  <option value="">Select group</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ))}
                </select>
              </label>
            ) : null}

            <button type="submit">Create habit</button>
          </form>

          <div className="card form-card">
            <h3>Profile lab</h3>
            <label>
              Timezone
              <input value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="Europe/Berlin" />
            </label>
            <button type="button" onClick={saveTimezone}>Save timezone</button>

            <label>
              Avatar
              <input type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} />
            </label>
            <button type="button" onClick={uploadAvatar}>Upload avatar</button>
          </div>

          <form onSubmit={submitGroup} className="card form-card">
            <h3>Create group</h3>
            <label>
              Group name
              <input required value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} />
            </label>
            <button type="submit">Create group</button>
          </form>

          <form onSubmit={submitJoin} className="card form-card">
            <h3>Join by code</h3>
            <label>
              Invite code
              <input required value={inviteCode} onChange={(e) => setInviteCode(e.target.value)} />
            </label>
            <button type="submit">Join group</button>
          </form>
        </div>

        <section className="right-column">
          <h3>Your habits</h3>
          <div className="habit-list">
            {habits.length ? (
              habits.map((habit) => (
                <HabitCard
                  key={habit.id}
                  habit={habit}
                  accessToken={session.accessToken}
                  refreshHabits={loadAll}
                  withAuth={withAuth}
                />
              ))
            ) : (
              <p className="empty">No habits yet. Create your first one.</p>
            )}
          </div>

          <h3>Groups and leaderboard</h3>
          <div className="group-list">
            {groups.map((group) => (
              <button
                key={group.id}
                type="button"
                className={String(selectedGroup) === String(group.id) ? 'group-pill active' : 'group-pill'}
                onClick={() => loadLeaderboard(group.id)}
              >
                {group.name} ({group.member_count})
              </button>
            ))}
          </div>
          {selectedGroup ? (
            <ul className="records">
              {leaderboard.map((item) => (
                <li key={item.user_id}>
                  <strong>{item.username}</strong>
                  <span>{item.completions} done</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty">Tap a group to load leaderboard.</p>
          )}

          <h3>Weekly analytics</h3>
          <div className="chart-card">
            {analytics.weekly_chart.map((point) => (
              <div key={point.day} className="bar-row">
                <span>{point.day}</span>
                <div className="bar-wrap">
                  <div className="bar" style={{ width: `${Math.min(100, point.completions * 20)}%` }} />
                </div>
                <strong>{point.completions}</strong>
              </div>
            ))}
          </div>

          <div className="analytics-grid">
            {analytics.habits.map((item) => (
              <article key={item.habit_id} className="analytics-card">
                <h4>{item.title}</h4>
                <p>Adherence: {item.adherence_percent}%</p>
                <p>Longest streak: {item.longest_streak} days</p>
              </article>
            ))}
          </div>
        </section>
      </section>

      {error ? <p className="error global">{error}</p> : null}
    </main>
  )
}

export default function App() {
  const [session, setSession] = useState(() => {
    const accessToken = localStorage.getItem('healthy_token')
    const refreshToken = localStorage.getItem('healthy_refresh_token')
    return accessToken ? { accessToken, refreshToken } : null
  })

  const handleSessionChange = (nextSession) => {
    if (!nextSession) {
      localStorage.removeItem('healthy_token')
      localStorage.removeItem('healthy_refresh_token')
      setSession(null)
      return
    }

    localStorage.setItem('healthy_token', nextSession.accessToken)
    localStorage.setItem('healthy_refresh_token', nextSession.refreshToken || '')
    setSession(nextSession)
  }

  const handleTokens = (tokenData) => {
    handleSessionChange({
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
    })
  }

  return (
    <div className="app-bg">
      <div className="blob one" />
      <div className="blob two" />
      <div className="blob three" />
      {session ? (
        <Dashboard session={session} onSessionChange={handleSessionChange} onLogout={() => handleSessionChange(null)} />
      ) : (
        <AuthView onTokens={handleTokens} />
      )}
    </div>
  )
}
