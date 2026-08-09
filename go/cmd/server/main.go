// Command server is the Go backend for RuangBaru — a 1:1 port of the
// Next.js app's server actions and API routes (see go/PORT_STATUS.md for
// the route-by-route inventory and port status). It does NOT replace
// Supabase: all direct CRUD (projects, tasks, notes, calendar, team,
// billing) still goes straight from the browser to Supabase's own REST
// API exactly as it does today. This service only replaces the handful of
// endpoints that need a server-only secret (service-role key, Resend API
// key, Groq API key, Google OAuth client secret, LiveKit API secret).
package main

import (
	"log"
	"net/http"
	"time"

	"ruangbaru/go/internal/config"
	"ruangbaru/go/internal/handlers"
)

func withCORS(cfg *config.Config, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := cfg.AppURL
		if h := r.Header.Get("Origin"); h != "" {
			origin = h // reflect the calling origin; credentials require an exact match, not "*"
		}
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func withLogging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s %s", r.Method, r.URL.Path, time.Since(start))
	})
}

func main() {
	cfg := config.Load()
	app := handlers.New(cfg)

	mux := http.NewServeMux()

	mux.HandleFunc("GET /healthz", app.Health)

	// lib/supabase/actions.ts
	mux.HandleFunc("POST /api/auth/signin", app.AuthSignIn)
	mux.HandleFunc("POST /api/auth/signup", app.AuthSignUp)
	mux.HandleFunc("POST /api/auth/signout", app.AuthSignOut)
	mux.HandleFunc("POST /api/auth/reset-password", app.AuthResetPassword)
	mux.HandleFunc("GET /api/auth/google/start", app.AuthGoogleStart)
	mux.HandleFunc("GET /api/auth/user", app.AuthGetUser)
	mux.HandleFunc("GET /api/auth/profile", app.AuthGetProfile)
	mux.HandleFunc("GET /auth/callback", app.AuthCallback)

	// app/api/**/route.ts — same paths, so the frontend's fetch calls don't
	// need to change if this service is mounted behind the same origin
	// (e.g. an ingress rule that routes /api/* to this service).
	mux.HandleFunc("POST /api/auth/forgot-password", app.ForgotPassword)
	mux.HandleFunc("POST /api/chat", app.Chat)
	mux.HandleFunc("POST /api/support/ticket", app.SupportTicket)
	mux.HandleFunc("POST /api/invitations/send", app.InvitationsSend)
	mux.HandleFunc("GET /api/admin/workspaces", app.AdminListWorkspaces)
	mux.HandleFunc("POST /api/admin/update-plan", app.AdminUpdatePlan)
	mux.HandleFunc("GET /api/google/connect", app.GoogleConnect)
	mux.HandleFunc("GET /api/google/callback", app.GoogleCallback)
	mux.HandleFunc("POST /api/google/sync", app.GoogleSync)
	mux.HandleFunc("POST /api/meetings/token", app.MeetingsToken)
	mux.HandleFunc("POST /api/meetings/end", app.MeetingsEnd)

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           withLogging(withCORS(cfg, mux)),
		ReadHeaderTimeout: 10 * time.Second,
	}

	log.Printf("ruangbaru go backend listening on :%s", cfg.Port)
	if err := srv.ListenAndServe(); err != nil {
		log.Fatal(err)
	}
}
