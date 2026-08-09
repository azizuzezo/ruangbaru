package supa

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/url"
	"sort"
	"strconv"
	"strings"
)

// BEST-EFFORT — VERIFY AGAINST YOUR INSTALLED @supabase/ssr VERSION BEFORE
// RELYING ON THIS IN PRODUCTION.
//
// The rest of the frontend (lib/supabase/client.ts, server.ts,
// middleware.ts, and ~30 components) keeps reading the session via
// @supabase/ssr's own cookie handling, unchanged. This file only exists so
// a Go-issued session (from SignInWithPassword/ExchangeCodeForSession) can
// be written into the *same* cookie those libraries already read, so a user
// who logs in through a Go endpoint is still recognized as logged in by
// the untouched Next.js code.
//
// The wire format below (cookie name `sb-<project-ref>-auth-token`, value
// `base64-` + base64url(JSON session), chunked at 3180 bytes into
// `.0`/`.1`/... suffixes when the encoded value is longer) matches
// @supabase/ssr's `createServerClient` default cookie encoding as of the
// versions in wide use in 2025–2026. It is not a documented, versioned
// public API — if login stops being recognized by the Next.js side after
// wiring this in, this is the first place to check, and pinning the exact
// @supabase/ssr version in package.json is worth doing before depending on
// it further.
const chunkSize = 3180

// ProjectRef extracts the project ref from a Supabase URL, e.g.
// "https://abcdefgh.supabase.co" -> "abcdefgh". Needed to build the
// `sb-<ref>-auth-token` cookie name.
func ProjectRef(supabaseURL string) string {
	host := strings.TrimPrefix(strings.TrimPrefix(supabaseURL, "https://"), "http://")
	host = strings.SplitN(host, "/", 2)[0]
	return strings.SplitN(host, ".", 2)[0]
}

func SessionCookieName(ref string) string {
	return "sb-" + ref + "-auth-token"
}

// EncodeSessionCookies returns the cookie(s) to set for a session, keyed by
// cookie name (a single entry unless the encoded value needs chunking).
func EncodeSessionCookies(ref string, session *Session) (map[string]string, error) {
	raw, err := json.Marshal(session)
	if err != nil {
		return nil, err
	}
	encoded := "base64-" + base64.RawURLEncoding.EncodeToString(raw)
	name := SessionCookieName(ref)

	if len(encoded) <= chunkSize {
		return map[string]string{name: url.QueryEscape(encoded)}, nil
	}

	out := map[string]string{}
	for i := 0; i*chunkSize < len(encoded); i++ {
		end := (i + 1) * chunkSize
		if end > len(encoded) {
			end = len(encoded)
		}
		out[fmt.Sprintf("%s.%d", name, i)] = url.QueryEscape(encoded[i*chunkSize : end])
	}
	return out, nil
}

// DecodeSessionCookie reassembles a (possibly chunked) session cookie back
// into a Session. cookies is the full cookie jar for the request (name ->
// value, already percent-decoded).
func DecodeSessionCookie(cookies map[string]string, ref string) (*Session, error) {
	name := SessionCookieName(ref)

	if v, ok := cookies[name]; ok {
		return decodeEncodedSession(v)
	}

	// Chunked: gather sb-<ref>-auth-token.0, .1, ... in numeric order.
	type chunk struct {
		idx   int
		value string
	}
	var chunks []chunk
	prefix := name + "."
	for k, v := range cookies {
		if strings.HasPrefix(k, prefix) {
			idx, err := strconv.Atoi(strings.TrimPrefix(k, prefix))
			if err != nil {
				continue
			}
			chunks = append(chunks, chunk{idx: idx, value: v})
		}
	}
	if len(chunks) == 0 {
		return nil, fmt.Errorf("no session cookie found for ref %q", ref)
	}
	sort.Slice(chunks, func(i, j int) bool { return chunks[i].idx < chunks[j].idx })

	var sb strings.Builder
	for _, c := range chunks {
		sb.WriteString(c.value)
	}
	return decodeEncodedSession(sb.String())
}

func decodeEncodedSession(encoded string) (*Session, error) {
	decoded, err := url.QueryUnescape(encoded)
	if err != nil {
		decoded = encoded // tolerate already-unescaped input
	}
	decoded = strings.TrimPrefix(decoded, "base64-")

	raw, err := base64.RawURLEncoding.DecodeString(decoded)
	if err != nil {
		// Some client versions use standard padding — retry with StdEncoding.
		raw, err = base64.StdEncoding.DecodeString(decoded)
		if err != nil {
			return nil, fmt.Errorf("decoding session cookie: %w", err)
		}
	}

	var session Session
	if err := json.Unmarshal(raw, &session); err != nil {
		return nil, fmt.Errorf("unmarshalling session cookie: %w", err)
	}
	return &session, nil
}
