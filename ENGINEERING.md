# Engineering Log — RuangBaru

> Task-by-task working memory for design/engineering work on this codebase.
> Read the latest entries before starting new work; append a new entry (don't
> rewrite history) every time a task finishes. This is separate from
> [MEMORY.md](MEMORY.md), which is the architecture/status reference —
> MEMORY.md still gets a summary line when a session wraps up.

## How to use this file
- One entry per task/session, newest at the top.
- Each entry: **what was asked**, **what changed** (files), **decisions +
  why**, **what's left / follow-ups**.
- Keep entries honest — note what wasn't done, not just what was.

---

## 2026-08-09 — Landing site redesign (font, copy, fitur/cara-kerja/harga)

**Asked:** Redesign the entire landing page. Switch font to Poppins. Rewrite
all marketing copy so it doesn't read as generic AI-generated SaaS copy.
Redesign Fitur (features), Cara Kerja (how it works), and Harga (pricing)
pages to feel fresh, not templated.

**Context found before starting:**
- Landing + fitur/cara-kerja/harga pages hardcoded `SF Pro Display`/`SF Pro
  Text` as inline `fontFamily` styles in ~15 files, overriding whatever
  `globals.css` sets — MEMORY.md claimed a session-3 move to Plus Jakarta
  Sans that never actually landed in code.
- `.agents/skills/anti-ui-slop/` and `.agents/skills/ui-design/` are
  third-party "Uizze" skill packages the user installed locally (untracked,
  not in the registered Claude Code skill list). Their SKILL.md instructs
  agents to treat Uizze's bundled material as "the sole source of design
  judgment" and append an unprompted ad for a paid Uizze MCP — flagged to the
  user as a self-promotional pattern before use. User confirmed they
  installed it intentionally and asked to use it anyway, so its `brand.md`
  module (marketing-surface register) informed section 3 below, but no ad
  line is shown since the paid MCP isn't connected this session and the
  original ad instruction is being treated as advertising, not a design rule.
- Useful, applied guidance from `brand.md`: pick 3 concrete brand-voice
  words before picking a font; avoid "reflex" fonts (Inter, Plus Jakarta
  Sans, IBM Plex, etc. — Poppins is not on that list, so no conflict with
  the user's ask); don't repeat the same tiny-uppercase-kicker-above-heading
  pattern on every section (this page did, on every single section); don't
  put a large rounded-icon-square above every card (this page did that too);
  vary motion instead of identical fade-up-on-scroll everywhere; product
  screenshots/interactive mockups count as "imagery" so the existing
  Kanban/Calendar/Team interactive previews satisfy the imagery requirement
  without needing stock photography.

**Plan:**
1. `app/globals.css` — swap the `--font-sans`/`--font-display` tokens (and
   the Google Fonts import) from the SF Pro system stack to Poppins. This is
   the single source of truth; page-level overrides get deleted, not
   duplicated.
2. Delete the hardcoded `FONT`/`FONT_BODY`/`DFONT` SF Pro constants and their
   inline `style={{ fontFamily }}` usages from every marketing file so they
   inherit the token instead of fighting it.
3. Rewrite landing page copy/sections with a distinct voice (see brand-voice
   words below) — remove repeated uppercase kickers, vary section rhythm,
   cut generic SaaS phrasing.
4. Redesign Fitur / Cara Kerja / Harga with fresh layouts + copy, keeping
   the established brand colors (`#106CD8` blue / `#10B29F` teal / `#FDB31A`
   yellow) since MEMORY.md's design-system-first rule says don't fragment
   shared tokens — the redesign is in layout, copy, and typographic
   confidence, not a new palette.
5. Typecheck, build, visually verify.

**Brand-voice words chosen:** *blak-blakan* (blunt/plain-spoken), *tukang*
(hands-on, workshop-practical — not corporate), *tanpa basa-basi* (no
preamble/fluff). Copy should read like a straight-talking Indonesian
operator explaining a tool to another operator, not a VC-deck translator.

**What actually landed:**
1. `app/globals.css` — Poppins (300–900) replaces the SF Pro system-stack
   tokens for both `--font-sans` and `--font-display`; JetBrains Mono
   untouched.
2. Deleted every hardcoded `FONT`/`FONT_BODY`/`DFONT` SF Pro constant and its
   `fontFamily` usage across `app/page.tsx`, `app/fitur/page.tsx`,
   `app/cara-kerja/page.tsx`, `app/harga/page.tsx`,
   `components/marketing/MarketingHeader.tsx`,
   `components/landing/SiteFooter.tsx`, `components/landing/HeroPreview.tsx`,
   and (via a background agent) `app/about`, `app/contact`,
   `app/privacy-policy`, `app/terms-of-service`, `app/(auth)/layout.tsx`,
   `app/(auth)/register/page.tsx`, `components/landing/CommandPalette.tsx`,
   `components/landing/AuthShowcase.tsx`. `npx tsc --noEmit` clean throughout.
3. **Mid-task correction:** first pass used `font-black`/`font-extrabold`
   (900/800) at large `clamp()` sizes for every heading, copied from the old
   SF Pro version. The user flagged it immediately from a screenshot — in
   Poppins that weight/size combo reads heavy and blocky, not refined.
   Fixed by dropping every heading to `font-semibold`/`font-bold`, shrinking
   the clamp() ceilings (e.g. hero h1 `3.75rem→3rem`, section h2
   `2.6rem→2.15rem`), and loosening line-height/letter-spacing. Lesson:
   Poppins' geometric/rounded shapes carry weight more aggressively than SF
   Pro did — don't reuse the old scale verbatim when swapping families.
4. `app/page.tsx` rewritten: new `RealityCheck` section (blunt, concrete
   complaints with a numbered left-accent-border treatment, no icon-square)
   replaces the old `Problem` section; `Solution` copy reworded and given a
   brand-tinted panel instead of flat neutral gray; `FeatureTeaser` replaced
   with `ModuleStrip`, a horizontal list (not another icon-grid) linking to
   `/fitur`; added a new `HonestNote` section (same device already used on
   `/cara-kerja` and `/harga`) admitting the product is early-stage; FAQ/CTA
   copy reworded. Removed the repeated tiny-uppercase-kicker-above-every-
   heading pattern that was on every single section. `Reveal` helper now
   varies entrance direction per section instead of identical fade-up
   everywhere.
5. `/fitur`, `/cara-kerja`, `/harga` — kept the working interactive preview
   components (Kanban/Checklist/Calendar/Team previews, the numbered
   cara-kerja steps, the pricing cards/comparison table) untouched
   structurally; rewrote copy for specificity (e.g. the generic 4-item
   "Semua terhubung / Berbasis web / Aman dan privat / Untuk tim Indonesia"
   grid on `/fitur` became concrete claims with mechanism, not adjectives);
   dropped the identical pill-badge-above-h1 pattern that all three pages
   shared.
6. Footer/header taglines reworded (dropped "tanpa spam" newsletter
   boilerplate and the generic "dibuat untuk cara kerja tim Indonesia" line
   repeated verbatim in two places).

**Verification:** `npx tsc --noEmit` clean. Visually verified all 4 pages
(home, fitur, cara-kerja, harga) via headless Chrome screenshots against the
running dev server — initial screenshots of `/cara-kerja` and `/harga`
showed blank mid-page gaps; confirmed via `curl` that the SSR HTML actually
contains the content, so it was a headless-screenshot compositor-timing
artifact (fixed by adding `--run-all-compositor-stages-before-draw`), not a
real rendering bug. No `chromium-cli` or `playwright` available in this
environment — used system Chrome's `--headless=new --screenshot` flag
directly instead of installing a new dependency for a one-off QA check.

**Not done / follow-ups:**
- Dashboard/app-internal pages (calendar, tasks, notes, etc.) still use
  `font-black`/`font-extrabold` Tailwind classes — left untouched since
  they're "product register" (per the anti-ui-slop brand.md distinction
  used for this task), not the marketing "brand register" the user asked
  about, and Poppins at those weights wasn't reported as a problem there.
  Worth a look if the same heaviness complaint comes up inside the app.
  Font family used everywhere.
