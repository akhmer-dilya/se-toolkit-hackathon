import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import App from './App'
import { api } from './api'

vi.mock('./api', () => ({
  api: {
    me: vi.fn(),
    listHabits: vi.fn(),
    listGroups: vi.fn(),
    analyticsOverview: vi.fn(),
    listHabitRecords: vi.fn(),
    trackHabit: vi.fn(),
    refresh: vi.fn(),
    createHabit: vi.fn(),
    createGroup: vi.fn(),
    joinGroup: vi.fn(),
    groupLeaderboard: vi.fn(),
    updateProfile: vi.fn(),
    uploadAvatar: vi.fn(),
    logout: vi.fn(),
  },
}))

describe('Habit tracking UI', () => {
  beforeEach(() => {
    localStorage.setItem('healthy_token', 'access-token')
    localStorage.setItem('healthy_refresh_token', 'refresh-token')
    vi.clearAllMocks()

    api.me.mockResolvedValue({ username: 'alice', timezone: 'UTC', avatar_url: null })
    api.listHabits.mockResolvedValue([
      { id: 1, title: 'Read', description: 'Read pages', frequency_per_week: 3, is_group: false },
    ])
    api.listGroups.mockResolvedValue([])
    api.analyticsOverview.mockResolvedValue({ weekly_chart: [], habits: [] })
    api.listHabitRecords.mockResolvedValue([])
    api.trackHabit.mockResolvedValue({ id: 11 })
  })

  test('tracks a habit from card', async () => {
    render(<App />)

    await screen.findByText(/Your habits/i)

    fireEvent.click(screen.getByRole('button', { name: /Show records/i }))
    await waitFor(() => expect(api.listHabitRecords).toHaveBeenCalled())

    fireEvent.change(screen.getByPlaceholderText(/Optional note for today/i), { target: { value: 'Done now' } })
    fireEvent.click(screen.getByRole('button', { name: /Track today/i }))

    await waitFor(() => expect(api.trackHabit).toHaveBeenCalled())
  })
})
