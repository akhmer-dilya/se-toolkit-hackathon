import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'

import App from './App'
import { api } from './api'

vi.mock('./api', () => ({
  api: {
    register: vi.fn(),
    login: vi.fn(),
    forgotPassword: vi.fn(),
    resetPassword: vi.fn(),
  },
}))

describe('Auth flow', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  test('logs in user and stores token', async () => {
    api.login.mockResolvedValue({ access_token: 'access-1', refresh_token: 'refresh-1' })

    render(<App />)

    fireEvent.change(screen.getByLabelText(/Username or email/i), { target: { value: 'alice' } })
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'pass1234' } })
    fireEvent.submit(screen.getByTestId('login-form'))

    await waitFor(() => expect(api.login).toHaveBeenCalledTimes(1))
    expect(localStorage.getItem('healthy_token')).toBe('access-1')
    expect(localStorage.getItem('healthy_refresh_token')).toBe('refresh-1')
  })

  test('switches to register tab and submits register', async () => {
    api.register.mockResolvedValue({})
    api.login.mockResolvedValue({ access_token: 'access-2', refresh_token: 'refresh-2' })

    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: /register/i }))

    fireEvent.change(screen.getByLabelText(/^Username$/i), { target: { value: 'newbie' } })
    fireEvent.change(screen.getByLabelText(/^Email$/i), { target: { value: 'newbie@example.com' } })
    fireEvent.change(screen.getByLabelText(/^Password$/i), { target: { value: 'pass1234' } })
    fireEvent.submit(screen.getByTestId('register-form'))

    await waitFor(() => expect(api.register).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(api.login).toHaveBeenCalledTimes(1))
  })
})
