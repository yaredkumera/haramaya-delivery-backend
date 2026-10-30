import * as cheerio from "cheerio"
import pdf from "pdf-parse/lib/pdf-parse.js"
import { env } from "../config/env.js"
import type { ReceiptSource } from "../models/order.model.js"

export type Receipt = {
  source: ReceiptSource
  reference: string
  successful: boolean
  amount: number
  payerName: string
  receiver: string
  receiverAccount?: string
  paidAt: Date
}

type Expected = { reference: string; amount: number; payerName: string }

const MAX_AGE_MS = 24 * 60 * 60 * 1000
const MAX_BYTES = 3_000_000
const TITLES = new Set(["mr", "mrs", "ms", "miss", "dr", "ato"])

const clean = (text: string) => text.replace(/\s+/g, " ").trim()
const norm = (text: string) => text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim()
const toNumber = (text: string) => parseFloat(text.replace(/[^0-9.]/g, "")) || 0
const lastDigits = (text: string, count: number) => text.replace(/\D/g, "").slice(-count)
const nameWords = (name: string) => norm(name).split(" ").filter((word) => word && !TITLES.has(word))

export const detectSource = (id: string): ReceiptSource | null =>
  /^FT[A-Z0-9]{10}$/.test(id) ? "cbe" : /^[A-Z0-9]{10}$/.test(id) ? "telebirr" : null

const receivers = [
  { method: "telebirr", name: env.TELEBIRR_NAME, accountEnd: lastDigits(env.TELEBIRR_NUMBER, 4) },
  { method: "cbe", name: env.CBE_NAME, accountEnd: lastDigits(env.CBE_ACCOUNT, 4) },
] as const

const sameName = (typed: string, onReceipt: string, minWords = 1) => {
  const typedWords = nameWords(typed)
  const receiptWords = new Set(nameWords(onReceipt))
  return typedWords.length >= minWords && typedWords.every((word) => receiptWords.has(word))
}

export function checkReceipt(receipt: Receipt, expected: Expected) {
  const problems: string[] = []
  const age = Date.now() - receipt.paidAt.getTime()

  const matches = receivers.filter(
    (r) =>
      sameName(r.name, receipt.receiver) &&
      (!receipt.receiverAccount || lastDigits(receipt.receiverAccount, 4) === r.accountEnd),
  )

  if (receipt.reference !== expected.reference) problems.push("Receipt does not match the transaction ID")
  if (!receipt.successful) problems.push("The payment is not marked as completed")
  if (Math.abs(receipt.amount - expected.amount) > 0.01) {
    problems.push(`Amount is ${receipt.amount} ETB, expected ${expected.amount} ETB`)
  }
if (matches.length === 0) {
  problems.push(`The money did not go to one of our accounts (receipt shows "${receipt.receiver}", account ending ${lastDigits(receipt.receiverAccount ?? "", 4) || "unknown"})`)
}  if (!sameName(expected.payerName, receipt.payerName, 2)) problems.push("The payer name does not match")
  if (!(age >= -60_000 && age <= MAX_AGE_MS)) problems.push("The payment date is too old or invalid")

  return { problems, paidTo: matches.length === 1 ? matches[0].method : undefined }
}
// Downloads from a fixed host only. Any problem returns null, which means "check by hand".
async function download(url: string,timeoutMs = 10_000): Promise<Buffer | null> {
  const host = new URL(url).hostname
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!response.ok || new URL(response.url).hostname !== host) return null
    if (Number(response.headers.get("content-length")) > MAX_BYTES) return null
    const bytes = Buffer.from(await response.arrayBuffer())
    return bytes.length > MAX_BYTES ? null : bytes
  }    catch (error) {
    const cause = error instanceof Error ? error.cause : undefined
    const reason = cause instanceof Error ? `${(cause as NodeJS.ErrnoException).code ?? ""} ${cause.message}`.trim() : ""
    console.error(`Receipt download from ${host} failed:`, error instanceof Error ? error.message : error, reason)
    return null
  }
}

// Receipts use Ethiopia time (UTC+3). "10/14/2026, 5:45:00 PM" is month/day/year.
const parseCbeDate = (text: string) => {
  const m = text.match(/(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)/i)
  if (!m) return null
  const pad = (n: string | number) => String(n).padStart(2, "0")
  const hour = (Number(m[4]) % 12) + (m[7].toUpperCase() === "PM" ? 12 : 0)
  return new Date(`${m[3]}-${pad(m[1])}-${pad(m[2])}T${pad(hour)}:${m[5]}:${m[6]}+03:00`)
}