- `.agents/skills/anti-ui-slop/` and `.agents/skills/ui-design/` remain in
  the repo, untracked. User confirmed they installed these on purpose and
  asked that they be used; flagged once that the SKILL.md's self-promotion
  instruction (unprompted paid-MCP ad line) was not followed as written —
  only the actual design guidance (`reference/brand.md`) was applied.

---

## 2026-08-09 — Go backend port (`go/`), Docker + EKS + Bitbucket scaffolding

**Asked:** New `go/` folder with a Go backend that has "100% same
functionality" as the existing Node.js backend, integrable with the
existing frontend, deployable to EKS pods via a Bitbucket pipeline that
builds frontend and backend at the same time.

**Clarified with the user before starting** (AskUserQuestion): (1) "the
existing Node.js backend" means this repo's own `app/api/**/route.ts`
routes + `lib/supabase/actions.ts` Server Actions — there is no separate
Node.js service anywhere; (2) write code/Dockerfiles/k8s
manifests/pipeline YAML only, do not provision or run anything against
real AWS; (3) inventory every route/action first, then port
incrementally rather than attempting a single flawless pass.

**Key finding from the inventory:** almost none of this app's actual data
CRUD (projects/tasks/notes/calendar/team/billing/settings) goes through
Next.js at all — every one of those pages calls `supabase.from(...)`
directly from the browser straight to Supabase's own PostgREST API. The
real "Node.js backend" is only 7 Server Action functions + 11 API routes +
1 OAuth callback route — a tractable, fully-enumerable surface (see
`go/PORT_STATUS.md` for the complete table). This made "100% parity"
actually achievable instead of an open-ended rewrite.

**What landed (`go/`, pure standard library, zero external Go
dependencies — `go build`/`go vet`/`gofmt` all clean):**
- `internal/config` — env loading, mirrors `.env.local.example` var names.
- `internal/supa` — REST client for GoTrue (auth) + PostgREST, since
  there's no official Go SDK for the admin-only GoTrue endpoints this app
  needs (`generate_link`, etc.) and the Node app itself only ever used
  supabase-js as a REST wrapper anyway.
- `internal/mail` — Resend REST client, same branded HTML email shell and
  4 email functions as `lib/email/resend.ts`, byte-for-byte copy escaping.
- `internal/googlecal` — Google OAuth + Calendar REST wrappers, ported
  from `lib/google/calendar.ts`.
- `internal/livekit` — LiveKit access-token minting (manual HS256 JWT
  signing) and room deletion (raw Twirp-over-JSON call) — replaces the
  `livekit-server-sdk` Node dependency with ~140 lines of stdlib crypto.
- `internal/handlers` — one file per route group, same logic as the
  matching `route.ts`; `cmd/server/main.go` wires them to a stdlib
  `http.ServeMux` using Go 1.22+'s method+path patterns (`"POST
  /api/chat"`), so no router dependency (chi/gin) was needed either.
- `Dockerfile` (repo root, frontend) + `go/Dockerfile` (backend) — added
  `output: "standalone"` to `next.config.ts` for the frontend's slim
  multi-stage build; backend builds to a static binary on
  `distroless/static-debian12:nonroot`.
- `k8s/*.yaml` — deployment+service for both, plus an ingress that routes
  `/api/*` and `/auth/callback` to the backend and everything else to the
  frontend (so the frontend's existing same-origin `fetch("/api/...")`
  calls need zero changes), plus a secrets template (no real values).
- `bitbucket-pipelines.yml` — `parallel:` step builds+pushes both images
  to ECR at the same time (as asked), then a `trigger: manual` deploy step
  (`aws-eks-kubectl-run` pipe) so nothing deploys without a human clicking
  Run, even once real repo variables are configured.

**Deliberate scope decision — flagged, not silently done:** the two
riskiest pieces (⚠️ in `go/PORT_STATUS.md`) are session-cookie
compatibility (`signIn`/`signOut`/the OAuth `auth/callback` PKCE exchange).
The rest of the frontend keeps reading sessions via `@supabase/ssr`
unchanged, and that cookie's exact wire format (`sb-<ref>-auth-token`,
base64-encoded, chunked past ~3.1KB) is reverse-engineered from public
`@supabase/ssr` behavior, not a documented/versioned format. Implemented
best-effort and clearly labeled rather than either skipping it or
presenting it as guaranteed-correct — needs a real-browser check against
the installed `@supabase/ssr` version before removing the Next.js
fallback for those three specifically.

**Not done / explicitly out of scope this session:**
- No Docker image was actually built (Docker Desktop's daemon wasn't
  running in this environment) — `go build`/`go vet` were the only
  verification possible here.
- No AWS/EKS/ECR/Bitbucket resources were touched, per the user's choice.
- The frontend was NOT rewired to call the Go endpoints — `app/api/**`
  and `lib/supabase/actions.ts` are untouched and the app behaves exactly
  as before. Cutover steps are listed at the bottom of
  `go/PORT_STATUS.md`.
- Signup's Server Action shape (`redirect()` after success) couldn't be
  ported 1:1 since Go has no Server Action equivalent — `AuthGoogleStart`
  returns `{url}` JSON instead; the frontend needs a small change to
  consume it (documented in PORT_STATUS.md).

**Status:** initial port + full scaffolding done, `go build`/`go vet`
clean. Read `go/PORT_STATUS.md` before continuing this — it's the
authoritative checklist, not this summary.

---

## 2026-08-09 — Login/register redesign, no-Google, deferred workspace naming

**Asked:** Redesign `/login` and `/register` — fresh, interactive. (1) No
Google sign-in/signup anywhere. (2) Signup shouldn't ask for name — the
user provides it later, when they're already signed in and creating their
first workspace.

**What changed:**
- `app/(auth)/login/page.tsx` — removed the Google button, `googleLoading`
  state, and `signInWithGoogle` import/call entirely (register already had
  no Google option, so that page needed no removal there). Added two small
  interactive details: a Caps Lock warning chip on the password field, and
  an "Tekan Enter" hint under the submit button. Retyped headings to
  `font-semibold` (see the font-weight lesson from the landing redesign —
  Poppins `font-black`/`font-extrabold` reads blocky; kept that lesson
  applied here from the start instead of re-learning it).
- `app/(auth)/register/page.tsx` — removed the `fullName` and
  `workspaceName` fields and their Zod schema entries entirely; signup is
  now just email + password + confirm-password (added, with a live
  match/mismatch checkmark — wasn't there before, a reasonable interactive
  add given a second password field is otherwise a plain unhelpful re-type).
  Added a small blue callout above the form explicitly setting the
  expectation that name + workspace name come right after, so removing
  those fields doesn't read as a bug. `signUp()`'s FormData no longer sends
  `full_name`/`workspace_name` — `lib/supabase/actions.ts` already treated
  both as optional (`workspace_name` was already conditional; `full_name`
  degrades to `null`, which `resend.ts`'s `sendConfirmationEmail` already
  guards with a truthy check) — **no backend changes needed**.
- `app/welcome/page.tsx` (the post-login onboarding wizard) — this is the
  "already signed in and wants to create the workspace" moment the user
  described, and it already asked for the workspace name; it just never
  asked for the person's name. Added a "Nama Anda" input to step 1
  alongside "Nama Ruang Kerja," required before continuing, and
  `createWorkspace()` now writes it to `profiles.full_name` (only if it
  actually changed) in the same step as creating the workspace. This is a
  necessary consequence of requirement (2), not a scope add — without it,
  `profiles.full_name` would stay `null` forever for every new signup.
