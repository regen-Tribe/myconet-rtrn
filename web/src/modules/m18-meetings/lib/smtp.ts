/**
 * Written by Sonia Wendorff for Protopia (PR #53, tested in workerd against smtp.gmail.com); moved here unchanged.
 *
 * A small SMTP client for the Cloudflare Worker (server only): implicit TLS (port 465) or STARTTLS
 * (587), AUTH PLAIN, one connection for many messages. Enough for the meeting notes email from a
 * Gmail account with an app password.
 *
 * `cloudflare:sockets` exists only inside the Worker runtime; neither Next's nor OpenNext's bundler
 * can resolve it, so the import is left for runtime (see loadConnect). Under `next dev` (Node) the
 * import fails and sending reports an error; test sending with `npm run preview:cf`.
 */

interface CfSocket {
  readable: ReadableStream<Uint8Array>
  writable: WritableStream<Uint8Array>
  close(): Promise<void>
  startTls(): CfSocket
}
type Connect = (address: { hostname: string; port: number }, options: { secureTransport: 'on' | 'off' | 'starttls'; allowHalfOpen: boolean }) => CfSocket

async function loadConnect(): Promise<Connect> {
  // turbopackIgnore: Next leaves the import alone. The .catch(): OpenNext's esbuild leaves an
  // import it can't resolve for runtime instead of failing; wrangler and workerd provide it.
  // @ts-expect-error -- a Workers runtime module; this app has no types for it
  const mod = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ 'cloudflare:sockets')
    .catch((e: unknown) => { throw new Error(`SMTP needs the Cloudflare Worker runtime (${e instanceof Error ? e.message : e})`) }) as { connect: Connect }
  return mod.connect
}

const enc = new TextEncoder()
const b64 = (s: string) => Buffer.from(s, 'utf8').toString('base64')
const wrap76 = (s: string) => s.replace(/.{1,76}/g, '$&\r\n')
const oneLine = (s: string) => s.replace(/[\r\n]+/g, ' ').trim()
/** RFC 2047 encoded word, for subjects and display names with any characters */
const encodeWord = (s: string) => `=?UTF-8?B?${b64(oneLine(s))}?=`

export interface SmtpMessage { to: string; subject: string; text: string; html: string }

export interface SmtpOptions {
  host: string
  port: number
  username: string
  password: string
  from: string
  fromName: string
}

class Conn {
  private reader: ReadableStreamDefaultReader<Uint8Array>
  private writer: WritableStreamDefaultWriter<Uint8Array>
  private buffer = ''
  private decoder = new TextDecoder()

  constructor(private socket: CfSocket) {
    this.reader = socket.readable.getReader()
    this.writer = socket.writable.getWriter()
  }

  /** Swap to TLS after STARTTLS */
  upgrade() {
    this.reader.releaseLock(); this.writer.releaseLock()
    this.socket = this.socket.startTls()
    this.reader = this.socket.readable.getReader()
    this.writer = this.socket.writable.getWriter()
    this.buffer = ''
  }

  /** One full (possibly multi-line) reply: "250-…" lines then "250 …" */
  async reply(timeoutMs = 30000): Promise<{ code: number; text: string }> {
    const deadline = Date.now() + timeoutMs
    for (;;) {
      const lines = this.buffer.split('\r\n')
      for (let i = 0; i < lines.length - 1; i++) {
        if (/^\d{3} /.test(lines[i]) || /^\d{3}$/.test(lines[i])) {
          const text = lines.slice(0, i + 1).join('\n')
          this.buffer = lines.slice(i + 1).join('\r\n')
          return { code: Number(lines[i].slice(0, 3)), text }
        }
      }
      if (Date.now() > deadline) throw new Error('SMTP: no reply from the server')
      const { value, done } = await Promise.race([
        this.reader.read(),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error('SMTP: no reply from the server')), timeoutMs)),
      ])
      if (done) throw new Error('SMTP: the server closed the connection')
      this.buffer += this.decoder.decode(value, { stream: true })
    }
  }

  async command(line: string, expect: number[], hide = false): Promise<string> {
    await this.writer.write(enc.encode(`${line}\r\n`))
    const r = await this.reply()
    if (!expect.includes(r.code)) throw new Error(`SMTP ${hide ? 'AUTH' : line.split(' ')[0]}: ${r.text.slice(0, 200)}`)
    return r.text
  }

  async raw(data: string) { await this.writer.write(enc.encode(data)) }

  async close() {
    try { await this.socket.close() } catch { /* already closed */ }
  }
}

function buildMessage(o: SmtpOptions, m: SmtpMessage): string {
  const boundary = `b_${crypto.randomUUID().replace(/-/g, '')}`
  const domain = o.from.split('@')[1] || 'localhost'
  const headers = [
    `From: ${encodeWord(o.fromName)} <${o.from}>`,
    `To: <${oneLine(m.to)}>`,
    `Subject: ${encodeWord(m.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@${domain}>`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ]
  const part = (type: string, body: string) =>
    `--${boundary}\r\nContent-Type: ${type}; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${wrap76(b64(body))}`
  // Base64 lines never start with ".", so no dot-stuffing is needed
  return `${headers.join('\r\n')}\r\n\r\n${part('text/plain', m.text)}${part('text/html', m.html)}--${boundary}--\r\n`
}

const validAddress = (s: string) => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(s)

/** Sends each message in turn over one connection. Returns an error (or null) per message. */
export async function smtpSendAll(o: SmtpOptions, messages: SmtpMessage[]): Promise<(string | null)[]> {
  if (!messages.length) return []
  let conn: Conn
  try {
    const connect = await loadConnect()
    const implicitTls = o.port === 465
    conn = new Conn(connect({ hostname: o.host, port: o.port }, { secureTransport: implicitTls ? 'on' : 'starttls', allowHalfOpen: false }))
    const hello = await conn.reply()
    if (hello.code !== 220) throw new Error(`SMTP greeting: ${hello.text.slice(0, 200)}`)
    await conn.command('EHLO myconet.worker', [250])
    if (!implicitTls) {
      await conn.command('STARTTLS', [220])
      conn.upgrade()
      await conn.command('EHLO myconet.worker', [250])
    }
    await conn.command(`AUTH PLAIN ${b64(`\0${o.username}\0${o.password}`)}`, [235], true)
  } catch (e) {
    const message = (e instanceof Error ? e.message : String(e)).slice(0, 300)
    return messages.map(() => message)
  }

  const results: (string | null)[] = []
  for (const m of messages) {
    if (!validAddress(m.to) || !validAddress(o.from)) { results.push('Invalid address'); continue }
    try {
      await conn.command(`MAIL FROM:<${o.from}>`, [250])
      await conn.command(`RCPT TO:<${m.to}>`, [250, 251])
      await conn.command('DATA', [354])
      await conn.raw(buildMessage(o, m))
      await conn.command('.', [250])
      results.push(null)
    } catch (e) {
      results.push((e instanceof Error ? e.message : String(e)).slice(0, 300))
      try { await conn.command('RSET', [250]) } catch { break }
    }
  }
  while (results.length < messages.length) results.push('SMTP connection lost')
  try { await conn.command('QUIT', [221]) } catch { /* fine */ }
  await conn.close()
  return results
}
