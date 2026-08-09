// Package supa is a thin REST client for Supabase's own APIs (GoTrue auth,
// PostgREST). There is no official heavyweight Go SDK for the admin-only
// GoTrue endpoints this app needs (generate_link, etc.), and the Node app
// itself only ever used @supabase/supabase-js as a REST wrapper — so this
// package does the same thing directly over net/http, with zero external
// dependencies.
package supa

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"ruangbaru/go/internal/config"
)

type Client struct {
	baseURL    string
	anonKey    string
	serviceKey string
	http       *http.Client
}

func New(cfg *config.Config) *Client {
	return &Client{
		baseURL:    cfg.SupabaseURL,
		anonKey:    cfg.SupabaseAnonKey,
		serviceKey: cfg.SupabaseServiceKey,
		http:       &http.Client{Timeout: 15 * time.Second},
	}
}

// APIError mirrors the {message, error_code, ...} shape GoTrue/PostgREST
// return on non-2xx responses, so handlers can pass the message straight
// through the way the Next.js routes passed through `error.message`.
type APIError struct {
	Status  int
	Message string
	Raw     json.RawMessage
}

func (e *APIError) Error() string {
	return fmt.Sprintf("supabase: %d %s", e.Status, e.Message)
}

func decodeErrorMessage(body []byte) string {
	var v struct {
		Message string `json:"message"`
		Error   string `json:"error"`
		ErrDesc string `json:"error_description"`
		Msg     string `json:"msg"`
	}
	if err := json.Unmarshal(body, &v); err != nil {
		return string(body)
	}
	for _, s := range []string{v.Message, v.ErrDesc, v.Msg, v.Error} {
		if s != "" {
			return s
		}
	}
	return string(body)
}

// do issues a request against the Supabase project and decodes a 2xx JSON
// response into out (pass nil to discard the body). bearer selects which
// credential rides in the Authorization header — the anon key for
// unauthenticated calls, a user's access token for RLS-scoped calls, or the
// service-role key for admin calls that must bypass RLS.
func (c *Client) do(ctx context.Context, method, path, apikey, bearer, prefer string, body, out any) error {
	var reqBody io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return err
		}
		reqBody = bytes.NewReader(b)
	}

	req, err := http.NewRequestWithContext(ctx, method, c.baseURL+path, reqBody)
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apikey", apikey)
	if bearer != "" {
		req.Header.Set("Authorization", "Bearer "+bearer)
	}
	if prefer != "" {
		req.Header.Set("Prefer", prefer)
	}

	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return err
	}

	if resp.StatusCode >= 300 {
		return &APIError{Status: resp.StatusCode, Message: decodeErrorMessage(respBody), Raw: respBody}
	}

	if out != nil && len(respBody) > 0 {
		if err := json.Unmarshal(respBody, out); err != nil {
			return fmt.Errorf("decoding supabase response: %w", err)
		}
	}
	return nil
}

// defaultPrefer mirrors supabase-js's default behavior when a query is
// chained with .select() — return the affected row(s). GoTrue ignores this
// header, so it's safe to send unconditionally on auth calls too.
const defaultPrefer = "return=representation"

// AuthRequest calls a GoTrue endpoint (path is relative to /auth/v1) using
// the anon key — the same credential the browser/anon Supabase client uses
// for public auth endpoints (password grant, recover, authorize, logout).
func (c *Client) AuthRequest(ctx context.Context, method, path, bearer string, body, out any) error {
	return c.do(ctx, method, "/auth/v1"+path, c.anonKey, bearer, defaultPrefer, body, out)
}

// AdminRequest calls a GoTrue admin endpoint or a PostgREST/Storage path
// using the service-role key — bypasses RLS, equivalent to
// lib/supabase/admin.ts's createAdminClient().
func (c *Client) AdminRequest(ctx context.Context, method, path string, body, out any) error {
	if c.serviceKey == "" {
		return fmt.Errorf("SUPABASE_SERVICE_ROLE_KEY not configured")
	}
	return c.do(ctx, method, path, c.serviceKey, c.serviceKey, defaultPrefer, body, out)
}

// UserRequest calls PostgREST (path relative to /rest/v1) as a specific
// authenticated user, so RLS policies apply exactly as they do when the
// browser's anon-key client sends the same request with the user's session
// JWT attached.
func (c *Client) UserRequest(ctx context.Context, method, path, accessToken string, body, out any) error {
	return c.do(ctx, method, "/rest/v1"+path, c.anonKey, accessToken, defaultPrefer, body, out)
}

// UserUpsert is the equivalent of supabase-js's
// `.from(table).upsert(row, { onConflict })` under the caller's own RLS
// session — used by the Google Calendar connection handler.
func (c *Client) UserUpsert(ctx context.Context, table, onConflict, accessToken string, body, out any) error {
	path := "/rest/v1/" + table + "?on_conflict=" + onConflict
	return c.do(ctx, "POST", path, c.anonKey, accessToken, "return=representation,resolution=merge-duplicates", body, out)
}
