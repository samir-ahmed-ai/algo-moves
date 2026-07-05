package arcade

import "os"

// envEnabled reports whether name is set to a truthy value (1 or true, any case).
func envEnabled(name string) bool {
	v := os.Getenv(name)
	return v == "1" || v == "true" || v == "TRUE" || v == "True"
}
