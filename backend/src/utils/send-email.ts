import { Resend } from "resend";


const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export async function sendEmail(to: string[], subject: string, html: string) {
  if (!resend || to.length === 0) return;

  const { error } = await resend.emails.send({
    from: process.env.MAIL_FROM ?? "onboarding@resend.dev",
    to,
    subject,
    html,
  });

  if (error) console.error("resend error:", error);
}