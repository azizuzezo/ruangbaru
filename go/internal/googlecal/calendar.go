// Package googlecal is a Go port of lib/google/calendar.ts — thin REST
// wrappers over Google's OAuth token endpoint and Calendar API, no SDK.
package googlecal

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

const (
	tokenURL = "https://oauth2.googleapis.com/token"
	calBase  = "https://www.googleapis.com/calendar/v3/calendars"
)

var scopes = []string{
	"https://www.googleapis.com/auth/calendar.events",
	"https://www.googleapis.com/auth/userinfo.email",
	"openid",
}

type Client struct {
	clientID     string
	clientSecret string
	http         *http.Client
}

func New(clientID, clientSecret string) *Client {
	return &Client{clientID: clientID, clientSecret: clientSecret, http: &http.Client{Timeout: 15 * time.Second}}
}

func (c *Client) Configured() bool { return c.clientID != "" && c.clientSecret != "" }

// RedirectURI mirrors lib/google/calendar.ts's redirectUri(): derived from
// the actual request origin so it matches whatever host the app is served
// from — this exact value must be registered as an authorized redirect URI
// in the Google Cloud OAuth client.
func RedirectURI(origin string) string {
	return strings.TrimSuffix(origin, "/") + "/api/google/callback"
}

func (c *Client) BuildAuthURL(state, redirect string) string {
	v := url.Values{}
	v.Set("client_id", c.clientID)
	v.Set("redirect_uri", redirect)
	v.Set("response_type", "code")
	v.Set("scope", strings.Join(scopes, " "))
	v.Set("access_type", "offline")
	v.Set("include_granted_scopes", "true")
	v.Set("prompt", "consent")
	v.Set("state", state)
	return "https://accounts.google.com/o/oauth2/v2/auth?" + v.Encode()
}

type TokenResponse struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token,omitempty"`
	ExpiresIn    int    `json:"expires_in"`
	IDToken      string `json:"id_token,omitempty"`
}

func (c *Client) postForm(ctx context.Context, values url.Values) (*TokenResponse, error) {
	req, err := http.NewRequestWithContext(ctx, "POST", tokenURL, strings.NewReader(values.Encode()))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("token request failed: %d %s", resp.StatusCode, string(body))
	}
	var tok TokenResponse
	if err := json.NewDecoder(resp.Body).Decode(&tok); err != nil {
		return nil, err
	}
	return &tok, nil
}

func (c *Client) ExchangeCode(ctx context.Context, code, redirect string) (*TokenResponse, error) {
	return c.postForm(ctx, url.Values{
		"code":          {code},
		"client_id":     {c.clientID},
		"client_secret": {c.clientSecret},
		"redirect_uri":  {redirect},
		"grant_type":    {"authorization_code"},
	})
}

func (c *Client) RefreshToken(ctx context.Context, refresh string) (*TokenResponse, error) {
	return c.postForm(ctx, url.Values{
		"refresh_token": {refresh},
		"client_id":     {c.clientID},
		"client_secret": {c.clientSecret},
		"grant_type":    {"refresh_token"},
	})
}

func (c *Client) GetUserEmail(ctx context.Context, accessToken string) (string, error) {
	req, _ := http.NewRequestWithContext(ctx, "GET", "https://www.googleapis.com/oauth2/v2/userinfo", nil)
	req.Header.Set("Authorization", "Bearer "+accessToken)
	resp, err := c.http.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		return "", nil
	}
	var v struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&v); err != nil {
		return "", err
	}
	return v.Email, nil
}

// GEvent mirrors the Google Calendar event fields the app actually reads.
type GEvent struct {
	ID          string     `json:"id,omitempty"`
	Status      string     `json:"status,omitempty"`
	Summary     string     `json:"summary,omitempty"`
	Description string     `json:"description,omitempty"`
	Location    string     `json:"location,omitempty"`
	Start       *EventTime `json:"start,omitempty"`
	End         *EventTime `json:"end,omitempty"`
	Recurrence  []string   `json:"recurrence,omitempty"`
}

