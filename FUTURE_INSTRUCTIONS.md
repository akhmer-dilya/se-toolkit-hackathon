# Future instructions for next iteration

When continuing this project, follow this order:

1. Add Alembic migrations and stop relying on runtime `create_all`.
2. Add automated tests:
   - backend: pytest + httpx TestClient for auth and habits
   - frontend: component tests for auth flow and habit tracking
3. Improve auth:
   - refresh tokens
   - token blacklist on logout (optional)
   - password reset flow
4. Add profile improvements:
   - avatar upload
   - timezone setting
   - streak counters based on timezone
5. Expand group habits:
   - create real groups table
   - invite/join by code
   - show group leaderboard
6. Add analytics dashboard:
   - weekly completion chart
   - longest streak per habit
   - habit adherence percentage

Important process note:
- Update start_all.sh at every step so project startup stays one-command and aligned with latest changes.

Implementation quality bar:
- Keep backend endpoint contracts stable and documented in README.
- Be very thorough with frontend implementation quality (UX, states, responsiveness, edge cases).
- Keep frontend mobile-first and visually playful.
- Keep commits small and focused per feature.
