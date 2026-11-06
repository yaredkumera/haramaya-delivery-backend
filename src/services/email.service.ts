import { env } from "../config/env.js"

type Mail = { to: string; subject: string; text: string; html?: string }

export async function sendEmail(mail: Mail) {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM) {
    console.warn("Email is not configured (RESEND_API_KEY or EMAIL_FROM is missing): message not sent")
    if (env.NODE_ENV !== "production") console.log(mail.text)
    return
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.EMAIL_FROM, to: [mail.to], subject: mail.subject, text: mail.text, html: mail.html }),
    signal: AbortSignal.timeout(10_000),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => "")
    throw new Error(`Email provider answered ${response.status}: ${detail.slice(0, 300)}`)
  }
}

// A message to the owner. Never blocks or breaks the request that triggered it.
export function notifyAdmin(subject: string, text: string) {
  if (!env.ADMIN_EMAIL) return
  void sendEmail({ to: env.ADMIN_EMAIL, subject, text }).catch((error) =>
    console.error("Admin notification failed:", error instanceof Error ? error.message : error),
  )
}