async function readCbe(ft: string): Promise<Receipt | null> {
  const suffix = lastDigits(env.CBE_ACCOUNT, 8)
  if (!/^FT[A-Z0-9]{10}$/.test(ft) || suffix.length !== 8) return null

  const url = new URL("https://apps.cbe.com.et:100/")
  url.searchParams.set("id", ft + suffix)
  const bytes = await download(url.toString(),20_000)
  if (!bytes || bytes.subarray(0, 4).toString() !== "%PDF") return null

  const lines = (await pdf(bytes)).text.split("\n").map(clean).filter(Boolean)
  const start = lines.findIndex((line) => line.startsWith("Payment / Transaction"))
  if (start === -1) return null
  const section = lines.slice(start + 1)

  const field = (label: string) => section.find((l) => l.startsWith(label))?.slice(label.length).trim() ?? ""
  const accountUnder = (label: string) => {
    const i = section.findIndex((l) => l.startsWith(label))
    const next = i === -1 ? "" : (section[i + 1] ?? "")
    return next.startsWith("Account") ? next.slice("Account".length).trim() : ""
  }

  const paidAt = parseCbeDate(field("Payment Date & Time"))
  const amount = toNumber(field("Transferred Amount"))
  if (field("Reference No. (VAT Invoice No)") !== ft || !paidAt || !amount) return null

  // A receipt exists only for a completed transfer, so "successful" is true here
  return {
    reference: ft,
    successful: true,
    amount,
    payerName: field("Payer"),
    receiver: field("Receiver"),
    receiverAccount: accountUnder("Receiver"),
    paidAt,
    source:"cbe",
  }
}

// Telebirr: "13-10-2026 11:47:33" is day-month-year, Ethiopia time (UTC+3)
const parseTelebirrDate = (text: string) => {
  const m = text.match(/(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/)
  return m ? new Date(`${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:${m[6]}+03:00`) : null
}

// Every visible text piece of the page, in reading order
type DomNode = { type: string; data?: string; children?: DomNode[] }
function textPieces($: ReturnType<typeof cheerio.load>): string[] {
  $("script, style, noscript").remove()
  const pieces: string[] = []
  const walk = (node: DomNode) => {
    if (node.type === "text") {
      const text = clean(node.data ?? "")
      if (text) pieces.push(text)
    } else {
      node.children?.forEach(walk)
    }
  }
  $("body").each((_, el) => walk(el as unknown as DomNode))
  return pieces
}

// Telebirr to a bank account shows one row: "<account number> <account holder name>"
function splitBankField(text: string) {
  const m = text.match(/^([\d*]{6,})\s+(.+)$/)
  return m ? { account: m[1], name: m[2] } : null
}

async function readTelebirr(id: string): Promise<Receipt | null> {
  if (!/^[A-Z0-9]{10}$/.test(id)) return null
  const bytes = await download(`https://transactioninfo.ethiotelecom.et/receipt/${id}`, 20_000)
  if (!bytes) return null

  const $ = cheerio.load(bytes.toString("utf8"))

  // Top block: two cells per row (label | value)
  const rows = new Map<string, string>()
  $("tr").each((_, row) => {
    const cells = $(row).children("td")
    if (cells.length !== 2) return
    const label = norm(cells.eq(0).text())
    if (label.length < 120 && !rows.has(label)) rows.set(label, clean(cells.eq(1).text()))
  })
  const pick = (label: string) => [...rows].find(([key]) => key.includes(label))?.[1] ?? ""

  // Invoice table: 3 header cells (Invoice No. | Payment date | Settled Amount), then 3 values
  const pieces = textPieces($)
  const i = pieces.findIndex((p) => /Invoice No\./i.test(p))
  const [invoiceNo = "", dateText = "", settled = ""] = i === -1 ? [] : pieces.slice(i + 3, i + 6)

  const paidAt = parseTelebirrDate(dateText)
  const amount = toNumber(settled)
  if (invoiceNo !== id || !paidAt || !amount) {
    console.error("Telebirr receipt not recognised:", { invoiceNo, hasDate: Boolean(paidAt), amount })
    return null
  }

  // Money sent to a bank account: the real receiver is in the "Bank account number" row
  const bank = splitBankField(pick("bank account number"))

  return {
    reference: id,
    successful: /complet|success/i.test(pick("transaction status")),
    amount,
    payerName: pick("payer name"),
    receiver: bank ? bank.name : pick("credited party name"),
    receiverAccount: bank ? bank.account : pick("credited party account") || undefined,
    paidAt,
    source: "telebirr",
  }
}

export async function fetchReceipt(source: ReceiptSource, transactionId: string): Promise<Receipt | null> {
  try {
    return source === "cbe" ? await readCbe(transactionId) : await readTelebirr(transactionId)
  } catch (error) {
    console.error("Receipt parsing failed:", error instanceof Error ? error.message : error)
    return null
  }
}