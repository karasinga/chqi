# DNS Cheatsheet for Developers

> Practical reference for debugging deployment issues (domain points at the wrong
> server, 403s, propagation delays, SSL/cert problems). Built around the
> `chqi.org` / `dashboards.chqi.org` Coolify setup, but applies generally.

---

## 1. The 30-second mental model
DNS is the phone book of the internet: it translates a **domain name**
(`chqi.org`) into an **IP address** (`203.0.113.10`) that servers actually
live at.

- You **don't always edit DNS at your registrar's "domain settings"** — you
  edit it wherever the **nameservers** point. Often that's the same place you
  bought the domain (Namecheap, GoDaddy, Cloudflare Registrar), but if
  nameservers point to Cloudflare, you edit records in Cloudflare's dashboard,
  not the registrar's.
- A **record change takes time to spread** (propagation), controlled by its
  **TTL** (Time To Live, in seconds). Lower TTL = faster updates.

## 2. Record types you'll actually use
| Type | Maps | Use case |
|---|---|---|
| **A** | domain → IPv4 (e.g. `203.0.113.10`) | Point `chqi.org` at your server |
| **AAAA** | domain → IPv6 | Same, but IPv6 address |
| **CNAME** | domain → another domain | `www.chqi.org` → `chqi.org` (can't be used on the root `@` at most providers) |
| **TXT** | free text | Domain verification, SPF/email, ACME/SSL challenges |
| **MX** | domain → mail server | Email routing |
| **NS** | domain → nameserver | Delegates DNS to another provider (e.g. Cloudflare) |

## 3. Commands — look up & diagnose
Run these from **Git Bash** (recommended) or **PowerShell**.

### Resolve a domain to its IP (the #1 command)
```bash
# Windows PowerShell (native):
Resolve-DnsName chqi.org

# Git Bash / Linux / macOS:
nslookup chqi.org
dig +short chqi.org
```
Compare the `IPAddress` / answer for two domains — **if they differ, that's
your bug** (e.g. we once found `chqi.org`→`<wrong-ip>` vs
`dashboards.chqi.org`→`<server-ip>`, meaning the first domain pointed at a
different machine).

### Force a specific resolver (bypass local cache)
```bash
nslookup chqi.org 8.8.8.8      # Google DNS
nslookup chqi.org 1.1.1.1      # Cloudflare DNS
dig @8.8.8.8 chqi.org
```
Use this to confirm the *public* view, not a stale cached one on your
machine/ISP.

### See ALL records for a domain
```bash
dig chqi.org ANY
dig chqi.org +noall +answer        # just the answers, clean
Resolve-DnsName chqi.org -Type A
Resolve-DnsName chqi.org -Type TXT
```

### Check what a server actually returns (HTTP status + headers)
```bash
curl -sI https://chqi.org      # -I = HEAD request, shows status + Server header
curl -sI http://chqi.org
```
What to look for:
- `Server: nginx` / `Server: Apache` → which web server answered.
- `403 Forbidden` from a server you don't control = domain points at the
  **wrong host**.
- `Connection refused` / timeout = nothing listening / firewall / wrong IP.
- A redirect (`Location:`) = working as configured.

### Trace the full chain (advanced)
```bash
dig +trace chqi.org            # follows NS from root → TLD → your host
```

## 4. Diagnostic playbook (symptom → cause)
| Symptom | Run | Tells you |
|---|---|---|
| Site won't load at all | `nslookup chqi.org` | Is the IP right? Matches working domain? |
| 403 "Forbidden" | `curl -sI chqi.org` | Which server answered; is it yours? |
| Works on wifi, not mobile | `nslookup chqi.org 8.8.8.8` | Stale ISP cache / propagation lag |
| SSL/cert error | `curl -sI https://chqi.org` | Cert not issued for this domain yet |
| Change "didn't take" | `dig +short chqi.org` after wait | TTL still serving old IP |

## 5. Common gotchas
- **Wrong IP = wrong server.** If `domain A` and `domain B` should hit the same
  app, their A records must resolve to the **same IP**.
- **TTL wait.** After editing, old resolvers may cache the old IP for up to the
  TTL (often 300s–3600s). Lower TTL *before* a planned change to make it fast.
- **Cloudflare "Proxied" (orange cloud).** When proxied, `nslookup` shows a
  Cloudflare IP, not your server's — that's normal. But SSL mode
  (Flexible/Full/Strict) must match your origin or you'll get redirect loops /
  525 errors. If debugging, temporarily set to "DNS only" (grey) to see your
  real server IP.
- **Don't put schemes in host fields.** In Coolify (and most panels), enter
  `chqi.org`, **not** `http://chqi.org` or `https://chqi.org`. A scheme prefix
  can break the generated `server_name` and cause 403/mismatch.
- **`www` is a separate record.** If you want `www.chqi.org`, add it explicitly
  (CNAME → `chqi.org` or its own A).
- **Root `@` usually can't be a CNAME** — use an A (or AAAA) record for the bare
  domain.

## 6. Where you actually edit DNS
1. Find current nameservers: `dig chqi.org NS` (or check your registrar).
2. If NS = your registrar → edit in registrar's DNS panel.
3. If NS = `ns1.cloudflare.com` etc. → edit in **Cloudflare** (or whichever DNS
   host), not the registrar.
4. Add/Edit **A record**: `Name: @` (or `chqi.org`), `Value: <server-ip>`,
   `TTL: 300` (or Auto).
5. Wait, then verify with `dig +short chqi.org` → should now return the server
   IP.

---

The single most useful habit: **before touching anything, run
`nslookup <broken-domain>` and `nslookup <working-domain>` and compare the
IPs.** Most "site is down" tickets are a DNS mismatch.
