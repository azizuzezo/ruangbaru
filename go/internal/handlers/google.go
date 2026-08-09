package handlers

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"time"

	"ruangbaru/go/internal/googlecal"
)

// Port of app/api/google/connect/route.ts — kicks off the OAuth flow.
func (a *App) GoogleConnect(w http.ResponseWriter, r *http.Request) {
	workspace := r.URL.Query().Get("workspace")
	if !a.Google.Configured() {
		http.Redirect(w, r, fmt.Sprintf("/%s/calendar?google=not_configured", workspace), http.StatusFound)
		return
	}
	state, _ := json.Marshal(map[string]string{"w": workspace})
	encodedState := base64.RawURLEncoding.EncodeToString(state)
	redirect := googlecal.RedirectURI(originOf(r))
	http.Redirect(w, r, a.Google.BuildAuthURL(encodedState, redirect), http.StatusFound)
}

// Port of app/api/google/callback/route.ts — exchanges the code and stores
// the tokens on google_calendar_connections.
func (a *App) GoogleCallback(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	code := q.Get("code")
	state := q.Get("state")

	workspaceSlug := ""
	if raw, err := base64.RawURLEncoding.DecodeString(state); err == nil {
		var v struct {
			W string `json:"w"`
		}
		if json.Unmarshal(raw, &v) == nil {
			workspaceSlug = v.W
		}
	}
	back := func(status string) string {
		slug := workspaceSlug
		if slug == "" {
			slug = "dashboard"
		}
		return fmt.Sprintf("/%s/calendar?google=%s", slug, status)
	}

	if q.Get("error") != "" {
		http.Redirect(w, r, back("denied"), http.StatusFound)
		return
	}
	if code == "" || !a.Google.Configured() {
		http.Redirect(w, r, back("error"), http.StatusFound)
		return
	}

	user, token, err := a.authenticatedUser(r)
	if err != nil {
		http.Redirect(w, r, "/login", http.StatusFound)
		return
	}

	var workspaces []struct {
		ID string `json:"id"`
	}
	_ = a.Supa.UserRequest(r.Context(), "GET", "/workspaces?select=id&slug=eq."+url.QueryEscape(workspaceSlug)+"&limit=1", token, nil, &workspaces)
	if len(workspaces) == 0 {
		http.Redirect(w, r, back("error"), http.StatusFound)
		return
	}
	ws := workspaces[0]

	tok, err := a.Google.ExchangeCode(r.Context(), code, googlecal.RedirectURI(originOf(r)))
	if err != nil {
		http.Redirect(w, r, back("error"), http.StatusFound)
		return
	}
	email, _ := a.Google.GetUserEmail(r.Context(), tok.AccessToken)
	expiry := time.Now().Add(time.Duration(tok.ExpiresIn) * time.Second)
	if tok.ExpiresIn == 0 {
		expiry = time.Now().Add(time.Hour)
	}

	row := map[string]any{
		"user_id":      user.ID,
		"workspace_id": ws.ID,
		"google_email": email,
		"access_token": tok.AccessToken,
		"token_expiry": expiry.UTC().Format(time.RFC3339),
		"updated_at":   time.Now().UTC().Format(time.RFC3339),
	}
	// Google only returns a refresh_token on first consent — keep the old one otherwise.
	if tok.RefreshToken != "" {
		row["refresh_token"] = tok.RefreshToken
	}

	if err := a.Supa.UserUpsert(r.Context(), "google_calendar_connections", "user_id,workspace_id", token, row, nil); err != nil {
		http.Redirect(w, r, back("error"), http.StatusFound)
		return
	}
	http.Redirect(w, r, back("connected"), http.StatusFound)
}