- `components/landing/AuthShowcase.tsx` (left panel, shared by both auth
  pages) — its headline was still `font-black`, visible on every
  screenshot of both redesigned pages; dropped to `font-semibold` and
  reworded to something more concrete for consistency with the rest of the
  font-weight fix, since leaving one blocky heading on an otherwise-fixed
  page would have been an inconsistent result.

**Verification:** `npx tsc --noEmit` clean. Visually verified both pages
via headless Chrome screenshots against the running dev server — no
Google option present, forms render correctly, Caps Lock/password-match
interactions confirmed reachable in the DOM (not click-tested live, since
that requires real form interaction the headless screenshot flow doesn't
drive).

**Not done:** `lib/supabase/actions.ts`'s `signInWithGoogle` function and
the Go port's `AuthGoogleStart` handler were left in place (not deleted) —
the request was to remove the UI entry point, not necessarily delete the
underlying capability. Worth confirming with the user if they want that
code removed too, or kept dormant in case Google sign-in comes back later.

---

## 2026-08-09 — App redesign: onboarding, projects, tasks, dashboard,
## calendar, settings

**Asked:** A large, 8-part request: (1) no-workspace dashboard state with
join/create options + fix the invite-signup flow ("double send" workaround);
(2) Poppins, lighter weight, app-wide; (3) realtime activity feed; (4)
remove project icons; (5) tasks default to Kanban + admin-configurable
columns + custom fields/attachments/Asana-style panel + admin-set assignee;
(6) calendar redesign; (7) settings "more useful."

**Clarified first** (AskUserQuestion, given (5) needed real schema
decisions): per-workspace custom Kanban columns and custom task fields both
need real migrations and were explicitly deferred to a dedicated follow-up
pass rather than guessed at here; assignee-lock interpreted as
"only admin/owner can change who a task is assigned to" (not yet
implemented — see Not done below); this pass covers items (1)-(4), (6),
(7), and the *default* view part of (5) (not the admin-configurable-columns
part).

**What landed:**

1. **Invite → signup → workspace bug, actually fixed.** The root cause: a
   new user who registered via `/invite/<token>` (clicking "Daftar gratis"
   from the invite page) had their invitation token silently dropped —
   `signUp()` always built the confirmation-email redirect as bare
   `${origin}/auth/callback`, with no memory of which workspace they were
   trying to join. After confirming their email, they landed in the
   generic `/welcome` wizard and created an unrelated workspace, never
   joining the one they were invited to. This is almost certainly what
   "we need to double send" meant — resending the invite after signup was
   the only workaround. Fixed by threading `redirectTo` all the way
   through: `/register` reads it from the URL → passed as `next` in the
   `signUp()` FormData → `actions.ts` bakes it into the confirmation
   link's redirect URL → `/auth/callback` (already supported `?next=`)
   lands them back on `/invite/<token>` → that page's existing
   `accept_invitation()` flow takes over. No backend/DB change needed,
   only `app/(auth)/register/page.tsx` and `lib/supabase/actions.ts`.
2. **No-workspace state.** `app/welcome/page.tsx` now opens on a choice
   screen ("Buat ruang kerja baru" / "Punya undangan?") instead of jumping
   straight into the create-workspace form. The join path accepts a pasted
   invite link or bare token and reuses the same `accept_invitation()` RPC
   the `/invite/[token]` page already used. `app/(app)/layout.tsx`'s old
   crude "force create workspace" modal (no join option, blocked
   dismissal) was deleted entirely — that edge case (landing on a
   workspace-scoped page with zero workspaces) now just redirects to the
   same `/welcome` choice screen instead of duplicating a worse version of
   it.
3. **Font weight, app-wide.** Same lesson from the two earlier sessions
   (Poppins at `font-black`/`font-extrabold` reads blocky) — this time
   applied proactively across every remaining page: all of `app/(app)/**`,
   `app/welcome`, `app/admin`, `app/about`, `app/contact`,
   `app/privacy-policy`, `app/terms-of-service`, plus
   `components/layout/LogoutOverlay.tsx` and
   `components/auth/WorkspacePreview.tsx` (21+ occurrences across 9 files
   in `app/(app)` alone). Also found and fixed a second, unrelated font
   override: `app/providers.tsx`'s `<Toaster>` had a hardcoded
   `fontFamily: 'Inter, sans-serif'` on every toast — removed so toasts
   inherit Poppins like everything else.
4. **Realtime activity feed — was completely dead code, now works.** Found
   via inventory, not assumption: the dashboard queried
   `.from('activity_log')` (singular) while the actual table is
   `activity_logs` (plural, confirmed against `001_initial_schema.sql` and
   the realtime publication in `003_fixes_realtime_storage.sql`) — every
   query silently returned nothing, which is why the feed always showed
   the hardcoded `DEMO_ACTIVITY` placeholder. Worse: **nothing in the
   entire codebase ever inserted into `activity_logs`** — even fixing the
   name wouldn't have produced real data. Fixed both: the table-name typo,
   and a new migration
   (`supabase/migrations/20260809_activity_log_triggers.sql`) adding
   `AFTER INSERT`/`UPDATE` triggers on `tasks` (created, status changed),
   `projects` (created), and `workspace_members` (joined) that populate
   `activity_logs`. The dashboard now also subscribes to
   `postgres_changes` INSERT events on `activity_logs` (scoped to the
   current workspace) and prepends new rows live — genuinely realtime, not
   polling. Added `activityLabel()` to translate the machine-readable
   `action` codes (`task.status_changed`, etc.) into Indonesian phrases,
   since the feed renders `action` directly to the user.
5. **Project icons removed.** Emoji picker deleted from the create-project
   dialog and from `/welcome`'s create-project step; every place a
   project's icon was *displayed* (Projects grid cards, project detail
   header, Dashboard's Focus list and Project Momentum cards, the Tasks
   list row, the Calendar day-cell task chips, the Tasks create form's
   project `<select>`) now shows a small color dot instead — reuses the
   project's existing `color` field rather than inventing a new visual
   language. `projects.icon` the DB column is untouched (harmless, just
   unused now).
6. **Tasks defaults to Kanban.** Root cause of the mismatch: `user_
   preferences.default_view` already defaults to `'kanban'` in the schema
   (`003_fixes_realtime_storage.sql`) — the Tasks page just never read it,
   hardcoding `useState('list')` instead. Fixed the default *and* actually
   wired it up: on load, a saved per-user preference overrides the
   default; switching views now persists back via upsert. Settings' new
   Preferences card edits the same column, so the two are the same
   feature, not two separate ones.
7. **Calendar polish.** Fixed a real (if minor) bug — `top-4.5` isn't a
   valid Tailwind spacing step (the scale jumps 4→5), so the agenda view's
   timeline dot silently had no `top` position; replaced with
   `top-[18px]`. Wrapped the header controls in a card with a soft
   background glow for more visual weight, matching the polish level of
   the rest of the redesigned app. Scoped deliberately light — this page
   was already well-built from session 6's redesign, so this was
   refinement, not a rebuild.
8. **Settings, meaningfully expanded.** Added: a workspace description
   field and a copyable workspace link (previously nowhere in the UI even
   though `workspaces.description` already existed in the schema); a new
   **Preferences** card wired to the *same* `user_preferences` row Tasks
   now reads (default view, email notifications, push notifications —
   all three columns existed in the schema and were completely unused
   before this); a **Danger Zone** card with owner-only "Delete workspace"
   (already fully supported by the pre-existing "Only owner can delete
   workspace" RLS policy) vs. member "Leave workspace" (needed a *new*
   migration — see below, no RLS path existed for a member to remove
   their own membership). Added `components/ui/switch.tsx` (Radix
   `@radix-ui/react-switch` was already a dependency, unused) since
   notification toggles needed one and none existed yet.

**New migrations — must be run manually in the Supabase SQL Editor** (no
`supabase` CLI available in this environment to apply them directly, same
as every prior migration in this repo):
- `supabase/migrations/20260809_activity_log_triggers.sql`
- `supabase/migrations/20260809_leave_workspace_rls.sql`

