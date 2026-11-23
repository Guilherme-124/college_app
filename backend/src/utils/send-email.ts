import { Resend } from "resend";



const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;


export async function sendEmail(to: string[], subject: string, html: string){
  if (!resend) {
    console.warn("sem RESEND_API_KEY")
    return false;
  }

  if (to.length) return false;

  try {
    const { error } = await resend.emails.send({
      from: process.env.MAIL_FROM ?? "onboarding@resend.dev",
      to,
      subject,
      html,
    });

    if (error) {
      console.error("erro no resend:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("falha ao enviar e-mail:", err);
    return false;
  }
}