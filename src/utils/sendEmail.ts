// src/utils/sendEmail.ts
import { Resend } from "resend";
import {env} from "../config/env.js"
const resend = new Resend(env.RESEND_API_KEY);

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export const sendEmail = async ({ to, subject, html, text }: SendEmailOptions) => {
  try {
    const data = await resend.emails.send({
      from:env.EMAIL_FROM,
      to,
      subject,
      html,
      text: text || "",
    });

    return { success: true, data };
  } catch (error: any) {
    console.error("Failed to send email:", error);
    return { success: false, error: error?.message || "Email sending failed" };
  }
};