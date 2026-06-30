import { Resend } from 'resend';

// Support either env naming so we don't fight the .env file.
const FROM = process.env.RESEND_EMAIL_FROM || process.env.RESEND_FROM_EMAIL || 'RuangBaru <no-reply@ruangbaru.my.id>';
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

export async function sendPasswordReset(opts: { to: string; resetLink: string }) {
  if (!resend) throw new Error('RESEND_API_KEY not configured');
  return resend.emails.send({
    from: EMAIL_FROM,
    to: opts.to,
    subject: 'Reset kata sandi RuangBaru Anda',
    html: shell(
      'Reset Kata Sandi',
      `<p>Kami menerima permintaan untuk mereset kata sandi akun RuangBaru Anda.</p>
       <p>Klik tombol di bawah untuk membuat kata sandi baru. Tautan ini berlaku selama <strong>1 jam</strong>.</p>
       <p style="margin-top:12px;font-size:12px;color:#8a8f9c;">Jika Anda tidak meminta reset kata sandi, abaikan email ini — akun Anda tetap aman.</p>`,
      { label: 'Reset Kata Sandi', href: opts.resetLink }
    ),
  });
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

export async function sendTicketEmail(opts: {
  name: string;
  email: string;
  company?: string;
  question: string;
}) {
  if (!resend) throw new Error('RESEND_API_KEY not configured');
  return resend.emails.send({
    from: EMAIL_FROM,
    to: 'halo@ruangbaru.my.id',
    subject: `[TIKET BARU] Pertanyaan dari ${opts.name}`,
    html: shell(
      'Tiket Dukungan Baru',
      `<p>Anda menerima tiket baru dari asisten chatbot dukungan pelanggan.</p>
       <table style="width:100%; border-collapse:collapse; margin-top:16px; font-size:14px; color:#3a3f4b;">
         <tr style="border-bottom:1px solid #e8e9ee;">
           <td style="padding:10px 0; font-weight:bold; width:120px;">Nama Pengirim</td>
           <td style="padding:10px 0;">${opts.name}</td>
         </tr>
         <tr style="border-bottom:1px solid #e8e9ee;">
           <td style="padding:10px 0; font-weight:bold;">Alamat Email</td>
           <td style="padding:10px 0;"><a href="mailto:${opts.email}" style="color:#5b34d6; text-decoration:none; font-weight:600;">${opts.email}</a></td>
         </tr>
         ${opts.company ? `
         <tr style="border-bottom:1px solid #e8e9ee;">
           <td style="padding:10px 0; font-weight:bold;">Perusahaan</td>
           <td style="padding:10px 0;">${opts.company}</td>
         </tr>` : ''}
         <tr>
           <td style="padding:10px 0; font-weight:bold; vertical-align:top;">Pertanyaan</td>
           <td style="padding:10px 0; white-space:pre-wrap; line-height:1.6;">${opts.question}</td>
         </tr>
       </table>`
    ),
  });
}