type EventTime struct {
	Date     string `json:"date,omitempty"`
	DateTime string `json:"dateTime,omitempty"`
}

func (c *Client) ListEvents(ctx context.Context, accessToken, calendarID, timeMin, timeMax string) ([]GEvent, error) {
	v := url.Values{}
	v.Set("timeMin", timeMin)
	v.Set("timeMax", timeMax)
	v.Set("singleEvents", "true")
	v.Set("orderBy", "startTime")
	v.Set("maxResults", "250")

	req, _ := http.NewRequestWithContext(ctx, "GET", fmt.Sprintf("%s/%s/events?%s", calBase, url.PathEscape(calendarID), v.Encode()), nil)
	req.Header.Set("Authorization", "Bearer "+accessToken)
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("list events failed: %d %s", resp.StatusCode, string(body))
	}
	var data struct {
		Items []GEvent `json:"items"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return nil, err
	}
	return data.Items, nil
}

func (c *Client) CreateEvent(ctx context.Context, accessToken, calendarID string, body map[string]any) (*GEvent, error) {
	b, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}
	req, _ := http.NewRequestWithContext(ctx, "POST", fmt.Sprintf("%s/%s/events", calBase, url.PathEscape(calendarID)), strings.NewReader(string(b)))
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Content-Type", "application/json")
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("create event failed: %d %s", resp.StatusCode, string(respBody))
	}
	var ev GEvent
	if err := json.NewDecoder(resp.Body).Decode(&ev); err != nil {
		return nil, err
	}
	return &ev, nil
}

var rrule = map[string]string{
	"daily":   "RRULE:FREQ=DAILY",
	"weekly":  "RRULE:FREQ=WEEKLY",
	"monthly": "RRULE:FREQ=MONTHLY",
}

// LocalEvent mirrors the shape of a row in the app's `events` table.
type LocalEvent struct {
	Title         string
	Description   string
	Location      string
	AllDay        bool
	StartAt       string
	EndAt         string
	Recurrence    string
	GoogleEventID string
}

// GoogleToLocal mirrors googleToLocal() — maps a Google event into the
// `events` row shape. Returns nil if the event has no usable start/end.
func GoogleToLocal(g GEvent) *LocalEvent {
	allDay := g.Start != nil && g.Start.Date != "" && g.Start.DateTime == ""
	start := eventTimeToISO(g.Start)
	end := eventTimeToISO(g.End)
	if start == "" || end == "" {
		return nil
	}
	title := g.Summary
	if title == "" {
		title = "(Tanpa judul)"
	}
	return &LocalEvent{
		Title: title, Description: g.Description, Location: g.Location,
		AllDay: allDay, StartAt: start, EndAt: end, GoogleEventID: g.ID,
	}
}

func eventTimeToISO(t *EventTime) string {
	if t == nil {
		return ""
	}
	if t.DateTime != "" {
		return t.DateTime
	}
	if t.Date != "" {
		return t.Date + "T00:00:00.000Z"
	}
	return ""
}

// LocalToGoogle mirrors localToGoogle() — maps an `events` row into a
// Google Calendar event body.
func LocalToGoogle(ev LocalEvent) map[string]any {
	body := map[string]any{
		"summary":     ev.Title,
		"description": ev.Description,
		"location":    ev.Location,
	}
	if ev.AllDay {
		body["start"] = map[string]string{"date": ev.StartAt[:10]}
		body["end"] = map[string]string{"date": ev.EndAt[:10]}
	} else {
		body["start"] = map[string]string{"dateTime": ev.StartAt}
		body["end"] = map[string]string{"dateTime": ev.EndAt}
	}
	if ev.Recurrence != "" && ev.Recurrence != "none" {
		if r, ok := rrule[ev.Recurrence]; ok {
			body["recurrence"] = []string{r}
		}
	}
	return body
}
