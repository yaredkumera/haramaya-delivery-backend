const targets = [
  "https://example.com/",
  "https://transactioninfo.ethiotelecom.et/",
  "https://apps.cbe.com.et:100/",
]

export async function probeHosts() {
  for (const url of targets) {
    const started = Date.now()
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(20_000) })
      console.log(`PROBE ${url} -> HTTP ${response.status} in ${Date.now() - started}ms`)
    } catch (error) {
      const cause = error instanceof Error ? error.cause : undefined
      const detail = cause instanceof Error ? `${(cause as NodeJS.ErrnoException).code ?? ""} ${cause.message}` : String(error)
      console.log(`PROBE ${url} FAILED in ${Date.now() - started}ms: ${detail}`)
    }
  }
}