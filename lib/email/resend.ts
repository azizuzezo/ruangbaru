import { Resend } from 'resend';

// Support either env naming so we don't fight the .env file.
const FROM = process.env.RESEND_EMAIL_FROM || process.env.RESEND_FROM_EMAIL || 'RuangBaru <no-reply@ruangbaru.com>';
const apiKey = process.env.RESEND_API_KEY;

export const resend = apiKey ? new Resend(apiKey) : null;
export const EMAIL_FROM = FROM;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/** Shared branded HTML shell so every transactional email looks consistent. */
function shell(title: string, bodyHtml: string, cta?: { label: string; href: string }) {
  return `<!doctype html><html><body style="margin:0;background:#f4f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f1115;">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px;">
    <div style="background:#ffffff;border:1px solid #e8e9ee;border-radius:16px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#5b34d6,#7c3aed);padding:24px 28px;">
        <span style="color:#fff;font-size:20px;font-weight:800;letter-spacing:-0.02em;">RuangBaru</span>
      </div>
      <div style="padding:28px;">
        <h1 style="margin:0 0 12px;font-size:20px;font-weight:800;">${title}</h1>
        <div style="font-size:14px;line-height:1.65;color:#3a3f4b;">${bodyHtml}</div>
        ${cta ? `<a href="${cta.href}" style="display:inline-block;margin-top:22px;background:linear-gradient(135deg,#5b34d6,#7c3aed);color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:10px;">${cta.label}</a>
        <p style="margin-top:16px;font-size:12px;color:#8a8f9c;">Atau salin tautan ini ke browser Anda:<br><span style="color:#5b34d6;word-break:break-all;">${cta.href}</span></p>` : ''}
      </div>
    </div>
    <p style="text-align:center;margin-top:18px;font-size:11px;color:#9aa0ad;">RuangBaru — Semua pekerjaan dalam satu ruang.<br>Dibuat dengan bangga di Indonesia.</p>
  </div></body></html>`;
}

export async function sendWorkspaceInvitation(opts: {
  to: string;
  workspaceName: string;
  inviterName: string;
  token: string;
}) {
  if (!resend) throw new Error('RESEND_API_KEY not configured');
  const href = `${APP_URL}/invite/${opts.token}`;
  return resend.emails.send({
    from: EMAIL_FROM,
    to: opts.to,
    subject: `${opts.inviterName} mengundang Anda ke ${opts.workspaceName} di RuangBaru`,
    html: shell(
      `Anda diundang ke ${opts.workspaceName}`,
      `<p><strong>${opts.inviterName}</strong> mengundang Anda untuk berkolaborasi di ruang kerja <strong>${opts.workspaceName}</strong> di RuangBaru.</p>
       <p>Klik tombol di bawah untuk menerima undangan dan mulai bekerja bersama tim.</p>`,
      { label: 'Terima Undangan', href }
    ),
  });
}