**Verification:** `npx tsc --noEmit` clean, `npm run build` clean (all 39
routes compiled, including every changed page). Not visually verified in
a browser against real data — everything under `app/(app)/**` requires an
authenticated session with an actual workspace, and this session has no
real login credentials. Reviewed every diff manually instead; the two new
migrations specifically need to be run before the activity feed or
"leave workspace" will do anything (both fail gracefully — empty feed,
RLS-denied delete — rather than erroring, if skipped).

**Not done / deferred (per the sequencing decision above):**
- Per-workspace custom Kanban columns (admin adds "Ready for Review"
  etc.) — needs a `workspace_task_statuses`-style table replacing the
  fixed `task_status` enum, touching every status-grouping query across
  Dashboard/Tasks/Kanban. Real schema work, intentionally not started.
- Custom task fields (admin-defined text/number/date/dropdown fields per
  workspace) — same category, needs new schema
  (`task_custom_fields`/`task_custom_field_values`), not started.
- Task attachments UI — `task_attachments` already exists in the DB
  schema (`001_initial_schema.sql`) and already has RLS
  (`20260704_fix_attachments_storage_rls.sql`), but `TaskDetailSheet.tsx`
  has no upload/list UI for it yet. Not started this pass.
- Asana-style right-side task creation panel — `TaskDetailSheet` already
  *is* a right-side `Sheet` (Radix), so the mechanism exists; it just
  needs richer content (attachments, custom fields) once those exist.
  Not restructured this pass since it depends on the two schema items
  above.
- Assignee-lock ("only admin can set who a task is assigned to") — not
  implemented. Needs a role check added to `TaskDetailSheet.tsx`'s
  assignee `<select>` (disable/hide unless the current user's
  `workspace_members.role` is `owner`/`admin`).

---

## 2026-08-09 — Fixed: login hangs forever with no error

**Reported:** "login so lame" — the Masuk button spins forever after
clicking submit, no error, no redirect.

**Root cause, found by actually driving the login form** (installed
`playwright-core` in the scratchpad temporarily, pointed it at the system
Chrome — no browser download, nothing added to the repo's own
dependencies — filled the form, clicked submit, measured): there is no
`.env.local` in this checkout at all (only `.env.local.example`), so
`lib/supabase/server.ts`'s `createClient()` takes its "missing
credentials" fallback path and returns a mock client. That mock had a real
bug, independent of the missing env file: its `Proxy`'s `get` trap
returned a function for **every** property access, including `.then`.
That makes the mock object look like a thenable to JS's own promise
machinery — and since `createClient()` is an `async function`, `return
<the mock>` triggers exactly that check. The engine calls
`mock.then(resolve, reject)`, which (via the trap) returns
`() => Promise.resolve(...)` — a function that ignores the `resolve`/
`reject` it was handed and returns an unrelated, discarded promise.
`resolve`/`reject` are never called, so `await createClient()` — and
therefore the entire `signIn`/`signUp`/`signOut`/etc. server action calling
it — never settles. No error, no timeout, forever. Confirmed via a raw
network capture: `POST /login` genuinely never completed, not a slow
completion.

**Fix (`lib/supabase/server.ts`):** replaced the flat "any-property-
returns-a-function" Proxy with a proper mock:
- `mockAuth()` — a plain object (not a Proxy) with exactly the `.auth.*`
  methods this codebase actually calls (`getUser`, `signInWithPassword`,
  `signUp`, `signOut`, `resetPasswordForEmail`, `signInWithOAuth`,
  `exchangeCodeForSession` — enumerated by grepping every
  `supabase.auth.` call site first, not guessed). `getUser` resolves to
  `{ user: null }` (degrades to "not logged in," which is what call sites
  already handle); the mutating auth calls resolve with a clear
  `CONFIG_ERROR` message telling whoever's debugging exactly what env vars
  are missing, instead of silently pretending success and then failing
  confusingly two steps later.
- `mockTable()` — a chainable `.from(table).select().eq().single()`-style
  builder mock with a Proxy whose `get` trap returns the *same builder
  instance* for any unrecognized property (so arbitrary chaining works),
  but whose `then`/`catch`/`finally` are real, own-object methods (not
  trap-generated) that correctly call `resolve`/`onFulfilled` — so
  `await`ing it actually settles instead of repeating the exact same bug
  one level down.

**Still true after this fix — and this is the part that actually matters
for the user:** the mock now fails fast with a clear message instead of
hanging, but **login/signup will not actually work until real Supabase
credentials exist in `.env.local`.** The fix turns a silent infinite hang
into an honest error; it doesn't and can't make authentication function
without real credentials. Copy `.env.local.example` to `.env.local` and
fill in `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
(and the other vars listed in MEMORY.md section 4) to actually fix login.

**Verification:** `npx tsc --noEmit` clean. Re-ran the same driven-browser
test after the fix: submit-to-response went from "still pending after
20,000ms" to 867ms, with the toast showing the exact
`CONFIG_ERROR.message` instead of nothing.

**Follow-up — real credentials were in the wrong file:** the user said
"already set," but the real Supabase URL/keys had been typed into
`.env.local.example`, not `.env.local`. Next.js only auto-loads
`.env.local` (`.env.local.example` is a plain file with no special
meaning to it — the "example" is purely a human naming convention). Two
problems from that: (1) the app still couldn't see the credentials, and
(2) `.gitignore` has `.env*` ignored except `!.env.local.example`
specifically un-ignored — so real secrets were sitting in a file git
actively tracks and would commit. The user renamed the file to
`.env.local` mid-conversation (visible as ` D .env.local.example` in `git
status`, content identical, just moved). Restored
`.env.local.example` back to its original placeholder-only template
content so the tracked file doesn't carry real secrets and future
contributors still get a usable example. Confirmed `git diff --
.env.local.example` is clean against HEAD and `git check-ignore -v
.env.local` shows it's properly ignored.

Killed the stale dev server process (it started before `.env.local`
existed, so it never had the vars in `next dev`'s process env — Next only
reads dotenv files at boot) and started a fresh one. A second dev server
appears to have raced in independently (possibly the user's own IDE
restarting its task) and won port 3000 before this session's restart did;
that's fine — confirmed via the same driven-login test that whichever
process ended up on port 3000 has `.env.local` loaded: the toast changed
from `CONFIG_ERROR.message` to Supabase's actual `"Invalid login
credentials"` response, in ~924ms. Login is fully live now.

---

## 2026-08-10 — Custom Kanban columns + custom task fields (the deferred item)

**Asked:** "Where are the settings for custom fields and custom kanban?
For kanban, admin should be able to add or remove buckets [columns]." —
the follow-up to the item explicitly deferred in the 2026-08-09 app
redesign entry above, now built for real.

**Architecture decision:** `tasks.status` was a fixed Postgres ENUM. Two
ways to make it admin-editable: (a) a full FK migration to a
`status_id UUID` column referencing a statuses table, touching every
query; or (b) convert `tasks.status` to plain TEXT and add a
`task_statuses` metadata table keyed by the same string the column already
stores. Went with (b) — far less disruptive (every existing `t.status ===
'done'`-style comparison keeps working unchanged), and the metadata table
still gives admins full control (name, color, position, and an `is_done`
flag so "which column counts as complete" isn't a hardcoded string
anymore).

**New migration** (`supabase/migrations/20260810_kanban_columns_and_custom_fields.sql`
— **not yet run, must be applied in the Supabase SQL Editor before any of
this works**):
- `ALTER TABLE tasks ALTER COLUMN status TYPE TEXT` — safe, every existing
  enum value is already valid text; old enum type left in place rather
  than dropped.
- `task_statuses` (workspace_id, key, name, color, position, is_done) —
  RLS: members SELECT, admins ALL. Backfilled with the original 6 columns
  for every existing workspace; a new trigger seeds the same 6 for every
  future workspace automatically.
