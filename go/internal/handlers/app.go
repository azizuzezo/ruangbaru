// Package handlers holds one file per route group, mirroring the
// app/api/**/route.ts layout in the Next.js app 1:1 so the two are easy to
// diff against each other while the port is in progress. See
// go/PORT_STATUS.md for which of these are verified-equivalent vs.
// best-effort.
package handlers

import (
	"encoding/json"
	"errors"
	"log"
	"net/http"

	"ruangbaru/go/internal/config"
	"ruangbaru/go/internal/googlecal"
	"ruangbaru/go/internal/livekit"
	"ruangbaru/go/internal/mail"
	"ruangbaru/go/internal/supa"
)

// App holds every dependency a handler might need. Constructed once in
// main() and passed to each handler group's constructor.
type App struct {
	Cfg    *config.Config
	Supa   *supa.Client
	Mail   *mail.Client
	Google *googlecal.Client
}

func New(cfg *config.Config) *App {
	return &App{
		Cfg:    cfg,
		Supa:   supa.New(cfg),
		Mail:   mail.New(cfg.ResendAPIKey, cfg.ResendEmailFrom),
		Google: googlecal.New(cfg.GoogleClientID, cfg.GoogleClientSecret),
	}
}

func (a *App) roomService() *livekit.RoomService {
	return livekit.NewRoomService(a.Cfg.LiveKitURL, a.Cfg.LiveKitAPIKey, a.Cfg.LiveKitAPISecret)
}

// writeJSON is the equivalent of NextResponse.json(body, {status}).
func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if body != nil {
		if err := json.NewEncoder(w).Encode(body); err != nil {
			log.Printf("writeJSON encode error: %v", err)
		}
	}
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

// readJSON is the equivalent of the routes' `try { body = await req.json() }
// catch { return 400 }` pattern.
func readJSON(r *http.Request, out any) error {
	defer r.Body.Close()
	return json.NewDecoder(r.Body).Decode(out)
}

// bearerToken extracts the caller's Supabase access token. The Next.js
// routes read this from the @supabase/ssr session cookie automatically;
// a Go backend fronted by the same frontend can accept either an
// Authorization: Bearer header (recommended for new frontend calls) or the
// sb-<ref>-auth-token cookie (for drop-in compatibility with code that
// still relies on the cookie session — see supa/cookies.go's caveats).
func bearerToken(r *http.Request) string {
	if h := r.Header.Get("Authorization"); len(h) > 7 && h[:7] == "Bearer " {
		return h[7:]
	}
	return ""
}

// authenticatedUser mirrors every route's
// `const { data: { user } } = await supabase.auth.getUser()` + 401 check.
func (a *App) authenticatedUser(r *http.Request) (*supa.User, string, error) {
	token := bearerToken(r)
	if token == "" {
		if cookieRef := supa.ProjectRef(a.Cfg.SupabaseURL); cookieRef != "" {
			cookies := map[string]string{}
			for _, c := range r.Cookies() {
				cookies[c.Name] = c.Value
			}
			if session, err := supa.DecodeSessionCookie(cookies, cookieRef); err == nil {
				token = session.AccessToken
			}
		}
	}
	if token == "" {
		return nil, "", errUnauthenticated
	}
	user, err := a.Supa.GetUser(r.Context(), token)
	if err != nil {
		return nil, "", err
	}
	return user, token, nil
}

var errUnauthenticated = errors.New("unauthenticated")
