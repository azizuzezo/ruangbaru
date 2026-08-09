package handlers

import (
	"net/http"
	"strings"

	"ruangbaru/go/internal/supa"
)

// Port of app/api/auth/forgot-password/route.ts. Always responds
// {"success": true} regardless of whether the email exists, to avoid
// email enumeration — same as the Node route.
func (a *App) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var body struct {
		Email string `json:"email"`
	}
	if err := readJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid body")
		return
	}
	email := strings.ToLower(strings.TrimSpace(body.Email))
	if email == "" {
		writeError(w, http.StatusBadRequest, "Email diperlukan")
		return
	}

	success := map[string]bool{"success": true}

	if !a.Mail.Configured() {
		// Resend not configured — fall back to Supabase's own mailer, silently.
		_ = a.Supa.ResetPasswordForEmail(r.Context(), email, "")
		writeJSON(w, http.StatusOK, success)
		return
	}

	redirectTo := a.Cfg.AppURL + "/auth/callback?next=/reset-password"
	link, err := a.Supa.GenerateLink(r.Context(), supa.LinkTypeRecovery, email, "", redirectTo, nil)
	if err != nil || link == "" {
		// User may not exist — return success silently anyway.
		writeJSON(w, http.StatusOK, success)
		return
	}

	if err := a.Mail.SendPasswordReset(r.Context(), email, link); err != nil {
		// Don't leak error details to the client.
		writeJSON(w, http.StatusOK, success)
		return
	}
	writeJSON(w, http.StatusOK, success)
}
