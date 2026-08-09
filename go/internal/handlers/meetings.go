package handlers

import (
	"net/http"
	"time"

	"ruangbaru/go/internal/livekit"
)

type meetingRow struct {
	ID          string `json:"id"`
	RoomName    string `json:"room_name"`
	CreatedBy   string `json:"created_by"`
	WorkspaceID string `json:"workspace_id"`
}

// Port of app/api/meetings/token/route.ts.
func (a *App) MeetingsToken(w http.ResponseWriter, r *http.Request) {
	if !a.Cfg.LiveKitConfigured() {
		writeError(w, http.StatusServiceUnavailable, "not_configured")
		return
	}

	var body struct {
		Room string `json:"room"`
	}
	if err := readJSON(r, &body); err != nil || body.Room == "" {
		writeError(w, http.StatusBadRequest, "missing_room")
		return
	}

	user, token, err := a.authenticatedUser(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var meetings []meetingRow
	path := "/meetings?select=id,workspace_id&room_name=eq." + body.Room + "&limit=1"
	if err := a.Supa.UserRequest(r.Context(), "GET", path, token, nil, &meetings); err != nil || len(meetings) == 0 {
		writeError(w, http.StatusNotFound, "meeting_not_found")
		return
	}
	meeting := meetings[0]

	var members []struct {
		UserID string `json:"user_id"`
	}
	memberPath := "/workspace_members?select=user_id&workspace_id=eq." + meeting.WorkspaceID + "&user_id=eq." + user.ID + "&limit=1"
	_ = a.Supa.UserRequest(r.Context(), "GET", memberPath, token, nil, &members)
	if len(members) == 0 {
		writeError(w, http.StatusForbidden, "forbidden")
		return
	}

	var profiles []struct {
		FullName string `json:"full_name"`
	}
	_ = a.Supa.UserRequest(r.Context(), "GET", "/profiles?select=full_name&id=eq."+user.ID+"&limit=1", token, nil, &profiles)
	name := "Anggota"
	if len(profiles) > 0 && profiles[0].FullName != "" {
		name = profiles[0].FullName
	} else if user.Email != "" {
		name = user.Email
	}

	jwt, err := livekit.ParticipantToken(a.Cfg.LiveKitAPIKey, a.Cfg.LiveKitAPISecret, user.ID, name, body.Room, 2*time.Hour)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"token": jwt, "url": a.Cfg.LiveKitURL})
}

// Port of app/api/meetings/end/route.ts. Only the meeting's creator may end
// it for everyone.
func (a *App) MeetingsEnd(w http.ResponseWriter, r *http.Request) {
	var body struct {
		MeetingID string `json:"meetingId"`
	}
	if err := readJSON(r, &body); err != nil || body.MeetingID == "" {
		writeError(w, http.StatusBadRequest, "missing_meeting")
		return
	}

	user, token, err := a.authenticatedUser(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var meetings []meetingRow
	path := "/meetings?select=id,room_name,created_by&id=eq." + body.MeetingID + "&limit=1"
	if err := a.Supa.UserRequest(r.Context(), "GET", path, token, nil, &meetings); err != nil || len(meetings) == 0 {
		writeError(w, http.StatusNotFound, "not_found")
		return
	}
	meeting := meetings[0]
	if meeting.CreatedBy != user.ID {
		writeError(w, http.StatusForbidden, "forbidden")
		return
	}

	updatePath := "/meetings?id=eq." + meeting.ID
	_ = a.Supa.UserRequest(r.Context(), "PATCH", updatePath, token, map[string]string{
		"status":   "ended",
		"ended_at": nowISO(),
	}, nil)

	if a.Cfg.LiveKitConfigured() {
		_ = a.roomService().DeleteRoom(r.Context(), meeting.RoomName) // best-effort, room may not exist
	}

	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func nowISO() string {
	return time.Now().UTC().Format(time.RFC3339)
}
