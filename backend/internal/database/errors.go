package database

import "errors"

// ErrEmptyContentSeed is returned when the embedded content seed is missing.
var ErrEmptyContentSeed = errors.New("embedded content seed is empty — run export-content-sql and sync backend/db/seeds/")
