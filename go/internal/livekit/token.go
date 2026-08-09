// Package livekit is a Go port of the two things the Node app used
// `livekit-server-sdk` for: minting a participant access token
// (app/api/meetings/token) and deleting a room to force-disconnect
// everyone when a meeting ends (app/api/meetings/end). Both are plain
// HS256 JWTs and a Twirp-over-HTTP call — no SDK needed.
package livekit

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

type VideoGrant struct {
	RoomCreate     bool   `json:"roomCreate,omitempty"`
	RoomJoin       bool   `json:"roomJoin,omitempty"`
	RoomAdmin      bool   `json:"roomAdmin,omitempty"`
	Room           string `json:"room,omitempty"`
	CanPublish     *bool  `json:"canPublish,omitempty"`
	CanSubscribe   *bool  `json:"canSubscribe,omitempty"`
	CanPublishData *bool  `json:"canPublishData,omitempty"`
}

func boolPtr(b bool) *bool { return &b }

type claims struct {
	Iss   string     `json:"iss"`
	Sub   string     `json:"sub,omitempty"`
	Name  string     `json:"name,omitempty"`
	Nbf   int64      `json:"nbf"`
	Exp   int64      `json:"exp"`
	Jti   string     `json:"jti"`
	Video VideoGrant `json:"video"`
}

func sign(apiKey, apiSecret string, c claims) (string, error) {
	header := map[string]string{"alg": "HS256", "typ": "JWT"}
	headerJSON, err := json.Marshal(header)
	if err != nil {
		return "", err
	}
	claimsJSON, err := json.Marshal(c)
	if err != nil {
		return "", err
	}

	seg := func(b []byte) string { return base64.RawURLEncoding.EncodeToString(b) }
	unsigned := seg(headerJSON) + "." + seg(claimsJSON)

	mac := hmac.New(sha256.New, []byte(apiSecret))
	mac.Write([]byte(unsigned))
	sig := seg(mac.Sum(nil))

	return unsigned + "." + sig, nil
}

// ParticipantToken mirrors app/api/meetings/token's AccessToken usage: a
// room-join grant for one identity, valid for `ttl`.
func ParticipantToken(apiKey, apiSecret, identity, name, room string, ttl time.Duration) (string, error) {
	now := time.Now()
	return sign(apiKey, apiSecret, claims{
		Iss:  apiKey,
		Sub:  identity,
		Name: name,
		Nbf:  now.Unix(),
		Exp:  now.Add(ttl).Unix(),
		Jti:  identity,
		Video: VideoGrant{
			Room: room, RoomJoin: true,
			CanPublish: boolPtr(true), CanSubscribe: boolPtr(true), CanPublishData: boolPtr(true),
		},
	})
}

// adminToken mirrors the token RoomServiceClient signs internally for
// every server-to-server call: broad roomAdmin grant, short-lived.
func adminToken(apiKey, apiSecret string) (string, error) {
	now := time.Now()
	return sign(apiKey, apiSecret, claims{
		Iss:   apiKey,
		Nbf:   now.Unix(),
		Exp:   now.Add(10 * time.Minute).Unix(),
		Jti:   apiKey,
		Video: VideoGrant{RoomAdmin: true},
	})
}

// RoomService is a minimal Twirp client for the one call this app needs:
// DeleteRoom. LiveKit's Twirp endpoints accept JSON when
// Content-Type: application/json is sent, so this needs no protobuf
// dependency.
type RoomService struct {
	httpURL   string
	apiKey    string
	apiSecret string
	http      *http.Client
}

// NewRoomService takes the same URL the frontend uses
// (NEXT_PUBLIC_LIVEKIT_URL / LIVEKIT_URL, wss:// or ws://) and converts it
// to the https:// form the HTTP/Twirp API needs, matching
// app/api/meetings/end/route.ts's replace().
func NewRoomService(liveKitURL, apiKey, apiSecret string) *RoomService {
	httpURL := strings.NewReplacer("wss://", "https://", "ws://", "http://").Replace(liveKitURL)
	return &RoomService{httpURL: httpURL, apiKey: apiKey, apiSecret: apiSecret, http: &http.Client{Timeout: 10 * time.Second}}
}

// DeleteRoom disconnects every participant by deleting the room. Best-effort
// — a room that no one ever joined won't exist, which is fine to ignore
// (matches the Node route's try/catch).
func (r *RoomService) DeleteRoom(ctx context.Context, room string) error {
	token, err := adminToken(r.apiKey, r.apiSecret)
	if err != nil {
		return err
	}
	body, _ := json.Marshal(map[string]string{"room": room})

	req, err := http.NewRequestWithContext(ctx, "POST", r.httpURL+"/twirp/livekit.RoomService/DeleteRoom", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := r.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("delete room failed: %d %s", resp.StatusCode, string(respBody))
	}
	return nil
}