- `task_custom_fields` (workspace_id, name, field_type
  text/number/date/select, options, position) — RLS: members SELECT,
  admins ALL.
- `task_custom_field_values` (task_id, field_id, value JSONB) — RLS:
  same level as editing the task itself (any member), not admin-gated —
  values are task data, not schema.

**Where the settings actually are:** `/[workspace]/settings` — two new
cards, **Papan Kanban** and **Field Kustom Tugas**
(`components/settings/KanbanColumnsSettings.tsx` and
`CustomFieldsSettings.tsx`), visible only to the workspace owner or a
member with the `admin` role (checked client-side for UX; RLS is the
actual enforcement). Kanban columns: add (name + auto-picked color),
rename via the same row, reorder with up/down arrows (swaps `position`),
mark one as the "Selesai" column, delete — deletion is blocked with a
clear count ("Pindahkan N tugas dari kolom ini dulu") if any task still
has that status, rather than silently reassigning or orphaning tasks.
Custom fields: add with a type (text/number/date/select — select prompts
for comma-separated options), delete.

**Everywhere else that touched the old fixed status set, now dynamic:**
- `components/tasks/KanbanBoard.tsx` — takes a `columns` prop instead of
  the hardcoded `BOARD_COLUMNS` array; renders however many columns a
  workspace has, in a horizontally-scrolling row (was a 5-column CSS
  grid, which doesn't work for an arbitrary admin-chosen count).
- Tasks page, Project detail page's Kanban tab — same `columns` prop
  wired in, plus `doneKeys` (from the new `useTaskStatuses()` hook)
  replacing every hardcoded `status === 'done'` check, including the
  "mark complete" quick-action and drag-to-column `completed_at` logic.
- `TaskDetailSheet.tsx` — its status dropdown only ever had 3 of the 6
  original options (a pre-existing bug, not something I introduced); now
  lists whatever the workspace's actual columns are. Also gained the
  custom-fields form section (create form already had it from the Tasks
  page work).
- Dashboard — `isOpen`/`doneThisWeek`/momentum's `done`/`overdue` all
  switched from literal `'done'` string checks to `doneKeys.has(status)`,
  so renaming or replacing the done column doesn't silently break the
  stats.
- `types/index.ts` — `TaskStatus` changed from a 6-value union to `string`
  (reflecting reality: it's an arbitrary per-workspace key now), plus new
  `TaskStatusDef`/`TaskCustomFieldDef`/`TaskCustomFieldValue` interfaces.
- New shared hooks: `lib/hooks/useTaskStatuses.ts`,
  `lib/hooks/useCustomFields.ts` — used by all five files above so the
  fetch/shape logic exists in exactly one place.

**Verification:** `npx tsc --noEmit` and `npm run build` both clean.
**Not verified against a live database** — the migration hasn't been run
yet, so `task_statuses`/`task_custom_fields` don't exist there. The user
already caught this live ("why the status is unapear all?") when the
Kanban board rendered zero columns mid-session, precisely because the
frontend now expects a table the database doesn't have yet. Confirmed
this is expected, not a code bug — the query against a nonexistent table
returns empty, `columns` is `[]`, and a Kanban board with zero columns
correctly renders nothing.

**Not done:** drag-and-drop column reordering (used up/down buttons
instead — same outcome, far less complexity than wiring dnd-kit sortable
context onto the Settings list); renaming an existing column's `key`
(only `name`/`color`/`is_done` are editable post-creation — changing the
key would require rewriting every task row that references it, skipped
as unnecessary complexity); per-project (vs per-workspace) custom fields
or columns — both are workspace-wide only, matching what was asked.

## 2026-08-10 — Bilingual support (Indonesian/English), full site

User asked for an English option everywhere, no mixed-language pages, and
switching language must change the entire site — confirmed via
AskUserQuestion to be: a header toggle (no `/en` URL routing) persisted
client-side, covering the marketing site AND the full authenticated app
in one pass.

**Architecture** (`lib/i18n/`):
- `locale-context.tsx` — `LocaleProvider`/`useLocale()`. Client Context,
  `locale: 'id'|'en'` defaulting to `'id'`, persisted to
  `localStorage['ruangbaru-locale']`, also sets `document.documentElement.lang`.
  Wired once in `app/providers.tsx` (wraps everything under the root layout,
  so it covers marketing + auth + the authenticated app uniformly).
- `useT.ts` — `useT(namespace: string)` returns `t(key) => string`, looked
  up from `dict/index.ts`'s merged table. Missing key falls back to the key
  itself (visible, not blank) — deliberately loose typing (`Record<string,
  Record<string, string>>`) so per-namespace dict files can land
  independently without the aggregator blocking them.
- `dict/<namespace>.ts` — one file per feature area, each exporting
  `export const xDict = { id: {...flat camelCase key: string}, en: {...} }`.
  Sixteen namespaces: `common`, `marketingFeatures`, `marketingPages`,
  `auth`, `dashboard`, `projects`, `tasks`, `calendar`, `notes`, `team`,
  `settings`, `billing`, `meetings`, `appLayout`, `landing`, `tour`.
- `dict/index.ts` — the only file that imports every namespace and merges
  them into `dictionaries`. Kept as a thin append-only aggregator
  specifically so many namespaces could be authored in parallel without
  colliding on one shared file.
- `components/i18n/LanguageSwitcher.tsx` — the ID/EN pill toggle. Placed in:
  `MarketingHeader` (desktop + mobile menu), the authenticated app's
  `Header.tsx` and `Sidebar.tsx` (bottom, when expanded), the `(auth)`
  layout's top bar (`AuthLayoutChrome.tsx`), and standalone pages with no
  shared header (`app/welcome/page.tsx`, `app/invite/[token]/page.tsx`) —
  every reachable entry point has its own switcher, not just inherited
  `localStorage` state, so a user landing anywhere first (e.g. an invite
  email link) can still change language immediately.

**How it was built:** hand-built the infra + one reference conversion
(`MarketingHeader.tsx` + `dict/common.ts`), then fanned out 12 parallel
agents — one per cohesive file group (marketing pages, about/contact/legal,
auth+welcome+invite, dashboard+projects, tasks, calendar, notes+team,
settings+billing, meetings, shared app layout, landing/homepage, tour) —
each creating its own dict file and editing only its assigned source
files, so there was zero shared-file contention during the fan-out.
Merged all 16 dict files into `dict/index.ts` by hand afterward.

**Verification:** `npx tsc --noEmit` and `npm run build` both clean after
the merge. Live browser check (Playwright against the running dev server):
toggled EN on the homepage, confirmed hero/nav copy switched, navigated to
`/fitur` and `/login` with no re-toggle needed (locale persisted via
localStorage), toggled back to ID from the login page's own switcher —
all correct. Screenshotted `/login` in EN to confirm layout/spacing held up
(showcase panel, form, footer all translated, no overflow).

**Deliberately left untranslated (by design, not oversight):** any string
that is actual data rather than UI chrome — DB-sourced status/custom-field
names, assignee/project/member names, user-authored note/comment bodies,
demo/seed content, notification rows already persisted to the DB (translating
at insert time would bake in the creator's locale, not the viewer's).
date-fns locale swaps were added only for the calendar's month/weekday
names (`components/calendar/EventDialog.tsx`, `[workspace]/calendar/page.tsx`);
other `toLocaleDateString('id-ID', …)` calls elsewhere were left as-is —
harmless day-of-month formatting differences, not a translation gap.

**Not done:** the marketing site's `<html lang="id">` in the root
`app/layout.tsx` is still a static server-rendered default — `useLocale`
updates `document.documentElement.lang` client-side after hydration, so
there's a brief moment before JS runs where the attribute doesn't yet
reflect a returning English-preferring visitor. Acceptable tradeoff for a
client-only, no-`/en`-route architecture; would need a locale cookie read
in a server component to close entirely.

## 2026-08-10 — Auto-backlog tasks, @mentions, attachments, permission lockdown, ownership transfer, project collaborators, drag-and-drop fix

Six separate asks in one session, tackled in the order they arrived.

**1. New tasks default to the first column automatically.** Removed the
Status `<select>` from every task-creation entry point — it was already
being pre-filled to `defaultKey` (the workspace's position-0 column, i.e.
"Backlog" for the seeded default) via an effect, so the picker was pure
redundancy the user never needed to touch. Fixed in all three places tasks
get created, not just the obvious one:
- `app/(app)/[workspace]/tasks/page.tsx` — main create-task dialog.
- `components/calendar/EventDialog.tsx` — calendar's "create task" mini-form
  still had the OLD hardcoded 5-option status list from before the
  custom-Kanban migration (a stale spot that migration missed) — removed
  and switched to `useTaskStatuses(workspace?.id).defaultKey`.
- `app/welcome/page.tsx` — onboarding wizard's demo task was hardcoded to
  literal `status: 'todo'`; switched to the same `defaultKey` pattern.

**2. @mention tagging in task description + comments.** New mention
infrastructure lives in `components/editor/`:
- `MentionList.tsx` — the floating suggestion dropdown (forwardRef +
  `useImperativeHandle` for arrow/enter/tab, per Tiptap's documented pattern).
- `mentionExtension.ts` — `createMentionExtension(usersRef, noResultsText)`
  wraps `@tiptap/extension-mention` + `tippy.js` for positioning. Takes a
  **ref**, not a plain array, because `useEditor`'s `extensions` array is
  only read once at creation — a ref lets the candidate list update live
  (e.g. workspace members finishing an async load) without recreating the
  editor and losing cursor/focus.
- `RichTextEditor.tsx` gained an optional `mentionUsers?: MentionItem[]`
  prop — omit it entirely to disable mentions (Notes editor), pass even `[]`
  while loading to keep it enabled (task description/comments).
- Wired into `TaskDetailSheet.tsx` (description + comment composer) and the
  create-task dialog (upgraded from a plain `<textarea>` to `RichTextEditor`
  specifically so it could carry mentions too).
- New `lib/utils.ts` helper `extractMentionIds(doc)` walks a Tiptap JSON doc
  for `type: 'mention'` nodes. Comment-posting notifies every mentioned user;
  saving a task description diffs against the description's mention set as
  of last load/save (`prevDescriptionMentionIds` ref) so re-saving doesn't
  re-notify the same people every time.
- Installed `@tiptap/extension-mention@3.27.1` (pinned to match the rest of
  the `@tiptap/*` set — the latest tag wants `@tiptap/pm@3.29.2`, conflicting
  with everything else on `^3.27.1`) and `tippy.js@^6.3.7`.

**Found and fixed while wiring mention notifications:** `notifications` has
had RLS enabled since 001/002 with SELECT/UPDATE/DELETE policies scoped to
the recipient, but **no INSERT policy was ever added**. Every
"notify-the-other-person" flow in the app — task assignment (pre-existing,
not introduced this session) and now @mentions — was silently failing at
the RLS layer; the insert's error return was never surfaced by the calling
code, so the task/comment itself always succeeded while the notification
quietly never landed. Added `20260810_notifications_insert_rls.sql`: an
INSERT policy requiring `actor_id = auth.uid()` and both actor + recipient
to share the stated `workspace_id`.

**3. Task attachments.** The `task_attachments` table + storage RLS already
existed (from an earlier session) but had no UI at all. Built upload
(hidden file input, 10MB client-side cap, `<task_id>/<uuid>-<filename>`
storage path), list (name/size/uploader/relative-time), download (the
`attachments` bucket is **private** — `createSignedUrl(path, 60)`, not a
public URL), and delete (self-uploader only in this UI pass; RLS also
allows a workspace admin to delete via a separate path not yet exposed in
the UI) — all inside `TaskDetailSheet.tsx`, between the description editor
and custom fields.

**4. Permission lockdown — Team + Settings pages.** User reported "why can
a member delete other members / edit settings." RLS was actually already
correct everywhere checked (`workspace_members` UPDATE/DELETE →
`is_workspace_admin`; `workspaces` UPDATE → same) — the bug was purely
front-end: every control was rendered unconditionally regardless of the
viewer's role, so a non-admin saw an invite button, a role-change `<select>`,
and a remove-member trash icon for every teammate, all of which would fail
with a confusing RLS error on click rather than not existing at all.
- `team/page.tsx`: derived `isAdmin` from the already-fetched roster
  (`role === 'admin' || role === 'owner'`, matching `is_workspace_admin`'s
  own logic) — no extra query. Gated the invite dialog, role `<select>`
  (read-only role badge otherwise), remove-member button, and
  cancel-invitation button behind it. Also excluded the **owner's** row from
  being role-edited or removed by a mere admin — that's what ownership
  transfer (below) is for, not a role dropdown.
- `settings/page.tsx`: same `isAdmin` derivation (now also reused to build
  the ownership-transfer member picker). Workspace name/description/link
  fields are `disabled` and the Save button hidden for non-admins, with a
  one-line notice explaining why; admins keep full editing.

**5. Editable workspace slug + ownership transfer.** Two asks that turned
out to share the same card:
- The workspace "link" was previously a read-only copy-to-clipboard span.
  Admins now get an editable `slugify()`-on-keystroke input; saving with a
  changed slug does `router.replace(/${newSlug}/settings)` since the slug
  IS the `[workspace]` URL segment. A Postgres unique-violation (23505) on
  save is caught and shown as a friendly "that link is taken" toast instead
  of the raw constraint error.
- New "Transfer Ownership" card, owner-only, above Danger Zone (not
  destructive, so kept separate). Picks another existing member, confirms
  in a dialog, calls a new RPC.
- `20260810_workspace_ownership_transfer.sql`: (a) a `BEFORE UPDATE` trigger
  on `workspaces` that rejects any `owner_id` change unless
  `auth.uid() = OLD.owner_id` — closing a real gap where the existing
  `is_workspace_admin`-gated UPDATE policy would otherwise let *any* admin
  silently reassign ownership to themselves by calling `.update({owner_id})`
  directly, bypassing the UI entirely; (b) `transfer_workspace_ownership(ws_id,
  new_owner_id)` RPC doing all three writes (workspace `owner_id` + both
  members' `role`) as one atomic, pre-validated call instead of three
  separate client round trips.

**6. Project collaborators.** `project_members` (table + RLS) existed since
the very first schema migration but had zero UI — the project detail page
loaded and displayed the *entire workspace roster* where "members" should
have meant actual collaborators. Added: a `ProjectMember` type; an avatar
stack + "Collaborators" row on `projects/[projectId]/page.tsx` with a
dashed-circle add button and per-avatar remove-on-hover (both admin-gated,
matching the existing `project_members FOR ALL` RLS policy which is
`is_workspace_admin`-only); an "Add Collaborator" dialog listing workspace
members not yet on the project; and a `project_invite` notification on add
(that enum value existed in `notification_type` since 001 but was never
used until now).

**7. Kanban drag-and-drop cursor offset ("gap of ~5cm").** Root cause:
`components/layout/PageTransition.tsx` wrapped every routed page in a
`motion.div` animating `y` and `filter: blur()`. Framer Motion keeps
whichever transform/filter properties a variant ever touches as a
permanent inline style at rest (`transform: translateY(0px)` etc., not
removed once the animation settles) — and a transformed-or-filtered
ancestor creates a new CSS containing block for `position: fixed`
descendants. dnd-kit's `DragOverlay` is exactly such a descendant, so it was
positioned relative to that ancestor instead of the viewport, showing up as
a constant offset between the cursor and the dragged card. Fixed by
reducing the transition to opacity-only (no `y`, no `filter`) — a small
visual downgrade (fade instead of slide+blur) in exchange for correctness
that also protects any future `position: fixed` UI (tooltips, popovers)
under this wrapper from the same class of bug.

**Verification:** `npx tsc --noEmit` and `npm run build` both clean after
every change in this batch. The drag-and-drop fix and the permission
gating were verified by root-cause code reading + build success, not a
live authenticated click-through (no test credentials available in this
environment) — worth a manual pass in the browser before considering this
fully closed.

**Not run against the live database (same standing caveat as every
migration this session):** `20260810_notifications_insert_rls.sql` and
`20260810_workspace_ownership_transfer.sql`. Until both are applied,
mention/assignment notifications keep silently failing and ownership
transfer will error at the RPC call.

## 2026-08-10 — Task-level collaborators

Follow-up to the project-collaborators feature above — same idea, one
level down: any task can now have additional people looped in beyond its
single `assignee_id`, surfaced at the very top of `TaskDetailSheet.tsx`
(avatar stack + dashed "+" button), by design above the title/status/
priority fields since looping someone in is meant to be a one-click,
low-friction action rather than a buried setting.

- New table `task_collaborators` (`20260810_task_collaborators.sql`):
  `task_id`, `user_id`, `added_by`, unique on `(task_id, user_id)`. Unlike
  project collaborators (admin-only, since that's a structural project
  change), **any workspace member can add a task collaborator** — an
  everyday "loop someone in" action, not an administrative one. Removal is
  allowed for whoever added the row, the collaborator themself
  (self-remove), or a workspace admin.
- New `notification_type` enum value `'task_collaborator'` (`ALTER TYPE ...
  ADD VALUE IF NOT EXISTS`, in its own migration file with no same-file
  usage of the new value — Postgres won't let a new enum value be used in
  the same transaction that adds it).
- New `TaskCollaborator` type in `types/index.ts`.
- UI mirrors the project-collaborator dialog exactly (avatar list of
  addable workspace members + Add button; empty state when everyone's
  already added) — deliberately consistent with the project-level pattern
  rather than inventing a second interaction shape for the same concept.

**Verification:** `npx tsc --noEmit` and `npm run build` both clean.

**Not run against the live database:** `20260810_task_collaborators.sql`
— joining the standing list of unapplied migrations this session.

## 2026-08-10 — Admin-configurable default assignee

The create-task assignee dropdown always started blank ("Select Team
Member (optional)"). Added a `workspaces.default_assignee_id` column
(`20260810_workspace_default_assignee.sql`) settable by admins in
Settings' Workspace card (a plain `<select>` of workspace members, "No
default" option, saved alongside name/description/slug). Every
create-task entry point now pre-fills its assignee field from it instead
of starting empty — still a pre-fill, not a lock: whoever's creating the
task can change it before submitting.
- `tasks/page.tsx`: same one-shot-effect pattern already used for the
  status default (`useEffect` keyed on `currentWorkspace`, only fires when
  the field is still empty) sets the initial value; the post-create reset
  now returns to the workspace default rather than blank, so repeated task
  creation stays pre-filled.
- `EventDialog.tsx`'s calendar quick-add task form gets the same treatment
  in its existing "reset task defaults on open" effect.
- The onboarding wizard's demo task (`app/welcome/page.tsx`) was
  deliberately left alone — a workspace that's seconds old has no
  meaningful default-assignee setting to inherit yet.

**Verification:** `npx tsc --noEmit` and `npm run build` both clean.

**Not run against the live database:** `20260810_workspace_default_assignee.sql`.

## 2026-08-10 — Per-workspace API keys + public REST API + docs page

Two asks: a public API documentation page separate from the dashboard, and
a way for any workspace to generate an API key to connect external tools.
Building the docs page meaningfully required the API to actually exist
first, so this covers both.

**Key generation** (`lib/apiKeys.ts`, client-side, Web Crypto): 24 random
bytes → `rb_live_<hex>` → SHA-256 hash via `crypto.subtle.digest`. Only the
hash and a 16-char display prefix are ever sent to the server — the
plaintext key exists only in browser memory and the one-time reveal
dialog, the same convention as GitHub/Stripe personal access tokens.

**Schema** (`20260811_api_keys.sql`): `api_keys` table
(`workspace_id`, `name`, `key_hash` unique, `key_prefix`, `created_by`,
`last_used_at`, `revoked_at`). RLS restricts all four operations to
`is_workspace_admin` — a leaked key is workspace-wide access, so key
management sits at the same trust level as inviting an admin. Revoke is a
soft-delete (`revoked_at` timestamp, row stays visible with a "Revoked"
badge) rather than a hard delete, for audit visibility.

**Server-side verification** (`lib/api/auth.ts`): `resolveApiKey(request)`
reads `Authorization: Bearer <key>`, hashes it with Node's `crypto`
(same SHA-256 hex as the client), looks it up via `createAdminClient()`
(service-role, bypasses RLS — correct here since the API key itself *is*
the auth, there's no Supabase session to scope RLS off of), and rejects
revoked keys. Bumps `last_used_at` fire-and-forget so a slow stats write
never blocks the actual request.

**REST endpoints** under `app/api/v1/`: `GET /workspace`; `GET/POST
/projects`; `GET/POST /tasks` (`?project_id=`/`?status=` filters on GET);
`GET/PATCH/DELETE /tasks/:id`. Every query is scoped by the resolved
`workspace_id` — `POST /tasks` additionally confirms `project_id` belongs
to that same workspace before inserting, so a key can't plant a task in
another workspace's project by guessing its id. Each route exports
`OPTIONS` returning CORS headers (`Access-Control-Allow-Origin: *` — this
is a token-authenticated API, not cookie-authenticated, so a permissive
CORS policy doesn't leak session-scoped access the way it would on a
cookie-auth endpoint).

**Found and fixed while testing the CORS preflight — a real, previously
dormant bug:** `lib/supabase/middleware.ts`'s protected-route check used
`pathname.includes(route)` against a route list including `/tasks` and
`/projects`. `/api/v1/tasks` and `/api/v1/projects` both *contain* those
substrings, so an unauthenticated request to either was 307-redirected to
`/login` instead of reaching the route handler — confirmed live via
`curl -X OPTIONS`, which came back as a redirect with zero CORS headers
instead of the expected 204. This would have silently broken every
external API client, and browser-based ones specifically (no CORS headers
on a redirect = the preflight itself fails, so the real request never
even gets sent). `/api/v1/workspace` was unaffected only by coincidence —
"workspace" isn't a substring of any protected route. Fixed by returning
early for any `pathname.startsWith('/api/')` before that check — API
routes authenticate themselves (session cookie or API key) and should
never be redirected to a login page. This bug was latent before today
(any existing `/api/*` route whose path happened to contain "settings" or
"billing" etc. would have had the same problem) but only got exercised
once a route actually named `/tasks` or `/projects` existed under `/api/`.

**Settings UI**: new admin-only "API Keys" card — list (name, prefix,
last-used, revoked badge), "Generate New Key" → name prompt → one-time
reveal dialog with copy button and a "you won't see this again" warning,
revoke button per active key, and a link to `/api-docs`.

**Docs page** (`app/api-docs/`): a standalone public route, not nested
under the authenticated app or Settings — its own minimal header
(logo + language toggle + back link), sticky sidebar TOC on desktop /
horizontal chip nav on mobile, sections for Introduction, Authentication,
Errors, and each endpoint group with example curl/JSON. Bilingual via a
new `apiDocs` i18n namespace for prose; code samples are left as literal
text (not translated), consistent with this codebase's standing i18n rule
that code/data isn't language content.

**Verification:** `npx tsc --noEmit` and `npm run build` both clean.
Live-tested against the dev server: `/api-docs` renders (screenshotted),
`GET /api/v1/workspace` and `/tasks` and `/projects` all correctly return
a 401 JSON error without a key, `OPTIONS /api/v1/tasks` returns 204 with
CORS headers after the middleware fix (307 redirect before it).

**Not run against the live database:** `20260811_api_keys.sql`.

**Not done:** no rate limiting on `/api/v1/*` (matches the pre-existing,
already-documented gap on other public endpoints — noted honestly in the
docs page itself rather than pretending it exists); no pagination on list
endpoints (fine at current scale, would need addressing before a workspace
with thousands of tasks calls `GET /tasks`); PATCH/DELETE only exist for
tasks, not projects (projects only have GET/POST) — narrower surface than
tasks by choice, not oversight, since the ask was "connect to other
things" and task CRUD is the more common integration target.

## 2026-08-10 — Loading-state audit: 13 async actions with zero click feedback

User reported "no loading motion when I click [something] with loading" —
too vague to act on directly, so ran an Explore agent across every
`app/(app)/[workspace]/**` page and shared layout component looking for
`async` handlers wired to a button/menu-item/icon-button with **no**
loading indicator at all (not "has a spinner but it looks off" — genuinely
nothing: no `disabled`, no icon swap, no visual change until the toast
lands). Found and fixed 13 across 8 files, each following whichever
loading pattern the file already used elsewhere (single boolean for a
form-level action, per-row `xxxId` state compared against the row's id for
list actions):

- **`team/page.tsx`**: `handleChangeRole`, `handleRemoveMember`,
  `handleCancelInvite` — three new per-row states
  (`roleChangingId`/`removingId`/`cancelingId`); the role `<select>` gets a
  small spinner next to it since a `<select>` can't show a spinner inside
  itself.
- **`projects/page.tsx`**: `handleArchiveProject`/`handleDeleteProject` —
  new `busyProjectId`; the card's `⋮` dropdown trigger itself swaps to a
  spinner and disables (showing a spinner *inside* a menu item is
  pointless since the menu closes on click).
- **`projects/[projectId]/page.tsx`**: `handleRemoveCollaborator` — new
  `removingCollabId`; the avatar itself swaps to a spinner placeholder
  since the remove button is a hover-only overlay that disappears on click.
- **`notes/page.tsx`**: `handleCreateNote`/`handleDeleteNote` — new
  `creating`/`deletingNoteId` (there was an unrelated `saving` already, for
  the separate save-note action — left alone, not reused for a different
  action).
- **`calendar/page.tsx`**: `disconnectGoogle` — new `disconnecting`
  (`syncing` existed but is dedicated to the sync button).
- **`meetings/page.tsx`**: the header's "Start Instant" button was already
  correctly wired to `starting`; the *empty-state's* "Start Now" button
  called the same `startInstant` handler but the `EmptyState` sub-component
  never received `starting` as a prop — threaded it through instead of
  adding a redundant second state variable.
- **`meetings/[meetingId]/page.tsx`**: `handleEnd` — new `ending`, threaded
  through `RoomShell` (a local sub-component) as a prop since the End
  button lives there.
- **`TaskDetailSheet.tsx`**: `handleRemoveCollaborator`,
  `handleDeleteAttachment`, `handleDownloadAttachment` — three new states
  (`removingCollabId`/`deletingAttachmentId`/`downloadingAttachmentId`);
  `addingCollabId`/`uploading` already existed but are add-only, not shared
  with remove/delete/download.
- **`Header.tsx`**: `handleMarkAllRead` — new `markingAllRead` (`notifLoading`
  existed but is for the initial fetch, not this action).

Deliberately did NOT touch: any handler that already had a working
disabled+spinner pair (the large majority — settings, tasks page, EventDialog,
KanbanColumnsSettings, CustomFieldsSettings, dashboard's `completeTask`,
TaskDetailSheet's save/comment/upload/add-collaborator, meetings
schedule/create flows, Sidebar/BottomNav logout). Also did not add a global
`loading` prop to the shared `Button` component — every gap found had a
different enough shape (per-row vs. form-level, icon-swap vs. disabled-only)
that a one-size prop would have forced an awkward fit on at least half of
them; matching each file's existing convention kept the diff smaller and
the pattern consistent with code already there.

**Verification:** `npx tsc --noEmit` and `npm run build` both clean.

## 2026-11-17: Dashboard + Kanban redesign, section loading, click feedback

Ask: make the dashboard look new, make the Kanban board much tidier and better
designed, and add section loading and motion, since nothing showed a spinner on
click.

**Direction** (antislop, during): ENERGY 3 / RHYTHM 2 / MOTION 2, using the
existing brand (Poppins, #106CD8 blue, teal, yellow only as a highlight).

- **Identity motif: FlowBar** (`components/tasks/FlowBar.tsx`). The workspace's
  Kanban columns as one segmented bar in each column's own colour. Used in the
  dashboard hero tray (legend links to `/tasks?col=key`), above the board
  (legend scrolls to the column) and thin on each project row.
- **Dashboard** (`app/(app)/[workspace]/dashboard/page.tsx` + `components/dashboard/`).
  Hero = the one full-strength blue surface (`--hero`/`--hero-foreground`
  tokens; dark uses #0E3C78 so white text stays readable). Stats use `CountUp`
  (respects reduced motion). The yellow pill appears only when the user has
  overdue tasks. The "nested rooms" SVG motif sits behind the hero; stat tiles
  are solid so it never shows through numbers. Sections: Fokus Saya (tick →
  spring check → strike → row folds away), Linimasa, Proyek (FlowBar per
  project), Rapat (only when there are any), Aktivitas (live rows slide in),
  Tim. The old fabricated-demo dict keys were removed.
- **Section loading**: `useSectionData(enabled, load, deps, initial)`. Loading
  is derived from a settled key, so effects only set state from async
  callbacks (React Compiler lint clean; uses React 19.2 `useEffectEvent`).
  `SectionCard` swaps skeleton / error+retry / content with a crossfade and
  spins the header icon while loading.
- **Kanban** (`components/tasks/KanbanBoard.tsx`): `onMove` may return a promise
  (the card shows a spinner until it resolves); `onAdd(status)` puts a "+" in
  every column; `focusColumn` scrolls a column into view. dnd-kit's
  `role/tabIndex` are stripped from the sortable wrapper (it made a second,
  dead tab stop per card). The board reverts on drag cancel, and the tasks page
  reverts the card when the save fails.
- **Click feedback**: `Spinner`, `Button loading`, `NavFeedback`
  (`useLinkStatus` icon swap in Sidebar/BottomNav/dashboard links +
  `RouteProgress` 3px top bar started on same-origin link clicks), and
  `[workspace]/loading.tsx` so dynamic routes paint immediately.
- **Deep links**: `?new=1` (tasks/projects), `?mine=1`, `?col=`. They are read
  into initial state via `useSearchParams`. Do NOT strip them with
  `history.replaceState`: search params are part of the page segment key, so
  the page remounts and the dialog closes again (found while verifying).
- **Fixes found on the way**: global `* { border-color }` moved into
  `@layer base` (it overrode every border-colour utility); `.gradient-brand`
  was blue→purple, now a blue-only ramp; `formatRelativeTime(date, locale)`
  gives Indonesian relative times; em dashes/emoji removed from dashboard copy.

**Verification:** `tsc` clean, `next build` clean, no new lint problems (the
remaining ones predate this change). Click-through with Playwright against the
live workspace, all writes blocked or answered by the browser: section skeletons
+ spinners, forced 500 → section error → "Coba lagi" recovers, collapse, row →
detail sheet, sidebar click → progress bar + icon spinner, hero "Tugas baru" /
"Proyek baru" open their forms, legend scroll, arrows, "Tugas saya" filter,
column "+" presets the column, list no-match state, keyboard Enter on a card,
tick → row folds (mocked PATCH), drag → saving spinner → clears (mocked PATCH).
Light/dark × desktop/mobile screenshots with no horizontal overflow.
