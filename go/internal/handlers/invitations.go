package handlers

import (
	"net/http"
	"strings"
)

type invitationRow struct {
	Email       string `json:"email"`
	Token       string `json:"token"`
	WorkspaceID string `json:"workspace_id"`
	Workspace   *struct {
		Name string `json:"name"`
	} `json:"workspace"`
}

type memberRow struct {
	WorkspaceID string `json:"workspace_id"`
	Role        string `json:"role"`
}

// Port of app/api/invitations/send/route.ts. Only trusts invitation
// tokens — email, workspace name, and inviter name are always read back
// from the database (via the caller's own RLS-scoped session, not the
// service-role key), and the caller must be admin/owner of the invitation's
// workspace, exactly matching the Node route's security posture.
func (a *App) InvitationsSend(w http.ResponseWriter, r *http.Request) {
	user, token, err := a.authenticatedUser(r)
	if err != nil {
		writeError(w, http.StatusUnauthorized, "Unauthorized")
		return
	}

	if !a.Mail.Configured() {
		writeJSON(w, http.StatusOK, map[string]any{"error": "Email not configured", "sent": 0})
		return
	}

	var body struct {
		Invitations []struct {
			Token string `json:"token"`
		} `json:"invitations"`
	}
	if err := readJSON(r, &body); err != nil {
		writeError(w, http.StatusBadRequest, "Invalid body")
		return
	}

	seen := map[string]bool{}
	var tokens []string
	for _, inv := range body.Invitations {
		if inv.Token != "" && !seen[inv.Token] {
			seen[inv.Token] = true
			tokens = append(tokens, inv.Token)
		}
	}
	if len(tokens) == 0 {
		writeError(w, http.StatusBadRequest, "No invitations")
		return
	}

	var inviteRows []invitationRow
	invitesPath := "/workspace_invitations?select=email,token,workspace_id,workspace:workspaces(name)" +
		"&token=in.(" + strings.Join(tokens, ",") + ")&accepted_at=is.null"
	if err := a.Supa.UserRequest(r.Context(), "GET", invitesPath, token, nil, &inviteRows); err != nil || len(inviteRows) == 0 {
		writeError(w, http.StatusNotFound, "No pending invitations found for the given tokens")
		return
	}

	workspaceIDSet := map[string]bool{}
	var workspaceIDs []string
	for _, row := range inviteRows {
		if !workspaceIDSet[row.WorkspaceID] {
			workspaceIDSet[row.WorkspaceID] = true
			workspaceIDs = append(workspaceIDs, row.WorkspaceID)
		}
	}

	var memberRows []memberRow
	membersPath := "/workspace_members?select=workspace_id,role&user_id=eq." + user.ID +
		"&workspace_id=in.(" + strings.Join(workspaceIDs, ",") + ")"
	_ = a.Supa.UserRequest(r.Context(), "GET", membersPath, token, nil, &memberRows)

	adminWorkspaceIDs := map[string]bool{}
	for _, m := range memberRows {
		if m.Role == "owner" || m.Role == "admin" {
			adminWorkspaceIDs[m.WorkspaceID] = true
		}
	}

	var profiles []struct {
		FullName string `json:"full_name"`
		Email    string `json:"email"`
	}
	_ = a.Supa.UserRequest(r.Context(), "GET", "/profiles?select=full_name,email&id=eq."+user.ID, token, nil, &profiles)
	inviterName := "Rekan tim"
	if len(profiles) > 0 {
		if profiles[0].FullName != "" {
			inviterName = profiles[0].FullName
		} else if profiles[0].Email != "" {
			inviterName = profiles[0].Email
		}
	}

	var sendable []invitationRow
	for _, row := range inviteRows {
		if adminWorkspaceIDs[row.WorkspaceID] {
			sendable = append(sendable, row)
		}
	}
	if len(sendable) == 0 {
		writeError(w, http.StatusForbidden, "Not an admin of the invitation workspace")
		return
	}

	sent := 0
	var errs []string
	for _, row := range sendable {
		wsName := "RuangBaru"
		if row.Workspace != nil && row.Workspace.Name != "" {
			wsName = row.Workspace.Name
		}
		if err := a.Mail.SendWorkspaceInvitation(r.Context(), row.Email, wsName, inviterName, a.Cfg.AppURL, row.Token); err != nil {
			errs = append(errs, err.Error())
		} else {
			sent++
		}
	}

	writeJSON(w, http.StatusOK, map[string]any{"sent": sent, "failed": len(errs), "errors": errs})
}
