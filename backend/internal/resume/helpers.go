package resume

import "github.com/jackc/pgx/v5/pgtype"

func optionalBool(v *bool) pgtype.Bool {
	if v == nil {
		return pgtype.Bool{Valid: false}
	}
	return pgtype.Bool{Bool: *v, Valid: true}
}
