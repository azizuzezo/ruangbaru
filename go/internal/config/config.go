// Package config loads runtime configuration from environment variables.
// Mirrors the env vars already documented in the repo's .env.local.example
// and MEMORY.md section 4 — no new names are introduced.
package config

import "os"

type Config struct {
	Port string

	SupabaseURL        string
	SupabaseAnonKey    string // NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, falls back to _ANON_KEY
	SupabaseServiceKey string

	AppURL string // NEXT_PUBLIC_APP_URL, used for redirect/callback links

	ResendAPIKey    string
	ResendEmailFrom string

	GroqAPIKey string
	GroqModel  string

	GoogleClientID     string
	GoogleClientSecret string

	LiveKitAPIKey    string
	LiveKitAPISecret string
	LiveKitURL       string

	// AdminEmails are allowed to call the /api/admin/* endpoints, matching
	// the ADMIN_EMAILS allowlist hardcoded in the Next.js admin routes.
	AdminEmails []string
}

func getEnv(keys ...string) string {
	for _, k := range keys {
		if v := os.Getenv(k); v != "" {
			return v
		}
	}
	return ""
}

// Load reads configuration from the process environment. It never fails —
// missing optional integrations (Resend, Groq, Google, LiveKit) degrade the
// same way the Next.js routes do: the affected handler responds with a
// "not configured" status instead of the server refusing to start.
func Load() *Config {
	return &Config{
		Port: getEnvDefault("PORT", "8080"),

		SupabaseURL:        os.Getenv("NEXT_PUBLIC_SUPABASE_URL"),
		SupabaseAnonKey:    getEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "NEXT_PUBLIC_SUPABASE_ANON_KEY"),
		SupabaseServiceKey: os.Getenv("SUPABASE_SERVICE_ROLE_KEY"),

		AppURL: getEnvDefault("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),

		ResendAPIKey:    os.Getenv("RESEND_API_KEY"),
		ResendEmailFrom: getEnvDefault2(getEnv("RESEND_EMAIL_FROM", "RESEND_FROM_EMAIL"), "RuangBaru <no-reply@ruangbaru.my.id>"),

		GroqAPIKey: os.Getenv("GROQ_API_KEY"),
		GroqModel:  getEnvDefault("GROQ_MODEL", "llama-3.3-70b-versatile"),

		GoogleClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		GoogleClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),

		LiveKitAPIKey:    os.Getenv("LIVEKIT_API_KEY"),
		LiveKitAPISecret: os.Getenv("LIVEKIT_API_SECRET"),
		LiveKitURL:       getEnv("NEXT_PUBLIC_LIVEKIT_URL", "LIVEKIT_URL"),

		AdminEmails: []string{"aziz@duacincin.id", "aziz@skor.co"},
	}
}

func getEnvDefault(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func getEnvDefault2(v, def string) string {
	if v != "" {
		return v
	}
	return def
}

func (c *Config) GoogleConfigured() bool {
	return c.GoogleClientID != "" && c.GoogleClientSecret != ""
}

func (c *Config) LiveKitConfigured() bool {
	return c.LiveKitAPIKey != "" && c.LiveKitAPISecret != "" && c.LiveKitURL != ""
}

func (c *Config) IsAdminEmail(email string) bool {
	for _, e := range c.AdminEmails {
		if e == email {
			return true
		}
	}
	return false
}
