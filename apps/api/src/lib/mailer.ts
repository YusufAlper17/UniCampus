import { env } from '../env.js';

// Resend ile OTP e-postası. API key yoksa sessizce geçilir (dev/test).
export async function sendOtpEmail(email: string, code: string): Promise<void> {
  if (!env.RESEND_API_KEY) return;
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'UniCampus <noreply@unicampus.app>',
      to: email,
      subject: 'UniCampus doğrulama kodun',
      html: `<div style="font-family:sans-serif"><h2>Doğrulama kodun</h2><p style="font-size:28px;font-weight:700;letter-spacing:4px">${code}</p><p>Kod 10 dakika geçerlidir.</p></div>`,
    }),
  });
}
