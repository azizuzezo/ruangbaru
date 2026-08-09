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
