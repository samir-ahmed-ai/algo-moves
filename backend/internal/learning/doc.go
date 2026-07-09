// Package learning persists user-scoped learner state — per-problem progress, the
// FSRS spaced-repetition schedule, an append-only attempt log, notes, bookmarks,
// and course enrollments. It mirrors the owner-scoped CRUD shape of package prep:
// every endpoint requires a signed-in (non-anonymous) profile and is scoped by
// profile_id. Server sync is an enhancement layered on the client's localStorage;
// guests never reach these handlers.
package learning
