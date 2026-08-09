package handlers

import "net/http"

// Health is a k8s liveness/readiness probe target — no Next.js equivalent
// existed, added because the deployment manifests need one.
func (a *App) Health(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
