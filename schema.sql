-- =====================================================================
--  TRIP HQ  —  full database schema (MULTI-EVENT)
--  Paste this ENTIRE file into the Neon SQL Editor and click "Run".
--  Safe to re-run: it only creates things if they don't already exist.
-- =====================================================================

-- ---------- Events / trips (each one is its own world) ----------
CREATE TABLE IF NOT EXISTS trips (
  id         SERIAL PRIMARY KEY,
  code       TEXT UNIQUE NOT NULL,        -- the EVENT CODE people type to enter, e.g. "vegas2026"
  name       TEXT NOT NULL,               -- display name, e.g. "Mike's Bachelor Party"
  trip_date  DATE,                        -- used for the countdown
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- The guys (roster + who can log in) ----------
CREATE TABLE IF NOT EXISTS guests (
  id      SERIAL PRIMARY KEY,
  trip_id INT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  code    TEXT NOT NULL,                  -- login code: firstnamelastname, lowercase, no spaces
  name    TEXT NOT NULL,                  -- display name, e.g. "John Smith"
  rsvp    TEXT NOT NULL DEFAULT 'pending',-- pending | yes | no | maybe
  contact TEXT,
  sort    INT NOT NULL DEFAULT 0,
  UNIQUE (trip_id, code)                  -- same name-code can exist in different events
);

-- ---------- Schedule / itinerary (admin edits) ----------
CREATE TABLE IF NOT EXISTS events (
  id         SERIAL PRIMARY KEY,
  trip_id    INT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  day        DATE,
  start_time TEXT,
  title      TEXT NOT NULL,
  location   TEXT,
  notes      TEXT,
  pinned     BOOLEAN NOT NULL DEFAULT FALSE,
  sort       INT NOT NULL DEFAULT 0
);

-- ---------- Ideas board + voting (everyone adds/votes) ----------
CREATE TABLE IF NOT EXISTS ideas (
  id         SERIAL PRIMARY KEY,
  trip_id    INT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  notes      TEXT,
  url        TEXT,
  category   TEXT,
  status     TEXT NOT NULL DEFAULT 'open',
  pinned     BOOLEAN NOT NULL DEFAULT FALSE,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS votes (
  id         SERIAL PRIMARY KEY,
  idea_id    INT NOT NULL REFERENCES ideas(id) ON DELETE CASCADE,
  guest_code TEXT NOT NULL,
  UNIQUE (idea_id, guest_code)
);

-- ---------- Notes board (everyone edits, live-ish) ----------
CREATE TABLE IF NOT EXISTS notes (
  id         SERIAL PRIMARY KEY,
  trip_id    INT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  title      TEXT,
  body       TEXT,
  color      TEXT DEFAULT 'yellow',
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Meal planner (everyone edits) + ingredients ----------
CREATE TABLE IF NOT EXISTS meals (
  id       SERIAL PRIMARY KEY,
  trip_id  INT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  day      DATE,
  slot     TEXT,
  title    TEXT NOT NULL,
  location TEXT,
  notes    TEXT,
  pinned   BOOLEAN NOT NULL DEFAULT FALSE,
  sort     INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS meal_ingredients (
  id      SERIAL PRIMARY KEY,
  meal_id INT NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  text    TEXT NOT NULL,
  qty     TEXT
);

-- ---------- Finances (admin edits, everyone views) ----------
-- An expense's total = the sum of its contributions (who actually paid).
-- Its cost is shared equally among the guys listed in expense_splits.
CREATE TABLE IF NOT EXISTS expenses (
  id           SERIAL PRIMARY KEY,
  trip_id      INT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  category     TEXT,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Who put money toward this item, and how much (supports MULTIPLE payers).
CREATE TABLE IF NOT EXISTS expense_contributions (
  id           SERIAL PRIMARY KEY,
  expense_id   INT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  guest_code   TEXT NOT NULL,
  amount_cents INT NOT NULL DEFAULT 0
);

-- Who shares this item (equal split of the total among these guys).
CREATE TABLE IF NOT EXISTS expense_splits (
  expense_id INT NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  guest_code TEXT NOT NULL,
  PRIMARY KEY (expense_id, guest_code)
);

-- ---------- Personal packing lists (each guy edits only his own) ----------
CREATE TABLE IF NOT EXISTS packing_items (
  id         SERIAL PRIMARY KEY,
  trip_id    INT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  guest_code TEXT NOT NULL,
  text       TEXT NOT NULL,
  checked    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Shared group shopping list (everyone) ----------
CREATE TABLE IF NOT EXISTS shopping_items (
  id         SERIAL PRIMARY KEY,
  trip_id    INT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  text       TEXT NOT NULL,
  qty        TEXT,
  checked    BOOLEAN NOT NULL DEFAULT FALSE,
  source     TEXT,
  added_by   TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ---------------------------------------------------------------------
--  Extra features (safe to run on an existing database too)
-- ---------------------------------------------------------------------
ALTER TABLE trips  ADD COLUMN IF NOT EXISTS budget_per_person_cents INT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS pay_handle TEXT;  -- Venmo / e-transfer / PayPal
ALTER TABLE guests ADD COLUMN IF NOT EXISTS diet TEXT;        -- allergies / dietary notes
ALTER TABLE packing_items ADD COLUMN IF NOT EXISTS public BOOLEAN NOT NULL DEFAULT FALSE;

-- Trip info / logistics: arbitrary titled sections (address, wifi, rules, rides, rooming, emergency…)
CREATE TABLE IF NOT EXISTS info_sections (
  id      SERIAL PRIMARY KEY,
  trip_id INT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  label   TEXT NOT NULL,
  body    TEXT,
  sort    INT NOT NULL DEFAULT 0
);

-- Who's responsible for what
CREATE TABLE IF NOT EXISTS tasks (
  id         SERIAL PRIMARY KEY,
  trip_id    INT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  assignee   TEXT,               -- guest code (optional)
  done       BOOLEAN NOT NULL DEFAULT FALSE,
  notes      TEXT,
  sort       INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Availability poll: candidate dates + each guy's yes/maybe/no
CREATE TABLE IF NOT EXISTS poll_dates (
  id      SERIAL PRIMARY KEY,
  trip_id INT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  label   TEXT NOT NULL,
  sort    INT NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS poll_votes (
  poll_date_id INT NOT NULL REFERENCES poll_dates(id) ON DELETE CASCADE,
  guest_code   TEXT NOT NULL,
  choice       TEXT NOT NULL,     -- yes | maybe | no
  PRIMARY KEY (poll_date_id, guest_code)
);

-- Recorded payments between guys (settling up)
CREATE TABLE IF NOT EXISTS settlements (
  id           SERIAL PRIMARY KEY,
  trip_id      INT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  from_code    TEXT NOT NULL,
  to_code      TEXT NOT NULL,
  amount_cents INT NOT NULL,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Group chat feed (any message can be turned into a to-do / buy / bring item)
CREATE TABLE IF NOT EXISTS messages (
  id         SERIAL PRIMARY KEY,
  trip_id    INT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  guest_code TEXT NOT NULL,
  name       TEXT NOT NULL,
  body       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Uploaded files & photos (stored in Vercel Blob; we keep the metadata here)
CREATE TABLE IF NOT EXISTS files (
  id           SERIAL PRIMARY KEY,
  trip_id      INT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  url          TEXT NOT NULL,
  pathname     TEXT,
  name         TEXT,
  content_type TEXT,
  size         INT,
  caption      TEXT,
  guest_code   TEXT,
  added_by     TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- =====================================================================
--  STARTER EVENT  —  EDIT the names, then add more guys as needed.
--  The EVENT CODE (here 'demo2026') is what the group types to get in.
--  Each guy's login = first + last name, lowercase, no spaces.
-- =====================================================================
INSERT INTO trips (code, name, trip_date) VALUES
  ('jamesspacebachelor', 'The Big Send-Off', '2026-09-11')
ON CONFLICT (code) DO NOTHING;

INSERT INTO guests (trip_id, code, name, sort)
SELECT t.id, v.code, v.name, v.sort
FROM trips t
JOIN (VALUES
  ('ajayprado',     'Ajay Prado',     1),   -- <-- change to YOUR real name
  ('brandoncotton',  'Brandon Cotton',  2),
  ('jamespucula', 'James Pucula', 3),
  ('jamierail',    'Jamie Rail',    4),
  ('kenpucula',    'Ken Pucula',    5),
  ('kyleallen',    'Kyle Allen',    6),
  ('kylelagrandeur',    'Kyle Lagrandeur',    7),
  ('nickaikenhead',    'Nick Aikenhead',    8)
) AS v(code, name, sort) ON TRUE
WHERE t.code = 'jamesspacebachelor'
ON CONFLICT (trip_id, code) DO NOTHING;

-- Some starter info sections for the demo event (only if it has none yet).
INSERT INTO info_sections (trip_id, label, body, sort)
SELECT t.id, v.label, v.body, v.sort
FROM trips t JOIN (VALUES
  ('Where we''re staying', 'Add the address + check-in / check-out times.', 1),
  ('Wi-Fi',               'Network + password once we have it.',            2),
  ('House rules',         'Anything the place asks of us.',                 3),
  ('Getting around',      'Who''s driving / car groups / rideshare plan.',  4),
  ('Rooming',             'Who''s bunking where.',                          5),
  ('Emergency contacts',  'A couple of numbers, just in case.',             6)
) AS v(label, body, sort) ON TRUE
WHERE t.code = 'demo2026'
  AND NOT EXISTS (SELECT 1 FROM info_sections s WHERE s.trip_id = t.id);


-- =====================================================================
--  To start a SECOND event later, run something like this (new code!):
--
--  INSERT INTO trips (code, name, trip_date)
--    VALUES ('cabo2027', 'Chris''s Stag', '2027-03-14');
--  INSERT INTO guests (trip_id, code, name, sort)
--  SELECT t.id, v.code, v.name, v.sort
--  FROM trips t JOIN (VALUES
--    ('jaydoe','Jay Doe',1), ('samwest','Sam West',2)
--  ) AS v(code,name,sort) ON TRUE
--  WHERE t.code = 'cabo2027';
-- =====================================================================
