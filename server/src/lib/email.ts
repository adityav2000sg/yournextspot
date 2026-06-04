import { Resend } from "resend";
import { env, hasEmail } from "../env.js";

const resend = hasEmail ? new Resend(env.resendApiKey) : null;

export async function sendOtpEmail(to: string, code: string) {
  const subject = `Your YourNextSpot code: ${code}`;
  const text = `Your one-time code is ${code}. It expires in 10 minutes.`;

  if (!resend) {
    // Dev fallback: print to console so login works without an email provider.
    console.log("\n==============================================");
    console.log(`  OTP for ${to}: ${code}  (expires in 10 min)`);
    console.log("==============================================\n");
    return { delivered: false as const };
  }

  await resend.emails.send({
    from: env.otpFromEmail,
    to,
    subject,
    text,
    html: otpHtml(code),
  });
  return { delivered: true as const };
}

function otpHtml(code: string) {
  return `
  <div style="font-family:ui-sans-serif,system-ui,sans-serif;background:#020410;color:#e7e9f3;padding:40px;border-radius:16px;max-width:440px;margin:auto">
    <p style="letter-spacing:.3em;text-transform:uppercase;font-size:11px;color:#8b8fa7;margin:0 0 8px">YourNextSpot</p>
    <h1 style="font-size:22px;margin:0 0 16px">Your sign-in code</h1>
    <div style="font-size:40px;font-weight:700;letter-spacing:.2em;background:#0b0f24;border:1px solid #20264a;border-radius:12px;padding:18px;text-align:center">${code}</div>
    <p style="color:#8b8fa7;font-size:13px;margin-top:16px">Expires in 10 minutes. If you didn't request this, ignore this email.</p>
  </div>`;
}
