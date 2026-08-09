// Package mail is a Go port of lib/email/resend.ts — same branded HTML
// shell, same four transactional emails, same escaping. Resend's API is a
// single JSON POST, so no SDK dependency is needed.
package mail

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"html"
	"io"
	"net/http"
	"time"
)

type Client struct {
	apiKey string
	from   string
	http   *http.Client
}

func New(apiKey, from string) *Client {
	return &Client{apiKey: apiKey, from: from, http: &http.Client{Timeout: 15 * time.Second}}
}

// Configured mirrors the `resend ? ... : null` check scattered through the
// Next.js routes — callers use this to fall back the same way they did.
func (c *Client) Configured() bool { return c.apiKey != "" }

func escapeHTML(s string) string {
	return html.EscapeString(s)
}

type ctaLink struct {
	Label string
	Href  string
}

// shell mirrors resend.ts's shell() line for line, including the exact
// copy and styling, so emails look identical to the ones the Node backend
// already sends.
func shell(title, bodyHTML string, cta *ctaLink) string {
	ctaHTML := ""
	if cta != nil {
		ctaHTML = fmt.Sprintf(`<a href="%s" style="display:inline-block;margin-top:22px;background:linear-gradient(135deg,#5b34d6,#7c3aed);color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:10px;">%s</a>
        <p style="margin-top:16px;font-size:12px;color:#8a8f9c;">Atau salin tautan ini ke browser Anda:<br><span style="color:#5b34d6;word-break:break-all;">%s</span></p>`, cta.Href, cta.Label, cta.Href)
	}
	return fmt.Sprintf(`<!doctype html><html><body style="margin:0;background:#f4f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f1115;">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px;">
    <div style="background:#ffffff;border:1px solid #e8e9ee;border-radius:16px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#5b34d6,#7c3aed);padding:24px 28px;">
        <span style="color:#fff;font-size:20px;font-weight:800;letter-spacing:-0.02em;">RuangBaru</span>
      </div>
      <div style="padding:28px;">
        <h1 style="margin:0 0 12px;font-size:20px;font-weight:800;">%s</h1>
        <div style="font-size:14px;line-height:1.65;color:#3a3f4b;">%s</div>
        %s
      </div>
    </div>
    <p style="text-align:center;margin-top:18px;font-size:11px;color:#9aa0ad;">RuangBaru — Semua pekerjaan dalam satu ruang.<br>Dibuat dengan bangga di Indonesia.</p>
  </div></body></html>`, title, bodyHTML, ctaHTML)
}

type sendRequest struct {
	From    string `json:"from"`
	To      string `json:"to"`
	Subject string `json:"subject"`
	HTML    string `json:"html"`
}

func (c *Client) send(ctx context.Context, to, subject, htmlBody string) error {
	if !c.Configured() {
		return fmt.Errorf("RESEND_API_KEY not configured")
	}
	body, err := json.Marshal(sendRequest{From: c.from, To: to, Subject: subject, HTML: htmlBody})
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, "POST", "https://api.resend.com/emails", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.http.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 300 {
		return fmt.Errorf("resend: %d %s", resp.StatusCode, string(respBody))
	}
	return nil
}

func (c *Client) SendPasswordReset(ctx context.Context, to, resetLink string) error {
	body := fmt.Sprintf(`<p>Kami menerima permintaan untuk mereset kata sandi akun RuangBaru Anda.</p>
       <p>Klik tombol di bawah untuk membuat kata sandi baru. Tautan ini berlaku selama <strong>1 jam</strong>.</p>
       <p style="margin-top:12px;font-size:12px;color:#8a8f9c;">Jika Anda tidak meminta reset kata sandi, abaikan email ini — akun Anda tetap aman.</p>`)
	html := shell("Reset Kata Sandi", body, &ctaLink{Label: "Reset Kata Sandi", Href: resetLink})
	return c.send(ctx, to, "Reset kata sandi RuangBaru Anda", html)
}

func (c *Client) SendConfirmationEmail(ctx context.Context, to, fullName, confirmLink string) error {
	greeting := "Halo,"
	if fullName != "" {
		greeting = fmt.Sprintf("Halo %s,", escapeHTML(fullName))
	}
	body := fmt.Sprintf(`<p>%s</p>
       <p>Terima kasih telah mendaftar di RuangBaru. Klik tombol di bawah untuk mengonfirmasi alamat email Anda dan mulai menggunakan workspace Anda.</p>
       <p style="margin-top:12px;font-size:12px;color:#8a8f9c;">Jika Anda tidak mendaftar di RuangBaru, abaikan email ini.</p>`, greeting)
	html := shell("Konfirmasi Email Anda", body, &ctaLink{Label: "Konfirmasi Email", Href: confirmLink})
	return c.send(ctx, to, "Konfirmasi email Anda untuk RuangBaru", html)
}

func (c *Client) SendWorkspaceInvitation(ctx context.Context, to, workspaceName, inviterName, appURL, token string) error {
	href := fmt.Sprintf("%s/invite/%s", appURL, token)
	wsName := escapeHTML(workspaceName)
	inviter := escapeHTML(inviterName)
	body := fmt.Sprintf(`<p><strong>%s</strong> mengundang Anda untuk berkolaborasi di ruang kerja <strong>%s</strong> di RuangBaru.</p>
       <p>Klik tombol di bawah untuk menerima undangan dan mulai bekerja bersama tim.</p>`, inviter, wsName)
	html := shell(fmt.Sprintf("Anda diundang ke %s", wsName), body, &ctaLink{Label: "Terima Undangan", Href: href})
	subject := fmt.Sprintf("%s mengundang Anda ke %s di RuangBaru", inviterName, workspaceName)
	return c.send(ctx, to, subject, html)
}

func (c *Client) SendTicketEmail(ctx context.Context, name, email, company, question string) error {
	nameE := escapeHTML(name)
	emailE := escapeHTML(email)
	questionE := escapeHTML(question)
	companyRow := ""
	if company != "" {
		companyRow = fmt.Sprintf(`
         <tr style="border-bottom:1px solid #e8e9ee;">
           <td style="padding:10px 0; font-weight:bold;">Perusahaan</td>
           <td style="padding:10px 0;">%s</td>
         </tr>`, escapeHTML(company))
	}
	body := fmt.Sprintf(`<p>Anda menerima tiket baru dari asisten chatbot dukungan pelanggan.</p>
       <table style="width:100%%; border-collapse:collapse; margin-top:16px; font-size:14px; color:#3a3f4b;">
         <tr style="border-bottom:1px solid #e8e9ee;">
           <td style="padding:10px 0; font-weight:bold; width:120px;">Nama Pengirim</td>
           <td style="padding:10px 0;">%s</td>
         </tr>
         <tr style="border-bottom:1px solid #e8e9ee;">
           <td style="padding:10px 0; font-weight:bold;">Alamat Email</td>
           <td style="padding:10px 0;"><a href="mailto:%s" style="color:#5b34d6; text-decoration:none; font-weight:600;">%s</a></td>
         </tr>%s
         <tr>
           <td style="padding:10px 0; font-weight:bold; vertical-align:top;">Pertanyaan</td>
           <td style="padding:10px 0; white-space:pre-wrap; line-height:1.6;">%s</td>
         </tr>
       </table>`, nameE, emailE, emailE, companyRow, questionE)
	html := shell("Tiket Dukungan Baru", body, nil)
	subject := fmt.Sprintf("[TIKET BARU] Pertanyaan dari %s", name)
	return c.send(ctx, "halo@ruangbaru.my.id", subject, html)
}
