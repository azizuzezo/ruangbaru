package supa

import (
	"context"
	"fmt"
	"net/url"
)

// User mirrors the subset of GoTrue's user object the app actually reads
// (matches supabase-js's `User` fields used across the Next.js code).
type User struct {
	ID       string         `json:"id"`
	Email    string         `json:"email"`
	Metadata map[string]any `json:"user_metadata"`
}

// Session mirrors supabase-js's Session shape — same fields
// @supabase/ssr persists into the sb-<ref>-auth-token cookie.
type Session struct {
	AccessToken  string `json:"access_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int    `json:"expires_in"`
	ExpiresAt    int64  `json:"expires_at,omitempty"`
	RefreshToken string `json:"refresh_token"`
	User         User   `json:"user"`
}

// SignInWithPassword is the Go equivalent of
// `supabase.auth.signInWithPassword({email, password})`, i.e. the core of
// actions.ts's signIn(). POST /auth/v1/token?grant_type=password.
func (c *Client) SignInWithPassword(ctx context.Context, email, password string) (*Session, error) {
	var session Session
	err := c.AuthRequest(ctx, "POST", "/token?grant_type=password", "", map[string]string{
		"email":    email,
		"password": password,
	}, &session)
	if err != nil {
		return nil, err
	}
	return &session, nil
}

// SignOut revokes a refresh token — equivalent of `supabase.auth.signOut()`.
// POST /auth/v1/logout.
func (c *Client) SignOut(ctx context.Context, accessToken string) error {
	return c.AuthRequest(ctx, "POST", "/logout?scope=local", accessToken, nil, nil)
}

// GetUser is the equivalent of `supabase.auth.getUser()`. GET /auth/v1/user.
func (c *Client) GetUser(ctx context.Context, accessToken string) (*User, error) {
	var user User
	if err := c.AuthRequest(ctx, "GET", "/user", accessToken, nil, &user); err != nil {
		return nil, err
	}
	return &user, nil
}

// ResetPasswordForEmail is the fallback path in actions.ts's resetPassword()
// — lets Supabase's own mailer send the reset email. POST /auth/v1/recover.
func (c *Client) ResetPasswordForEmail(ctx context.Context, email, redirectTo string) error {
	return c.AuthRequest(ctx, "POST", "/recover", "", map[string]string{
		"email":       email,
		"redirect_to": redirectTo,
	}, nil)
}

// OAuthAuthorizeURL is the equivalent of
// `supabase.auth.signInWithOAuth({provider, options: {redirectTo}})` —
// GoTrue's /authorize endpoint is a redirect target, not a POST the server
// calls; the client just needs the URL. No secret required.
func (c *Client) OAuthAuthorizeURL(provider, redirectTo string) string {
	v := url.Values{}
	v.Set("provider", provider)
	if redirectTo != "" {
		v.Set("redirect_to", redirectTo)
	}
	return c.baseURL + "/auth/v1/authorize?" + v.Encode()
}

// GenerateLinkType matches GoTrue's admin generate_link `type` field.
type GenerateLinkType string

const (
	LinkTypeSignup   GenerateLinkType = "signup"
	LinkTypeRecovery GenerateLinkType = "recovery"
)

type generateLinkResponse struct {
	Properties struct {
		ActionLink string `json:"action_link"`
	} `json:"properties"`
}

// GenerateLink is the service-role admin operation
// `admin.auth.admin.generateLink(...)` used by signUp() (branded Resend
// confirmation email) and the /api/auth/forgot-password route (branded
// Resend reset email). POST /auth/v1/admin/generate_link.
func (c *Client) GenerateLink(ctx context.Context, linkType GenerateLinkType, email, password, redirectTo string, userData map[string]any) (string, error) {
	body := map[string]any{
		"type":  linkType,
		"email": email,
		"options": map[string]any{
			"data":        userData,
			"redirect_to": redirectTo,
		},
	}
	if password != "" {
		body["password"] = password
	}

	var resp generateLinkResponse
	if err := c.AdminRequest(ctx, "POST", "/auth/v1/admin/generate_link", body, &resp); err != nil {
		return "", err
	}
	if resp.Properties.ActionLink == "" {
		return "", fmt.Errorf("generate_link returned no action_link")
	}
	return resp.Properties.ActionLink, nil
}

// SignUp is the fallback path in actions.ts's signUp() — used when Resend
// or the service-role key isn't configured, so Supabase's own mailer sends
// the confirmation email. POST /auth/v1/signup.
func (c *Client) SignUp(ctx context.Context, email, password, redirectTo string, userData map[string]any) error {
	path := "/signup"
	if redirectTo != "" {
		path += "?redirect_to=" + url.QueryEscape(redirectTo)
	}
	return c.AuthRequest(ctx, "POST", path, "", map[string]any{
		"email":    email,
		"password": password,
		"data":     userData,
	}, nil)
}

// ExchangeCodeForSession is the PKCE token exchange used by
// app/auth/callback/route.ts. POST /auth/v1/token?grant_type=pkce.
//
// NOTE (best-effort — verify before relying on this in production): the
// code_verifier must be the exact value @supabase/ssr stored in the
// `sb-<project-ref>-auth-token-code-verifier` cookie when the OAuth flow
// started. This function expects the caller to have already read that
// cookie (see cookies.go) — it does not know the cookie's exact name/format
// on its own, since that's tied to the frontend's installed @supabase/ssr
// version and isn't a documented, versioned wire format.
func (c *Client) ExchangeCodeForSession(ctx context.Context, code, codeVerifier string) (*Session, error) {
	var session Session
	err := c.AuthRequest(ctx, "POST", "/token?grant_type=pkce", "", map[string]string{
		"auth_code":     code,
		"code_verifier": codeVerifier,
	}, &session)
	if err != nil {
		return nil, err
	}
	return &session, nil
}
