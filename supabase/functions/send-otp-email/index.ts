// Supabase Edge Function — Edu mail OTP gönderimi (Resend).
// Deploy: supabase functions deploy send-otp-email
// Bu fonksiyon Deno runtime'ında çalışır. docs/06-tech-stack.md.

interface OtpPayload {
  email: string;
  code: string;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const { email, code } = (await req.json()) as OtpPayload;
  const resendApiKey = Deno.env.get('RESEND_API_KEY');

  if (!resendApiKey) {
    return new Response(JSON.stringify({ error: 'RESEND_API_KEY missing' }), { status: 500 });
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'UniCampus <noreply@unicampus.app>',
      to: email,
      subject: 'UniCampus doğrulama kodun',
      html: `<p>Doğrulama kodun: <strong>${code}</strong></p><p>10 dakika geçerli.</p>`,
    }),
  });

  if (!res.ok) {
    return new Response(JSON.stringify({ error: 'send_failed' }), { status: 502 });
  }
  return new Response(JSON.stringify({ sent: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
