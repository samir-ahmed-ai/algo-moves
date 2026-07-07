// Package platform provides shared persistence, authentication, sessions, and
// migrations for the game server. Domain packages (games, interview, content,
// canvas, prep) depend on platform for profiles and Postgres access but must
// not import each other.
package platform
