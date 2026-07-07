// Package arcade is the composition root for /api routes. It delegates to
// platform (auth, profiles, migrations) and domain packages (games, interview,
// content, canvas, prep) while keeping one deployable gameserver binary.
package arcade