// Port of app/api/google/sync/route.ts — two-way sync between RuangBaru
// events and the user's Google Calendar.
func (a *App) GoogleSync(w http.ResponseWriter, r *http.Request) {
	if !a.Google.Configured() {
		writeError(w, http.StatusServiceUnavailable, "not_configured")
		return
	}

	var body struct {
		WorkspaceID string `json:"workspace_id"`
	}
	if err := readJSON(r, &body); err != nil || body.WorkspaceID == "" {
		writeError(w, http.StatusBadRequest, "missing_workspace")
		return
	}

	user, token, err := a.authenticatedUser(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var conns []struct {
		ID           string `json:"id"`
		AccessToken  string `json:"access_token"`
		RefreshToken string `json:"refresh_token"`
		TokenExpiry  string `json:"token_expiry"`
		CalendarID   string `json:"calendar_id"`
	}
	connPath := "/google_calendar_connections?select=*&user_id=eq." + user.ID + "&workspace_id=eq." + body.WorkspaceID + "&limit=1"
	_ = a.Supa.UserRequest(r.Context(), "GET", connPath, token, nil, &conns)
	if len(conns) == 0 {
		writeError(w, http.StatusBadRequest, "not_connected")
		return
	}
	conn := conns[0]

	accessToken := conn.AccessToken
	expired := true
	if conn.TokenExpiry != "" {
		if t, err := time.Parse(time.RFC3339, conn.TokenExpiry); err == nil {
			expired = t.Before(time.Now().Add(60 * time.Second))
		}
	}
	if expired {
		if conn.RefreshToken == "" {
			writeError(w, http.StatusBadRequest, "reconnect_required")
			return
		}
		r2, err := a.Google.RefreshToken(r.Context(), conn.RefreshToken)
		if err != nil {
			writeError(w, http.StatusBadRequest, "reconnect_required")
			return
		}
		accessToken = r2.AccessToken
		newExpiry := time.Now().Add(time.Duration(r2.ExpiresIn) * time.Second)
		_ = a.Supa.UserRequest(r.Context(), "PATCH", "/google_calendar_connections?id=eq."+conn.ID, token, map[string]string{
			"access_token": r2.AccessToken,
			"token_expiry": newExpiry.UTC().Format(time.RFC3339),
		}, nil)
	}

	calID := conn.CalendarID
	if calID == "" {
		calID = "primary"
	}
	timeMin := time.Now().Add(-7 * 24 * time.Hour).UTC().Format(time.RFC3339)
	timeMax := time.Now().Add(60 * 24 * time.Hour).UTC().Format(time.RFC3339)
	nowISOStr := time.Now().UTC().Format(time.RFC3339)

	pulled, pushed := 0, 0

	gEvents, err := a.Google.ListEvents(r.Context(), accessToken, calID, timeMin, timeMax)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "sync_failed")
		return
	}

	var existing []struct {
		ID            string `json:"id"`
		GoogleEventID string `json:"google_event_id"`
	}
	existingPath := "/events?select=id,google_event_id&workspace_id=eq." + body.WorkspaceID + "&google_event_id=not.is.null"
	_ = a.Supa.UserRequest(r.Context(), "GET", existingPath, token, nil, &existing)
	byGID := map[string]string{}
	for _, e := range existing {
		if e.GoogleEventID != "" {
			byGID[e.GoogleEventID] = e.ID
		}
	}

	var inserts []map[string]any
	for _, g := range gEvents {
		if g.Status == "cancelled" {
			continue
		}
		loc := googlecal.GoogleToLocal(g)
		if loc == nil {
			continue
		}
		if existingID, ok := byGID[g.ID]; ok {
			_ = a.Supa.UserRequest(r.Context(), "PATCH", "/events?id=eq."+existingID, token, map[string]any{
				"title": loc.Title, "description": loc.Description, "location": loc.Location,
				"start_at": loc.StartAt, "end_at": loc.EndAt, "all_day": loc.AllDay, "synced_at": nowISOStr,
			}, nil)
			pulled++
		} else {
			inserts = append(inserts, map[string]any{
				"title": loc.Title, "description": loc.Description, "location": loc.Location,
				"start_at": loc.StartAt, "end_at": loc.EndAt, "all_day": loc.AllDay, "google_event_id": loc.GoogleEventID,
				"workspace_id": body.WorkspaceID, "created_by": user.ID,
				"color": "#10B29F", "recurrence": "none", "synced_at": nowISOStr,
			})
		}
	}
	if len(inserts) > 0 {
		_ = a.Supa.UserRequest(r.Context(), "POST", "/events", token, inserts, nil)
		pulled += len(inserts)
	}

	var localOnly []struct {
		ID          string `json:"id"`
		Title       string `json:"title"`
		Description string `json:"description"`
		Location    string `json:"location"`
		StartAt     string `json:"start_at"`
		EndAt       string `json:"end_at"`
		AllDay      bool   `json:"all_day"`
		Recurrence  string `json:"recurrence"`
	}
	localPath := fmt.Sprintf("/events?select=*&workspace_id=eq.%s&google_event_id=is.null&start_at=gte.%s&start_at=lte.%s&limit=50",
		body.WorkspaceID, url.QueryEscape(timeMin), url.QueryEscape(timeMax))
	_ = a.Supa.UserRequest(r.Context(), "GET", localPath, token, nil, &localOnly)

	for _, ev := range localOnly {
		created, err := a.Google.CreateEvent(r.Context(), accessToken, calID, googlecal.LocalToGoogle(googlecal.LocalEvent{
			Title: ev.Title, Description: ev.Description, Location: ev.Location,
			StartAt: ev.StartAt, EndAt: ev.EndAt, AllDay: ev.AllDay, Recurrence: ev.Recurrence,
		}))
		if err != nil || created == nil || created.ID == "" {
			continue // skip individual failures, matching the Node route
		}
		_ = a.Supa.UserRequest(r.Context(), "PATCH", "/events?id=eq."+ev.ID, token, map[string]string{
			"google_event_id": created.ID, "synced_at": nowISOStr,
		}, nil)
		pushed++
	}

	_ = a.Supa.UserRequest(r.Context(), "PATCH", "/google_calendar_connections?id=eq."+conn.ID, token, map[string]string{
		"last_synced_at": nowISOStr,
	}, nil)

	writeJSON(w, http.StatusOK, map[string]any{"ok": true, "pulled": pulled, "pushed": pushed})
}

func originOf(r *http.Request) string {
	scheme := "https"
	if r.TLS == nil {
		scheme = "http"
	}
	if proto := r.Header.Get("X-Forwarded-Proto"); proto != "" {
		scheme = proto
	}
	host := r.Host
	if h := r.Header.Get("X-Forwarded-Host"); h != "" {
		host = h
	}
	return scheme + "://" + host
}
