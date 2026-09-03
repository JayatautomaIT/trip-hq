# Trip HQ 🍻

A free, multi-event planning site for trips and bachelor parties. One deployment, reuse it for every group. Each **event** has its own code, its own guys, and its own schedule / ideas / notes / meals / money.

## What's inside

- **Login by code** — people enter an **event code** (the demo one is `demo2026`) + their **name code** (`firstnamelastname`). No signups.
- **You (organizer)** get an extra **admin passcode** that unlocks finances, the schedule, event settings, and pinning.
- **Schedule** — day-by-day itinerary (admin edits, everyone views). Pin the locked-in ones.
- **Ideas & Voting** — anyone pitches ideas with links; everyone votes; you pin the winners.
- **Date Poll** — candidate dates; everyone marks works / maybe / can't; the front-runner floats up.
- **Chat** — group chat where any message can be turned into a **to-do**, **shopping item**, or **packing item** in one tap.
- **Notes Board** — shared sticky notes, everyone edits, auto-refreshes.
- **To-Do / Assignments** — who's booking what; assignee ticks it off.
- **Meal Planner** — collaborative; add ingredients to any meal, push them to the shared shopping list; dietary notes surface here.
- **Packing & Shopping** — each guy's **private** packing list, an opt-in **"what everyone's bringing"** board, and one shared group shopping list.
- **Money** — expenses with **multiple payers per item** + per-item split selection; auto balances & "who pays whom"; **payment handles**, **recorded settlements**, **per-person budget**, and **spending by category**.
- **Files & Photos** — everyone uploads photos, tickets, and reservation PDFs (via Vercel Blob).
- **Trip Info** — address, Wi-Fi, house rules, rides, rooming, emergency contacts; plus event settings (name/date/budget).
- **The Guys / RSVP** — roster; each guy sets his own RSVP, payment handle, and dietary notes; you can edit anyone.
- **Copy summary** — one tap on the home page copies a plan summary to paste into your group chat.

---

## Setup (about 15 minutes)

You'll need a **GitHub** account, a **Vercel** account (both free — you have these), and a free **Neon** database.

### 1) Create the database (Neon)

1. Go to **https://neon.tech** and sign up (free).
2. Create a new project. Any name/region is fine.
3. Open **SQL Editor** in the Neon dashboard.
4. Open [`schema.sql`](schema.sql) from this project. **Edit the starter event + roster near the bottom** (your event code, your name, the guys). Then paste the whole file into the SQL Editor and click **Run**.
5. Click **Connect** (or **Connection Details**) and copy the **Pooled connection string**. It looks like:
   `postgresql://user:password@ep-xxxx-pooler.region.aws.neon.tech/dbname?sslmode=require`
   Keep this handy — it's your `DATABASE_URL`.

### 2) Put the code on GitHub

From this project folder:

```bash
git init
git add .
git commit -m "Trip HQ"
git branch -M main
git remote add origin https://github.com/<your-username>/trip-hq.git
git push -u origin main
```

(Create the empty `trip-hq` repo on GitHub first, then use its URL above.)

### 3) Deploy on Vercel

1. Go to **https://vercel.com** → **Add New… → Project** → import your `trip-hq` repo.
2. Framework preset auto-detects **Next.js**. Leave build settings default.
3. Before deploying, open **Environment Variables** and add these three:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | the Neon pooled connection string from step 1 |
   | `SESSION_SECRET` | a long random string (see below) |
   | `ADMIN_PASSCODE` | your private organizer passcode (not your name!) |

   Generate a `SESSION_SECRET` with either:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   ```bash
   openssl rand -hex 32
   ```
4. Click **Deploy**. When it finishes you'll get a URL like `https://trip-hq.vercel.app`.

### 3b) Turn on file/photo uploads (Vercel Blob) — optional but recommended

The **Files & Photos** page needs a Blob store (free tier is plenty for a trip):

1. In your Vercel project → **Storage** (sidebar) → **Create Database** → **Blob**.
2. Set access to **Public**, name it anything (e.g. "Files"), and create it — keep it connected to this project.
3. Vercel automatically adds a `BLOB_READ_WRITE_TOKEN` env var to the project.
4. **Redeploy** (Deployments → ⋯ → Redeploy) so the new env var is picked up.

If you skip this, the whole app still works — only the Files page will error when someone tries to upload.

### 4) Log in

- Visit the URL → **Log in** with your **event code** + your **name code**.
- On the login page, enter your **admin passcode** to unlock organizer editing.
- Send each guy the **URL + event code + his own name code** (first+last name, lowercase, no spaces).

---

## Running it locally (optional)

```bash
npm install
```
Copy `.env.example` to `.env.local` and fill in the three variables, then:
```bash
npm run dev
```
Open http://localhost:3000.

---

## Starting a SECOND event later

No redeploy needed — just add a new event in the Neon SQL Editor. There's a ready-to-edit snippet at the bottom of [`schema.sql`](schema.sql). Give it a **new event code** and its own roster. Different group, different codes, totally separate data. You stay admin everywhere with the same passcode.

---

## Customizing

- **App name** (header/tab): edit `APP_NAME` in [`lib/config.ts`](lib/config.ts).
- **Event name + date** (per event): set when you insert the trip row in `schema.sql`.

## How permissions work (quick reference)

| Area | Who can edit |
|---|---|
| Notes, Ideas, Votes, Meals, Shared shopping | Anyone logged into the event |
| Your own packing list, your own RSVP | Just you |
| Schedule, Finances, Pins, Add/remove guys | Admin (organizer passcode) |

Name codes aren't secret (they're just names), so they're only an identity — **real protection is the admin passcode**, which is the only thing guarding the money and schedule. Keep it private.
