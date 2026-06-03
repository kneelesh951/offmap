# Running Offmap locally — no API keys needed

The app runs completely without any external services using **Mock Mode**.
Everything is simulated in memory: auth, database, payments, emails.

---

## Setup in 3 steps (takes ~5 minutes)

### Step 1 — Install dependencies
```bash
npm install
```

### Step 2 — The .env.local is already configured for mock mode
The file `.env.local` is pre-configured with `MOCK_MODE=true`.
You don't need to change anything.

### Step 3 — Start the app
```bash
npm run dev
```

Open **http://localhost:3000**

That's it. The app is fully running.

---

## What works in mock mode

| Feature | Mock behaviour |
|---|---|
| Registration | Works — creates in-memory user |
| Login | Works — use demo accounts below |
| Browse hosts | Works — 6 pre-seeded hosts across 4 cities |
| Search & filter | Works — filters against seed data |
| Host profiles | Works — full profile pages |
| Subscribe | Works — fake checkout, subscription activates instantly |
| Messaging | Works — messages stored in memory |
| Reviews | Works |
| Host dashboard | Works |
| Emails | Logged to terminal instead of sent |

---

## Demo accounts (pre-seeded)

| Role | Email | Password |
|---|---|---|
| Traveler | `traveler@demo.com` | `demo1234` |
| Host | `host@demo.com` | `demo1234` |

Or register any new account — it works without real email.

---

## Try the full flow

1. **Find a host** — go to `/search`, browse the 6 pre-seeded hosts
2. **Click "Connect"** — you'll be prompted to subscribe
3. **Subscribe** — click any plan, the fake checkout completes instantly
4. **Message a host** — type a message, it appears in real time
5. **View host dashboard** — log in as `host@demo.com`, see your messages

---

## What happens when you get real API keys

1. Open `.env.local`
2. Change `MOCK_MODE=true` to `MOCK_MODE=false` (and `NEXT_PUBLIC_MOCK_MODE=false`)
3. Fill in your real keys (see `.env.example` for where to get each one)
4. Run `npm run db:migrate && npx tsx drizzle/seed.ts`
5. Restart `npm run dev`

The app switches to real Supabase, Stripe, and Redis automatically.
No code changes needed — the mock/production switch is entirely config-based.

---

## Data resets on restart

Mock data lives in memory. Every time you restart `npm run dev`, the database
resets to the seed data. This is intentional for local development.

To persist data between restarts, use a real Supabase project (see `.env.example`).
