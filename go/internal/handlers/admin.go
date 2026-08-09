package handlers

import (
	"errors"
	"net/http"
)

// Port of app/api/admin/workspaces/route.ts.
func (a *App) AdminListWorkspaces(w http.ResponseWriter, r *http.Request) {
	user, _, err := a.authenticatedUser(r)
	if err != nil || !a.Cfg.IsAdminEmail(user.Email) {
		writeError(w, http.StatusForbidden, "Unauthorized")
		return
	}

	var workspaces []map[string]any
	path := "/rest/v1/workspaces?select=" +
		"id,name,slug,plan,created_at,owner:profiles!owner_id(id,full_name,email),member_count:workspace_members(count)" +
		"&order=created_at.desc"
	if err := a.Supa.AdminRequest(r.Context(), "GET", path, nil, &workspaces); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"workspaces": workspaces})
}

var validPlans = map[string]bool{"free": true, "pro": true, "business": true, "enterprise": true}

// Port of app/api/admin/update-plan/route.ts.
func (a *App) AdminUpdatePlan(w http.ResponseWriter, r *http.Request) {
	user, _, err := a.authenticatedUser(r)
	if err != nil || !a.Cfg.IsAdminEmail(user.Email) {
		writeError(w, http.StatusForbidden, "Unauthorized")
		return
	}

	var body struct {
		WorkspaceID string `json:"workspaceId"`
		Plan        string `json:"plan"`
	}
	if err := readJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid JSON body")
		return
	}
	if body.WorkspaceID == "" {
		writeError(w, http.StatusBadRequest, "workspaceId is required")
		return
	}
	if !validPlans[body.Plan] {
		writeError(w, http.StatusBadRequest, "plan must be one of: free, pro, business, enterprise")
		return
	}

	var rows []map[string]any
	path := "/rest/v1/workspaces?id=eq." + body.WorkspaceID + "&select=id,name,plan"
	if err := a.Supa.AdminRequest(r.Context(), "PATCH", path, map[string]string{"plan": body.Plan}, &rows); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if len(rows) == 0 {
		writeError(w, http.StatusInternalServerError, errors.New("workspace not found").Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"success": true, "workspace": rows[0]})
}
