package db

import "embed"

//go:embed migrations/*.sql
var Migrations embed.FS

//go:embed seeds/content_seed.sql
var ContentSeedSQL []byte
