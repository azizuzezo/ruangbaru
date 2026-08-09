// Port of lib/supabase/actions.ts. These were Next.js Server Actions bound
// to <form action={...}> elements; here they're plain JSON POST endpoints,
// since a Go backend has no equivalent of a Server Action — wiring the
// frontend's forms to call these instead is the remaining integration step
// (see go/PORT_STATUS.md).
package handlers

import (
	"net/http"

	"ruangbaru/go/internal/supa"
)

func setSessionCookie(w http.ResponseWriter, ref string, session *supa.Session) {
	cookies, err := supa.EncodeSessionCookies(ref, session)
	if err != nil {
		return
	}
	for name, value := range cookies {
		http.SetCookie(w, &http.Cookie{
			Name: name, Value: value, Path: "/", HttpOnly: true, Secure: true, SameSite: http.SameSiteLaxMode,
			MaxAge: session.ExpiresIn,
		})
	}
}

func clearSessionCookie(w http.ResponseWriter, ref string) {
	http.SetCookie(w, &http.Cookie{
		Name: supa.SessionCookieName(ref), Value: "", Path: "/", MaxAge: -1,
	})
}

// AuthSignIn is the equivalent of actions.ts's signIn().
func (a *App) AuthSignIn(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := readJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid body")
		return
	}

	session, err := a.Supa.SignInWithPassword(r.Context(), body.Email, body.Password)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]string{"error": err.Error()})
		return
	}
	setSessionCookie(w, supa.ProjectRef(a.Cfg.SupabaseURL), session)
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "session": session})
}

// AuthSignUp is the equivalent of actions.ts's signUp() — same
// Resend-branded-email-first, Supabase-mailer-fallback logic.
func (a *App) AuthSignUp(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email         string `json:"email"`
		Password      string `json:"password"`
		FullName      string `json:"full_name"`
		WorkspaceName string `json:"workspace_name"`
	}
	if err := readJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid body")
		return
	}

	origin := originOf(r)
	redirectTo := origin + "/auth/callback"
	userData := map[string]any{"full_name": body.FullName}
	if body.WorkspaceName != "" {
		userData["workspace_name"] = body.WorkspaceName
	}

	if a.Mail.Configured() && a.Cfg.SupabaseServiceKey != "" {
		link, err := a.Supa.GenerateLink(r.Context(), supa.LinkTypeSignup, body.Email, body.Password, redirectTo, userData)
		if err != nil {
			writeJSON(w, http.StatusOK, map[string]string{"error": err.Error()})
			return
		}
		if err := a.Mail.SendConfirmationEmail(r.Context(), body.Email, body.FullName, link); err != nil {
			writeJSON(w, http.StatusOK, map[string]string{"error": "Gagal mengirim email konfirmasi. Coba lagi."})
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"success": "Check your email to confirm your account."})
		return
	}

	if err := a.Supa.SignUp(r.Context(), body.Email, body.Password, redirectTo, userData); err != nil {
		writeJSON(w, http.StatusOK, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"success": "Check your email to confirm your account."})
}

// AuthSignOut is the equivalent of actions.ts's signOut().
func (a *App) AuthSignOut(w http.ResponseWriter, r *http.Request) {
	if _, token, err := a.authenticatedUser(r); err == nil {
		_ = a.Supa.SignOut(r.Context(), token)
	}
	clearSessionCookie(w, supa.ProjectRef(a.Cfg.SupabaseURL))
	writeJSON(w, http.StatusOK, map[string]bool{"success": true})
}

// AuthResetPassword is the equivalent of actions.ts's resetPassword() — the
// plain Supabase-mailer path (the branded-email path lives at
// /api/auth/forgot-password, see forgotpassword.go).
func (a *App) AuthResetPassword(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email string `json:"email"`
	}
	if err := readJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid body")
		return
	}
	redirectTo := originOf(r) + "/auth/callback?next=/reset-password"
	if err := a.Supa.ResetPasswordForEmail(r.Context(), body.Email, redirectTo); err != nil {
		writeJSON(w, http.StatusOK, map[string]string{"error": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"success": "Password reset email sent. Check your inbox."})
}

// AuthGoogleStart is the equivalent of actions.ts's signInWithGoogle(next) —
// returns the authorize URL for the frontend to redirect to, instead of a
// server-side redirect() (Go has no direct equivalent of a Server Action
// return-and-redirect).
func (a *App) AuthGoogleStart(w http.ResponseWriter, r *http.Request) {
	next := r.URL.Query().Get("next")
	callback := originOf(r) + "/auth/callback"
	redirectTo := callback
	if next != "" {
		redirectTo = callback + "?next=" + next
	}
	writeJSON(w, http.StatusOK, map[string]string{"url": a.Supa.OAuthAuthorizeURL("google", redirectTo)})
}

// AuthCallback is the equivalent of app/auth/callback/route.ts — the PKCE
// code exchange. Best-effort: see supa.ExchangeCodeForSession's caveat
// about the code_verifier cookie format.
func (a *App) AuthCallback(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	next := r.URL.Query().Get("next")
	if next == "" {
		next = "/dashboard"
	}

	if code != "" {
		ref := supa.ProjectRef(a.Cfg.SupabaseURL)
		verifierCookie, err := r.Cookie(supa.SessionCookieName(ref) + "-code-verifier")
		if err == nil {
			session, exErr := a.Supa.ExchangeCodeForSession(r.Context(), code, verifierCookie.Value)
			if exErr == nil {
				setSessionCookie(w, ref, session)
				http.Redirect(w, r, a.Cfg.AppURL+next, http.StatusFound)
				return
			}
		}
	}
	http.Redirect(w, r, a.Cfg.AppURL+"/login?error=auth-code-exchange-failed", http.StatusFound)
}

// AuthGetUser is the equivalent of actions.ts's getUser() — returns null
// rather than an error when there's no session, matching the original's
// permissive behavior.
func (a *App) AuthGetUser(w http.ResponseWriter, r *http.Request) {
	user, _, err := a.authenticatedUser(r)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]any{"user": nil})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"user": user})
}

// AuthGetProfile is the equivalent of actions.ts's getProfile().
func (a *App) AuthGetProfile(w http.ResponseWriter, r *http.Request) {
	user, token, err := a.authenticatedUser(r)
	if err != nil {
		writeJSON(w, http.StatusOK, map[string]any{"profile": nil})
		return
	}
	var profiles []map[string]any
	_ = a.Supa.UserRequest(r.Context(), "GET", "/profiles?select=*&id=eq."+user.ID+"&limit=1", token, nil, &profiles)
	if len(profiles) == 0 {
		writeJSON(w, http.StatusOK, map[string]any{"profile": nil})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"profile": profiles[0]})
}
