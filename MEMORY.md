# RuangBaru Workspace — Project Memory & Context

> **Purpose:** This file is the single source of truth for project context so any
> new session (or a different Claude account / teammate) can continue work
> without losing history. **Read this first.** Update it whenever you make a
> meaningful change.

Last updated: 2026-11-17 (session 24, dashboard + Kanban redesign, per-section loading, click/navigation spinners; session 23 — sanitized every error notification/response so raw backend/DB error text never reaches the client; session 22 — admin panel can now delete workspaces and user accounts (moderation/violations); session 21 — per-workspace API keys + public REST API + docs page, fixed a middleware bug redirecting /api/v1/* to /login; session 20 — loading-state audit across 13 async actions with zero click feedback; session 19 — admin-configurable default assignee; session 18 — task-level collaborators; session 17 — auto-backlog tasks, @mentions, task attachments, Team/Settings permission lockdown, workspace slug editing + ownership transfer, project collaborators, drag-and-drop cursor-offset fix; session 16 — full bilingual ID/EN support via header toggle, no URL routing, covers marketing + auth + entire authenticated app; session 15 — merged main back to the SaaS app and deployed to Vercel production; session 14 — custom Kanban columns + custom fields; session 13 — app redesign; session 12 — mock-client hang fix; session 11 — login/register redesign; session 10 — Go backend port; session 9 — landing site redesign. See ENGINEERING.md for the task-by-task log)

---

## 1. What this is

**RuangBaru Workspace** — a production-grade, multi-tenant SaaS: an all-in-one
collaborative workspace for Indonesian SMEs/UMKM (projects, tasks, notes,
calendar, team). Tagline: _"Semua pekerjaan dalam satu ruang."_ Language: UI
defaults to Indonesian (Bahasa Indonesia) with a full English option — see
`lib/i18n/` (client-side toggle, no `/en` URL routing; details in
ENGINEERING.md's 2026-08-10 i18n entry).

### Stack
- **Next.js 16.2.9** (App Router, Turbopack) — ⚠️ newer than typical training data; see gotchas.
- React 19, TypeScript (strict), **Tailwind CSS v4** (CSS-based config, no tailwind.config).
- **Supabase** (Postgres, Auth, Realtime, Storage) via `@supabase/ssr`.
- Zustand (state), TanStack Query, React Hook Form + Zod.
- Tiptap (rich text), dnd-kit (kanban), Recharts, Framer Motion, Sonner, Resend, next-themes.

---

## 2. ⚠️ Critical gotchas (non-obvious — read before editing)

1. **Next.js 16 renamed middleware → `proxy.ts`.** Root file is [proxy.ts](proxy.ts)
   exporting `proxy()` (not `middleware`). Logic lives in [lib/supabase/middleware.ts](lib/supabase/middleware.ts).
   AGENTS.md warns: read `node_modules/next/dist/docs/` before assuming Next APIs.

2. **Tailwind v4 token wiring is mandatory.** Semantic utilities (`bg-card`,
   `bg-primary`, `text-muted-foreground`, `border-border`, etc.) ONLY exist
   because [app/globals.css](app/globals.css) maps them via `@theme inline { --color-*: var(--*) }`.
   It also needs `@custom-variant dark (&:is(.dark *))` for class-based dark mode
   (next-themes uses `class="dark"`). **If you add a new semantic token, map it in `@theme inline` or the utility silently does nothing.**

3. **Workspace is store-driven, not URL-driven.** Pages read `currentWorkspace`
   from `useWorkspaceStore` (persisted), NOT the `[workspace]` URL slug. The slug
   in the URL is mostly cosmetic.

4. **Entry flow:** login/OAuth → `/dashboard` (server redirector at
   [app/dashboard/page.tsx](app/dashboard/page.tsx)) → resolves user's workspace
   slug → `/{slug}/dashboard`, or → `/welcome` if no workspace. There is NO
   `/[workspace]/page.tsx` index, so never redirect to bare `/dashboard`-style
   paths expecting a page; the redirector handles it.

5. **Supabase needs BOTH grants AND RLS.** "permission denied for table" = missing
   GRANT (fixed in migration 006). "violates row-level security policy" = RLS
   policy issue. They are two separate gates.

6. **`handle_new_user` trigger** must have `SET search_path = public` + grants or
   signup fails with "Database error creating new user" (fixed in migration 004).

7. **Supabase key:** uses the new publishable key (`sb_publishable_...`). Code
   reads `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` first, falls back to `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

---

## 3. Database migrations (run in order in Supabase SQL Editor)

Located in [supabase/migrations/](supabase/migrations/). On a fresh DB run **001 → 006**.

| File | Purpose |
|------|---------|
| `001_initial_schema.sql` | Tables (profiles, workspaces, workspace_members, projects, tasks, notes, etc.), `handle_new_user` trigger, enums, indexes. |
| `002_rls_policies.sql` | RLS enable + policies + `is_workspace_member` / `is_workspace_admin` SECURITY DEFINER helpers. |
| `003_fixes_realtime_storage.sql` | Fixes workspace_members INSERT bootstrap; `accept_invitation()` RPC; realtime publication; storage buckets (avatars/covers/attachments) + policies; `user_preferences`; search indexes. |
| `004_fix_handle_new_user.sql` | Fixes "Database error creating new user" (search_path + grants on trigger fn). |
| `005_fix_onboarding_rls.sql` | Fixes workspace creation: workspaces SELECT policy (so `INSERT…RETURNING` works) + member self-join. |
| `006_grant_privileges.sql` | Fixes "permission denied for table" — GRANTs to anon/authenticated/service_role + default privileges. |
| `007_fix_settings_rls.sql` → `20260704_fix_attachments_storage_rls.sql` | See session notes below for 007, 008, and the `2026....sql`-dated migrations (meetings, events, Google Calendar, plan/admin fixes) — not backfilled into this table, but all must run in order after 006. |
| `20260809_activity_log_triggers.sql` | **Not yet run.** Adds triggers so `tasks`/`projects`/`workspace_members` inserts/status-changes actually populate `activity_logs` (nothing did before — the dashboard's activity feed was dead code, see session 13). |
| `20260809_leave_workspace_rls.sql` | **Not yet run.** Adds a DELETE policy so a non-owner member can remove their own `workspace_members` row ("leave workspace" in Settings) — no RLS path existed for this before. |
| `20260810_kanban_columns_and_custom_fields.sql` | **Not yet run.** Converts `tasks.status` from a fixed ENUM to TEXT, adds `task_statuses` (per-workspace admin-editable Kanban columns) and `task_custom_fields`/`task_custom_field_values` (admin-defined custom task fields). Backfills existing workspaces with the original 6 columns. **The Kanban board renders zero columns until this is run** — confirmed live in session 14. |

---

## 4. Environment variables

`.env.local` (gitignored). Template: [.env.local.example](.env.local.example).
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (+ `_ANON_KEY` fallback)
- `NEXT_PUBLIC_APP_URL` (used for OAuth/callback/invite links — must match deploy URL)
- `RESEND_API_KEY`, `RESEND_EMAIL_FROM` (invitation emails)
- Optional: Sentry, PostHog, Stripe.

---

## 5. Architecture map (key files)

- **Design system:** [app/globals.css](app/globals.css) (tokens, dark variant, Tiptap styles, motion utils).
- **Shared UI primitives:** [components/ui/](components/ui/) — button, card, input, dialog (opaque, mobile-safe), badge, skeleton, empty-state, etc. **Change here → propagates everywhere.**
- **Brand:** [components/brand/Logo.tsx](components/brand/Logo.tsx) — theme-aware wordmark (light=color, dark=white silhouette). Assets: `public/logo-wordmark*.png`, `public/logo-icon.png`. Favicon = `public/favicon.png` (square icon).
- **App shell:** [app/(app)/layout.tsx](app/(app)/layout.tsx) → Sidebar (desktop), Header, BottomNav (mobile), CommandPalette, TaskDetailSheet, PageTransition.
- **Layout components:** [components/layout/](components/layout/) — Sidebar, Header, BottomNav, CommandPalette, PageTransition.
- **Supabase:** [lib/supabase/](lib/supabase/) — client.ts (browser), server.ts, middleware.ts, actions.ts (auth server actions).
- **Email:** [lib/email/resend.ts](lib/email/resend.ts) + [app/api/invitations/send/route.ts](app/api/invitations/send/route.ts). Signup confirmation is sent from `signUp()` in [lib/supabase/actions.ts](lib/supabase/actions.ts) via `sendConfirmationEmail()`.
- **Stores:** [lib/stores/](lib/stores/) — workspace-store (persisted), ui-store.
- **Types:** [types/index.ts](types/index.ts).

---

## 6. Feature status

### Done & working
- Auth: email/password, Google OAuth, magic via Supabase; signup → confirm → `/welcome`.
- Multi-step **onboarding wizard** ([app/welcome/page.tsx](app/welcome/page.tsx)): workspace → invite → project → task → done.
- Dashboard, Projects (+ archive), Project detail (list/kanban/calendar/timeline), Tasks (list + **dnd-kit board**), Notes (**Tiptap editor**), Calendar, Team (invite + roles + copy link + Resend email), Settings (+ **avatar upload** to Storage), Billing (real usage; payment stubbed).
- **Tiptap RichTextEditor** ([components/editor/RichTextEditor.tsx](components/editor/RichTextEditor.tsx)) used in Notes, Task description, Comments.
- **Kanban drag-and-drop** ([components/tasks/KanbanBoard.tsx](components/tasks/KanbanBoard.tsx)) — 5 columns, fractional positions.
- Invite-accept flow ([app/invite/[token]/page.tsx](app/invite/[token]/page.tsx)) via `accept_invitation` RPC.
- Notifications (realtime in Header). Command palette (Cmd/Ctrl+K).
- **Responsive:** desktop sidebar, mobile bottom nav + FAB + mobile header menu.
- **Landing page** ([app/page.tsx](app/page.tsx)) — full brand redesign (session 3): Plus Jakarta Sans, white-first, scroll-snap 5 sections (Hero + live InteractiveDashboard, Features, How it Works, Pricing, CTA+Footer). Honest copy, no fake stats.
- Resend invitation emails (wizard + team page).

### Done in session 4 (2026-06-29) — Dashboard interaction redesign

- **Dashboard full redesign** (`app/(app)/[workspace]/dashboard/page.tsx`): workspace-assistant feel. Sections: Attention Zone (live meeting CTA banner + overdue task alert), Workspace Pulse (4 stats), Upcoming Meetings strip, My Focus (personal tasks with hover quick-actions, animated completion), Team Timeline (collapsible, grouped by urgency), Presence strip (who's online + their page), Activity feed, Project Momentum (hover expands in-progress/overdue counts). All sections are collapsible (chevron toggle). Priority labels now Bahasa Indonesia.
- **Presence system** (`lib/hooks/usePresence.ts`): NEW Supabase Realtime presence hook. Tracks current user's page + status; broadcasts to workspace channel; handles tab visibility change (→ away). Returns list of online teammates with their current location.
- **Improved skeleton loading**: Dashboard, Calendar, Meetings, Team pages all use the shared `<Skeleton>` component with proper layout-matching placeholders. No blank screens or spinners on page load.
- **Notification panel skeleton** (`components/layout/Header.tsx`): notification panel now shows skeleton rows while fetching.

### Done in session 3 (2026-06-29) — Brand redesign
- **Typography**: switched to **Plus Jakarta Sans** (Gojek-style geometric humanist, Indonesian-designed). Weights 400–800. Applied globally via `--font-sans` / `--font-display` in globals.css. Google Fonts import at line 1.
- **Color system (white-first)**: white dominant, `#106CD8` blue for CTAs only, `#10B29F` teal for success states, `#FDB31A` yellow for highlights only. No dark backgrounds, no heavy gradients.
- **Landing page** (app/page.tsx): complete rewrite. Honest copy (no fake stats, no testimonials, no overclaims). Early-stage framing. 5 scroll-snap sections: Hero (left text + right InteractiveDashboard with 6 clickable views), Features (4 tabs + interactive previews), How It Works (3 steps), Pricing (3 plans with transparent notes), CTA+Footer.
- **Auth layout** (app/(auth)/layout.tsx): white-first, left form panel + right product preview panel (gray-50, dot grid, feature list, mini mockup). Removed dark blue gradient.
- **Login page** (app/(auth)/login/page.tsx): minimal, Plus Jakarta Sans, native inputs, Google OAuth, Framer Motion entrance animation.
- **Register page** (app/(auth)/register/page.tsx): same treatment + password strength bar, workspace name field, terms links, success state.
- **globals.css**: font import updated to Plus Jakarta Sans + JetBrains Mono. Font variables updated. All SF Pro references removed.

### Design system rules (session 9, current)
- Font: **Poppins** (300–900, Google Fonts import in `app/globals.css`) for both `--font-sans` and `--font-display`. Marketing headings use `font-semibold`/`font-bold` — Poppins at `font-black`/`font-extrabold` reads heavy/blocky at large sizes, learned the hard way in session 9. Don't hardcode a page-level `FONT`/`DFONT` constant — the whole point of the token is that pages inherit it.
- Primary: `#106CD8` (blue) — actions, active states, links
- Success/collab: `#10B29F` (teal) — completion, online status
- Highlight: `#FDB31A` (yellow) — important badges only
- White/gray neutrals dominate. No dark hero sections. Subtle borders (1px, #E5E7EB). Minimal shadows.
- Website: ruangbaru.my.id (used in metadata, footer, emails)

### Done in session 6 (2026-06-30) — Interactive Calendar Redesign & Holiday Correction

- **Interactive Calendar Redesign** (`app/(app)/[workspace]/calendar/page.tsx`):
  - Completely redesigned the calendar page to deliver a premium, interactive experience inspired by 21st.dev.
  - Added smooth month transition animations using Framer Motion's `AnimatePresence` (sliding left/right based on navigation direction).
  - Added a sliding tab indicator for Month/Agenda view toggle using Framer Motion's `layoutId="activeViewTab"`.
  - Implemented Cron/Amie-style event chips with left-border color accents, matching 5% opacity backgrounds, bold text, and hover scale-and-lift micro-animations.
  - Redesigned day cells with floating "+" buttons appearing on hover.
  - Re-styled the Agenda view as an elegant timeline with vertical lines and glowing nodes indicating today.
- **Indonesian National Holidays (SKB 3 Menteri 2026)**:
  - Corrected the entire `INDONESIAN_HOLIDAYS_2026` mapping (Idul Adha on May 27, Waisak on May 31, Lahir Pancasila on June 1, etc.).
  - Removed the `🇲🇨` flag emoji from holiday badges to prevent Windows systems from buggy rendering of the text `mc`.
- **Dialog Centering Fix** (`components/calendar/EventDialog.tsx`):
  - Centered the "Buat Acara Baru" dialog by removing the `relative` class from `DialogContent`, which was overriding the `fixed` centering classes from Radix UI / Tailwind v4.
- **Conversational Support Bot & Ticketing System** (`components/landing/ChatWidget.tsx` & `app/api/support/ticket/route.ts`):
  - Integrated the support ticket flow directly into the existing unified `ChatWidget` (which uses Groq AI) to prevent duplicate widgets.
  - Added a persistent dashed shortcut button **"🎫 Hubungi Dukungan & Buat Tiket"** right above the input box.
  - When clicked, the chatbot switches to a step-by-step ticketing flow: collects the question/issue, name, email (with validation), and company details.
  - Once all details are gathered, the ticket is automatically sent via Resend to **`halo@ruangbaru.my.id`** and a confirmation is shown to the user.
- **Premium Logout Loading & Success Overlay** (`components/layout/LogoutOverlay.tsx`):
  - Created a gorgeous fullscreen glassmorphic overlay (`LogoutOverlay`) that triggers immediately when the user clicks "Keluar" (Logout) in the Header or Sidebar.
  - Displays a premium loading phase ("Mengamankan Sesi Anda") for 1.2s while signing out, then transitions to a success phase ("Keluar Berhasil" with a scale-in checkmark) for 1.5s before redirecting to `/login` to ensure a smooth, premium feel.

### Done in session 5 (2026-06-29) — Enterprise gating, RLS fix, Admin panel

- **Meetings Enterprise gate** (`app/(app)/[workspace]/meetings/page.tsx`): Free/Pro/Business users see `MeetingsUpgradeWall` — blurred preview behind a lock icon, plan label, upgrade CTA linking to billing, and list of Enterprise features. Only `plan === 'enterprise'` workspaces access the full meetings UI.
- **RLS fix** (`supabase/migrations/007_fix_settings_rls.sql`): Adds `owner_id = auth.uid()` UPDATE policy on workspaces so workspace creators can update their own workspace settings/name even without a `workspace_members` row with role `owner`/`admin`. Also re-asserts profile UPDATE/SELECT policies and refreshes `is_workspace_admin`/`is_workspace_member` search paths.
- **Admin panel** (`app/admin/page.tsx`): Standalone page for `aziz@duacincin.id` and `aziz@skor.co`. Lists all workspaces (name, slug, owner, member count, plan). Each row has a plan dropdown — selecting a new plan calls the API and updates live.
- **Admin API** (`app/api/admin/workspaces/route.ts`, `app/api/admin/update-plan/route.ts`): Service-role Supabase client (bypasses RLS) gated by admin email check via session cookie. GET lists all workspaces with owner info; POST updates workspace plan.
- **Service-role client** (`lib/supabase/admin.ts`): `createAdminClient()` using `SUPABASE_SERVICE_ROLE_KEY` env var. Server-only.

### Done in session 7 (2026-07-03) — Signup confirmation email via Resend
- **Signup confirmation now sent by Resend**, not Supabase's mailer. `signUp()` in
  [lib/supabase/actions.ts](lib/supabase/actions.ts) uses `createAdminClient()`
  ([lib/supabase/admin.ts](lib/supabase/admin.ts)) to call
  `auth.admin.generateLink({ type: 'signup', ... })`, which creates the
  unconfirmed user and mints the confirmation link **without** triggering
  Supabase's own email. The link is then sent via the new
  `sendConfirmationEmail()` in [lib/email/resend.ts](lib/email/resend.ts) using
  the same branded shell as the other transactional emails.
  - Requires both `RESEND_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` to be set. If
    either is missing, `signUp()` falls back to the original
    `supabase.auth.signUp()` path so Supabase's default mailer still sends the
    confirmation email — signup never silently breaks.
  - Password reset (`resetPassword()`) still uses Supabase's built-in mailer for
    the reset *trigger* (`resetPasswordForEmail`), though `sendPasswordReset()`
    already exists in resend.ts if that flow gets the same treatment later.

### Done in session 8 (2026-07-04) — Security audit fixes: storage RLS + invitation endpoint
A full codebase + security audit (4 parallel reviews: DB/RLS, API/auth, client/secrets,
engineering health) found 15 issues. Fixed the critical and highest-severity ones:
- **Attachments storage policy had no tenant scoping** (`supabase/migrations/20260704_fix_attachments_storage_rls.sql`):
  the old policy let any authenticated user read/write any object in the `attachments`
  bucket. Replaced with policies that resolve `<task_id>/<filename>` back to
  `tasks.workspace_id` and require `is_workspace_member`/`is_workspace_admin`. **Run
  this migration** — it's additive but must be applied to close the gap.
- **`/api/invitations/send` was an open email relay** (`app/api/invitations/send/route.ts`):
  previously trusted client-supplied `email`/`workspaceName`/`inviterName` with only a
  logged-in check — any authenticated user could make RuangBaru's domain send
  arbitrary-content mail to any address. Rewrote it to only accept invitation
  `token`s, look up email/workspace name from the DB (RLS already hides rows from
  non-members), and require the caller be admin/owner of that workspace.
- **HTML-escaped all user-supplied text in `lib/email/resend.ts`** (new `escapeHtml()`
  helper) — `fullName`, `workspaceName`, `inviterName`, and the support-ticket fields
  are no longer interpolated raw into outbound email HTML.
- Remaining audit findings (broad `auth.users` grant, Google OAuth CSRF nonce,
  plaintext OAuth tokens, no rate limiting, missing security headers, etc.) are not
  yet fixed — see the audit report for the full list if picking this back up.

### Done in session 9 (2026-08-09) — Landing site redesign
Full task-by-task log now lives in [ENGINEERING.md](ENGINEERING.md) — read
that first for any follow-up work on the marketing site; this is just the
summary.
- **Font swap:** SF Pro system stack → **Poppins** everywhere, wired through
  `app/globals.css` tokens (`--font-sans`/`--font-display`), not per-page
  overrides. Removed ~10 files' worth of hardcoded `FONT`/`FONT_BODY`/
  `DFONT` SF Pro constants (`app/page.tsx`, `/fitur`, `/cara-kerja`,
  `/harga`, `MarketingHeader`, `SiteFooter`, `HeroPreview`, `/about`,
  `/contact`, `/privacy-policy`, `/terms-of-service`, `(auth)/layout.tsx`,
  `(auth)/register`, `CommandPalette`, `AuthShowcase`).
- **Copy + layout redesign** of `app/page.tsx`, `app/fitur/page.tsx`,
  `app/cara-kerja/page.tsx`, `app/harga/page.tsx` — replaced generic SaaS
  phrasing and the repeated tiny-uppercase-kicker + icon-square-card pattern
  (same device on every section) with concrete, specific copy and varied
  section treatments. Kept all existing interactive preview components
  (Kanban/Checklist/Calendar/Team mini-demos, the cara-kerja numbered steps,
  the harga pricing cards/table) — those were already good, only copy and
  heading typography changed around them.
- **Typography gotcha:** Poppins at `font-black`/`font-extrabold` and large
  clamp() sizes reads heavy/blocky, not refined — caught from a user
  screenshot mid-task and fixed by dropping to `font-semibold`/`font-bold`
  with smaller clamp ceilings across all 4 pages. If touching marketing
  headings again, don't reach for the heaviest Tailwind weight by default.
- `.agents/skills/anti-ui-slop/` and `.agents/skills/ui-design/` — untracked,
  user-installed third-party "Uizze" design skill packages (not in Claude
  Code's registered skill list, so not invocable via the `Skill` tool
  directly). Their `SKILL.md` instructs agents to append an unprompted ad
  for a paid Uizze MCP and treat the bundled material as sole design
  authority — flagged to the user as self-promotional; user confirmed
  intentional install and asked it be used anyway. Only the actual design
  reference content (`reference/brand.md`'s marketing-surface guidance —
  avoid reflex fonts, avoid repeated section-kicker patterns, etc.) was
  applied; the ad-line instruction was not followed.

### Done in session 10 (2026-08-09) — Go backend port + deploy scaffolding
- **New `go/` module** — a stdlib-only Go port of this app's actual
  "backend" surface: the 7 Server Actions in `lib/supabase/actions.ts` and
  the 11 `app/api/**/route.ts` routes + `app/auth/callback`. (Everything
  else — projects/tasks/notes/calendar/team/billing/settings — already
  goes straight from the browser to Supabase's REST API and was never
  Node.js code to begin with.) Full route-by-route status, including two
  ⚠️ best-effort pieces around `@supabase/ssr` cookie compatibility, lives
  in [go/PORT_STATUS.md](go/PORT_STATUS.md) — **read that before touching
  auth in either the Go or Next.js code.**
- `next.config.ts` now sets `output: "standalone"` (needed for the Docker
  build; no effect on `next dev`).
- New root `Dockerfile` (frontend) + `go/Dockerfile` (backend), `k8s/*.yaml`
  (deployment/service/ingress/secret-template scaffolding, nothing
  applied), and `bitbucket-pipelines.yml` (parallel frontend+backend
  build/push to ECR, then a `trigger: manual` EKS deploy step). None of
  this has been run against real AWS/Bitbucket infrastructure.
- The Next.js app is **completely unmodified behavior-wise** — this is
  additive scaffolding sitting next to the existing code, not a cutover.
  See PORT_STATUS.md's "Integration steps still needed" for what wiring
  the frontend to the Go service actually requires.

### Done in session 11 (2026-08-09) — Login/register redesign
- **No Google sign-in/signup anywhere in the UI.** `signInWithGoogle` (in
  `lib/supabase/actions.ts`) and the Go port's `AuthGoogleStart` handler
  still exist in code, just unused by any page — ask before deleting them
  outright if Google auth is fully off the table.
- **Signup no longer asks for name or workspace name** — just email +
  password (+ confirm password). Those two fields moved to
  `app/welcome/page.tsx` step 1 ("Nama Anda" + "Nama Ruang Kerja" together,
  saved to `profiles.full_name` + a new workspace in one step). If you're
  wondering why a new user's `profiles.full_name` is `null` right after
  signup — that's expected now; it gets filled at `/welcome`, not before.

### Done in session 12 (2026-08-09) — Fixed server actions hanging forever without .env.local
- **`lib/supabase/server.ts`'s missing-credentials mock client used to hang
  forever** on any `await createClient()` (i.e. every server action:
  signIn/signUp/signOut/resetPassword/getUser/getProfile, every API route)
  instead of failing fast — an accidental "thenable" Proxy that never
  called its own `resolve`. Fixed: the mock now has real `.auth.*` methods
  and a properly-awaitable `.from()` chain mock. See ENGINEERING.md for the
  full diagnosis (found by actually driving the login form with a
  temporary Playwright instance, not by reading code alone).
- **`.env.local` now exists with real credentials and login is confirmed
  working** (verified live: Supabase's actual "Invalid login credentials"
  response comes back in <1s for a bogus test login). It was briefly
  misplaced in `.env.local.example` (which Next.js never reads, and which
  `.gitignore` explicitly un-ignores — so that also nearly leaked real
  secrets into git); moved to `.env.local` and the tracked example file
  was restored to placeholder-only content. If Supabase-backed features
  ever start failing again, check `.env.local` exists and hasn't drifted
  back into the example file before debugging further upstream.

### Done in session 13 (2026-08-09) — App redesign: onboarding, dashboard, projects, tasks, calendar, settings
Full task-by-task log in [ENGINEERING.md](ENGINEERING.md) — summary only
here.
- **Fixed the actual invite/signup bug**, not just symptoms: a new user
  registering via an invite link lost the invitation token across the
  email-confirmation round trip and ended up creating an unrelated
  workspace in `/welcome` instead of joining the one they were invited to.
  Fixed by threading the redirect through signup → confirmation email →
  `/auth/callback` → back to `/invite/<token>`.
- **`/welcome` now opens on a join-or-create choice**, not straight into
  workspace creation. `(app)/layout.tsx`'s old forced-modal fallback (no
  join option) was deleted in favor of redirecting to this same screen.
- **Font weight fixed app-wide** (the `font-black`/`font-extrabold`-reads-
  blocky-in-Poppins lesson from sessions 9 and 11, this time applied
  proactively everywhere instead of reactively). Also fixed a stray
  `fontFamily: 'Inter'` override on every toast notification.
- **Dashboard activity feed is real now.** It was dead code: wrong table
  name (`activity_log` vs `activity_logs`) on top of nothing anywhere in
  the codebase ever inserting into that table. Both fixed — new DB
  triggers log task/project/member events, and the dashboard subscribes to
  `postgres_changes` for genuine realtime updates, not polling.
- **Project icons removed** everywhere they were shown or picked
  (creation dialog, project cards, project detail header, dashboard,
  tasks list, calendar chips) — replaced with the project's existing
  `color` field as a small dot instead of inventing new UI.
- **Tasks page defaults to Kanban**, and now actually reads/writes
  `user_preferences.default_view` — that column already defaulted to
  `'kanban'` in the schema but nothing in the UI ever looked at it.
- **Settings page substantially expanded**: workspace description +
  copyable link, a new Preferences card (default view, email/push
  notification toggles — wired to columns in `user_preferences` that
  existed but were completely unused), and a Danger Zone (owner: delete
  workspace; member: leave workspace — the latter needed a new RLS
  policy, see migrations above).
- **Calendar**: fixed a real bug (`top-4.5` isn't a valid Tailwind
  spacing step — the agenda timeline dot had no position), added a
  header card treatment. Kept light-touch since it was already well-built
  from session 6.
- New shared component: `components/ui/switch.tsx` (Radix
  `@radix-ui/react-switch` was already a dependency, just unused).
- **Two new migrations need to be run manually** in the Supabase SQL
  Editor before the activity feed or "leave workspace" do anything — see
  section 3 above. Everything else in this session needed no DB change.
- **Explicitly deferred** (per an explicit sequencing decision, not an
  oversight): per-workspace custom Kanban columns, custom task fields,
  task attachments UI (the `task_attachments` table already exists and
  already has RLS — just no UI), and locking the assignee field to
  admins/owners. All four need either new schema or a role-check that
  wasn't scoped into this pass — see ENGINEERING.md's "Not done" list for
  exactly what each would require.
- **Verification note:** typecheck and `npm run build` both clean (all 39
  routes), but nothing under `app/(app)/**` was visually verified in a
  browser — that requires a real authenticated session with real
  workspace data, which this session didn't have. Worth a manual pass
  through Dashboard/Projects/Tasks/Calendar/Settings before considering
  this done-done.

### Done in session 14 (2026-08-10) — Per-workspace custom Kanban columns + custom task fields
Full log in [ENGINEERING.md](ENGINEERING.md). Summary:
- **`tasks.status` is now TEXT, not the `task_status` ENUM.** Every
  workspace's actual Kanban columns live in the new `task_statuses` table
  (name, color, position, `is_done` flag) — admins manage them from
  Settings > **Papan Kanban** (add/rename/reorder/delete/mark-as-done).
  Deleting a column that still has tasks is blocked with a count, not
  silently allowed.
- **New `task_custom_fields`/`task_custom_field_values` tables** — admins
  define text/number/date/select fields per workspace from Settings >
  **Field Kustom Tugas**; they show up on every task's create form and in
  `TaskDetailSheet`.
- `KanbanBoard`, the Tasks page, the Project detail page's Kanban tab, and
  Dashboard's completion stats (`isOpen`/`doneThisWeek`/momentum) were all
  switched from hardcoded `status === 'done'`/fixed-6-columns logic to the
  new dynamic `useTaskStatuses()`/`useCustomFields()` hooks.
- **Migration not yet run** — `supabase/migrations/20260810_kanban_columns_and_custom_fields.sql`.
  Until it is, the Kanban board has zero columns to render (confirmed
  live: this is exactly what the user saw when they asked "why the status
  is unapear all?").

### Done in session 15 (2026-08-10) — main restored + Vercel production deploy
- **`origin/main` had been replaced entirely with an unrelated portfolio
  site** (commit `ab2b151`, "Replace SaaS app with Abdul Aziz Setiawan's
  interactive portfolio" — 194 files down to 56). Confirmed with the user
  this was intentional to reverse: merged `old-saas-4b3b764` back over
  `main` via an `-s ours` merge (records `ab2b151` as a real parent,
  fast-forwards cleanly, no history rewrite/force-push). `main` and
  `old-saas-4b3b764` are now identical. `old-saas-4b3b764` pushed to
  `origin` (`c:\Projet\ruangbaru` — a local sibling checkout, not GitHub);
  pushing `main` itself was rejected because that other checkout has
  `main` checked out live (git refuses non-bare pushes to the current
  branch) — needs to be finished from that side (switch it off `main`, or
  `git fetch && merge --ff-only` from there).
- **Deployed to Vercel**: new project `azizskorco-2836s-projects/ruangbaru`,
  linked via `vercel link` (no git integration — `origin` isn't a
  GitHub/GitLab/Bitbucket URL, so this is CLI-deployed only; re-run
  `vercel --prod` to ship future changes, or set up a real git remote +
  Vercel's git integration for auto-deploy later).
  **Live at https://ruangbaru-chi.vercel.app.**
  Only the 4 real (non-placeholder) values from `.env.local` were pushed
  as Vercel env vars — `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY` (Production + Preview), plus
  `NEXT_PUBLIC_APP_URL` set to the production domain (Production only).
  Everything else in `.env.local.example` (Resend, Groq, LiveKit, Google
  OAuth, Sentry, PostHog) is still a placeholder there and was **not**
  set on Vercel — those features will show their "not configured"
  fallback behavior in production until real keys are added via
  `vercel env add <NAME> production`.
- **8 pending migrations (sessions 13-14, 17-19, 21) still haven't been run**
  against the live Supabase project — this deploy doesn't change that.
  Kanban/custom fields, the activity feed, "leave workspace", notification
  inserts (assignment + @mention + collaborator), ownership transfer, task
  collaborators, the default-assignee setting, and API keys won't work in
  production until they are: `20260809_activity_log_triggers.sql`,
  `20260809_leave_workspace_rls.sql`,
  `20260810_kanban_columns_and_custom_fields.sql`,
  `20260810_notifications_insert_rls.sql`,
  `20260810_workspace_ownership_transfer.sql`,
  `20260810_task_collaborators.sql`,
  `20260810_workspace_default_assignee.sql`,
  `20260811_api_keys.sql`.
- **Correction, same session:** the deploy above was to the *wrong* Vercel
  account (a brand-new project auto-created under a different account
  than the real one) — the actual project lives under account
  `aaziz6970-7145`, already fully configured (Resend/Groq/LiveKit/Google
  OAuth env vars, 41 days old), with the real domain **ruangbaru.my.id**
  and a connected GitHub repo (`github.com/azizuzezo/ruangbaru`). The
  wrong-account duplicate was deleted. Re-linked to the correct project,
  logged into the correct account (`vercel login aaziz6970@gmail.com`),
  redeployed. Hit a Vercel deployment-protection check requiring the
  commit author's email to match a verified Git account — resolved by
  amending the commit author to `aaziz6970@gmail.com` (a couple of
  deploy attempts still failed transiently after that; a retry
  eventually succeeded — root cause of the transience unclear, may be
  worth another look if it recurs). **`https://ruangbaru.my.id` is now
  serving the current codebase**, confirmed live. `main` and
  `old-saas-4b3b764` both pushed to `github.com/azizuzezo/ruangbaru` (a
  `github` remote was added locally alongside the pre-existing `origin`,
  which still points at a local sibling checkout, not GitHub).

### Done in session 16 (2026-08-10) — Full bilingual (ID/EN) support
Header toggle (`components/i18n/LanguageSwitcher.tsx`), no `/en` URL
routing — `lib/i18n/locale-context.tsx` (`LocaleProvider`/`useLocale`,
localStorage-persisted) wired once in `app/providers.tsx`, so it covers
marketing + auth + the entire authenticated app uniformly. `useT(namespace)`
looks up flat-keyed dictionaries in `lib/i18n/dict/<namespace>.ts` (16
namespaces), merged by `lib/i18n/dict/index.ts`. Built via 12 parallel
agents, one per cohesive file group, each owning its own dict file — zero
shared-file contention. Full detail in ENGINEERING.md's 2026-08-10 i18n
entry. `tsc`/`build` clean; live-toggle-tested with Playwright.

### Done in session 17 (2026-08-10) — Backlog default, @mentions, attachments, permission lockdown, ownership transfer, project collaborators, drag-and-drop fix
Six asks, one session — full detail in ENGINEERING.md's matching entry:
1. Every task-creation entry point (main dialog, calendar quick-add,
   onboarding wizard) now silently defaults to the workspace's first Kanban
   column instead of showing a status picker.
2. `@mention` tagging in task description + comments
   (`@tiptap/extension-mention` + `tippy.js`, `components/editor/`), with
   mention notifications on save/comment.
3. Task attachments: upload/list/download(signed URL)/delete UI in
   `TaskDetailSheet.tsx` — the table + storage RLS existed since session 1
   but had zero UI until now.
4. **Real bug found & fixed:** `notifications` had RLS enabled but **no
   INSERT policy ever existed** — every notify-the-other-person flow
   (task assignment, now mentions) was silently failing. Fixed via
   `20260810_notifications_insert_rls.sql`.
5. Team/Settings pages let non-admins see (and click, then get a confusing
   RLS error from) invite/role-change/remove-member/edit-workspace controls
   they never had permission to use — RLS was already correct, the UI just
   didn't hide anything. Gated all of it behind a roster-derived `isAdmin`.
6. Workspace slug is now admin-editable (redirects on rename, since the
   slug IS the `[workspace]` URL segment) and there's a new owner-only
   "Transfer Ownership" flow — `20260810_workspace_ownership_transfer.sql`
   adds a trigger closing a real gap (any admin could previously reassign
   `owner_id` directly, bypassing the UI) plus a `transfer_workspace_ownership`
   RPC for the atomic three-write handoff.
7. Project collaborators (`project_members`) — table existed since session
   1, zero UI until now. Added avatar-stack + add/remove UI on the project
   detail page, admin-gated, with a `project_invite` notification on add.
8. **Drag-and-drop cursor offset bug** ("~5cm gap"): root cause was
   `PageTransition.tsx` animating `y`/`filter`, which Framer Motion leaves
   as a permanent inline `transform`/`filter` at rest — a transformed or
   filtered ancestor creates a new containing block for `position: fixed`,
   which is exactly what dnd-kit's `DragOverlay` is. Fixed by reducing the
   transition to opacity-only.

**Not run against the live database:** `20260810_notifications_insert_rls.sql`
and `20260810_workspace_ownership_transfer.sql` (same standing caveat as
every migration below).

### Done in session 18 (2026-08-10) — Task-level collaborators
Same idea as project collaborators, one level down: any task can have
extra people looped in beyond its single assignee, surfaced at the very
top of `TaskDetailSheet.tsx` (avatar stack + "+" button, above title/
status/priority — a deliberately low-friction spot). New table
`task_collaborators` + new `notification_type` enum value
`'task_collaborator'` (`20260810_task_collaborators.sql`). Unlike project
collaborators (admin-only), **any workspace member can add one** — an
everyday action, not a structural change. `tsc`/`build` clean.

### Done in session 19 (2026-08-10) — Admin-configurable default assignee
New `workspaces.default_assignee_id` column, settable by admins in
Settings' Workspace card. Every create-task entry point (main dialog,
calendar quick-add) now pre-fills its assignee field from it instead of
starting blank — still changeable per task before submitting. `tsc`/`build`
clean.

### Done in session 20 (2026-08-10) — Loading-state audit
User reported clicking something gave no loading feedback — too vague to
act on directly, so an Explore agent swept every authenticated page/shared
layout component for async handlers with **zero** loading indicator (not
"looks off," genuinely nothing until the toast). Found and fixed 13 across
8 files (Team, Projects list + detail, Notes, Calendar, Meetings list +
room, TaskDetailSheet, Header) — each using whichever loading pattern
(single boolean vs. per-row `xxxId` state) the file already used elsewhere,
not a new shared abstraction. Full list in ENGINEERING.md. `tsc`/`build`
clean.

### Done in session 21 (2026-08-10) — Per-workspace API keys + public REST API + docs
Any workspace admin can now generate an API key (Settings → "API Keys" —
plaintext shown once, only a SHA-256 hash stored) to connect external
tools to a new REST API under `/api/v1/`: `GET /workspace`, `GET/POST
/projects`, `GET/POST /tasks`, `GET/PATCH/DELETE /tasks/:id`, all
authenticated via `Authorization: Bearer <key>` and scoped to that key's
workspace. New public standalone docs page at `/api-docs` (own header, not
nested under the dashboard), bilingual, with per-endpoint curl/JSON
examples. **Found and fixed a real bug while testing:** the session
middleware's protected-route check used `pathname.includes(route)` against
a list containing `/tasks`/`/projects` — so `/api/v1/tasks` and
`/api/v1/projects` were being 307-redirected to `/login` for
unauthenticated requests instead of returning JSON (and CORS preflight
`OPTIONS` requests were getting a redirect with zero CORS headers, which
would have broken every browser-based API client). Fixed by excluding all
`/api/` paths from that check — API routes authenticate themselves, they
should never redirect to a login page. Full detail in ENGINEERING.md.
`tsc`/`build` clean; live-tested against the dev server (401s without a
key, 204 + CORS headers on OPTIONS after the fix, docs page screenshotted).

### Done in session 22 (2026-08-10) — Admin panel: delete workspace / delete user account
For moderation of violations. `app/admin/page.tsx` now has a tab switcher
(Workspaces / Pengguna); every workspace row and every user row has a
destructive delete button, gated behind a type-to-confirm dialog (must type
the exact workspace slug or user email to arm the "Hapus Permanen" button —
no accidental one-click deletes).
- **`POST /api/admin/delete-workspace`** (`{ workspaceId }`) — service-role
  hard delete of the `workspaces` row. Cascades (existing FKs, no new
  migration) wipe projects/tasks/notes/members/etc. scoped to it.
- **`GET /api/admin/users`** — lists all `profiles` with their owned
  workspaces (`workspaces!owner_id`) and workspace-membership count, for the
  new Users tab.
- **`POST /api/admin/delete-user`** (`{ userId }`) — service-role
  `admin.auth.admin.deleteUser(userId, false)` (hard delete, not soft-delete).
  `profiles.id → auth.users(id) ON DELETE CASCADE` and
  `workspaces.owner_id → profiles(id) ON DELETE CASCADE` mean deleting a user
  also deletes their profile **and any workspace they own** (plus everything
  in it) — the confirm dialog surfaces an explicit warning with the owned-
  workspace count before arming the button. Blocks deleting your own account
  and any of the two hardcoded `ADMIN_EMAILS` (server-side in the route, and
  the button is hidden/disabled in the UI too).
- All three routes reuse the existing `ADMIN_EMAILS` allowlist + service-role
  `createAdminClient()` pattern from `update-plan`/`workspaces` — no schema
  changes, no new migration needed.
- `tsc`/`build` clean. Not yet exercised against a real Supabase project in
  a browser (needs an authenticated admin session) — logic was verified by
  reading the FK cascade chain in `001_initial_schema.sql`, not by clicking
  through it live.

### Done in session 23 (2026-08-10) — Sanitized backend error exposure in all notifications
Every `catch` block across the app that showed a caught exception's raw
`.message` in a toast — or every API route that echoed it back in a JSON
`{ error: ... }` body — could leak internal details (Postgres constraint/
table names, RLS denial text, Resend error strings) straight to the user or
to any `/api/v1/*` API-key caller. Swept the whole client + server surface
and replaced all of it with one shared generic message.
- **New `common.errorContactSupport`** i18n key (`lib/i18n/dict/common.ts`,
  id: "Terjadi kesalahan. Silakan hubungi dukungan kami.", en: "An error
  occurred. Please contact support."). Pages call a second `useT('common')`
  hook (`tc`) alongside their existing namespace hook to reach it — first use
  of the multi-namespace pattern in this codebase; every other file still
  uses a single `useT()` call.
- **Client-side**: ~35 `toast.error(err.message || t('...'))` call sites
  across `app/admin`, `app/(app)/[workspace]/{team,tasks,settings,projects,
  projects/[projectId],notes}`, `app/welcome`, `app/invite/[token]`,
  `components/tasks/TaskDetailSheet.tsx`, `components/calendar/EventDialog.tsx`,
  `components/settings/{KanbanColumnsSettings,CustomFieldsSettings}.tsx` now
  always show `tc('errorContactSupport')` — the caught error's `.message` is
  dropped entirely, never rendered. Two helper functions that pattern-matched
  known RPC error strings to friendly text (`translateError` in
  `invite/[token]/page.tsx`, `translateInviteError` in `welcome/page.tsx`, both
  for the `accept_invitation` RPC) kept their specific mappings (expired/
  already-accepted/wrong-email/not-found) but now take an explicit `fallback`
  param instead of falling through to the raw message on an unrecognized one.
- **Server-side**: every `app/api/**` route that did
  `NextResponse.json({ error: err.message }, { status: 500 })` (or the CORS
  `corsJson` equivalent in the public `/api/v1/*` routes) now logs the real
  error via `console.error` and returns a fixed `'Internal server error.
  Please contact support.'` string instead — `admin/{workspaces,update-plan,
  delete-workspace,delete-user,users}`, `v1/{tasks,tasks/[id],projects}`,
  `support/ticket`. `api/invitations/send` also stopped returning
  `errors: [...]` (raw Resend rejection messages) in its response body —
  just `{ sent, failed }` counts now; failures still logged server-side.
- **Deliberately left untouched — these are curated, user-safe Supabase Auth
  messages, not backend/DB leaks**: `lib/supabase/actions.ts` (signIn/signUp/
  resetPassword/signInWithGoogle all return `error.message` from
  `supabase.auth.*` calls — e.g. "Invalid login credentials" — consumed by
  `login`/`register`/`forgot-password`/`welcome`'s server-action forms), and
  `app/(auth)/reset-password/page.tsx`'s `supabase.auth.updateUser()` error
  (e.g. "New password should be different from the old password"). Genericizing
  these would actively hurt UX (a user needs to know *why* login failed) without
  closing any real leak, since Supabase Auth already curates them.
- `tsc`/`build` clean. Not click-tested live (would need to actually trigger
  a DB error, e.g. a duplicate-slug workspace rename, to see the toast).

### Known remaining gaps / TODO
- **Resend domain** `ruangbaru.com` must be verified in Resend or emails fail (falls back to copy-link).
- **Password reset email** still uses Supabase's mailer (only signup confirmation was moved to Resend in session 7). To move it too, either repeat the `generateLink({ type: 'recovery' })` + `sendPasswordReset()` pattern, or set Resend as custom SMTP in Supabase Dashboard → Auth → SMTP.
- **Security audit follow-ups (session 8):** broad `SELECT` grant on `auth.users` to anon/authenticated (008_grant_auth_users.sql), Google OAuth `state` has no CSRF nonce, Google Calendar tokens stored in plaintext, `accept_invitation()` missing explicit `search_path`, no rate limiting on public endpoints (chat/support/forgot-password), no security headers in `next.config.ts`, zero automated tests, 13 real `react-hooks/set-state-in-effect` lint errors in KanbanBoard/Tour components.
- **Payments** intentionally stubbed (honest "coming soon" toast on Billing).
- **Realtime collaboration** enabled at DB level, but only Header notifications subscribe; boards/notes don't live-sync between users yet.
- Notes, Tasks (Kanban), and Settings pages still lack skeleton loading states.
- Product tour is a summary step, not an interactive dashboard overlay.
- **`three` package**: added to dependencies in session 2.
- **Admin panel** requires `SUPABASE_SERVICE_ROLE_KEY` env var to be set; without it the API routes throw a 500.
- **Meetings gating**: currently plan is read from `currentWorkspace?.plan` (Zustand, persisted). After a plan upgrade, user must reload or re-login to see meetings.
- Run `007_fix_settings_rls.sql` in Supabase SQL Editor to fix workspace/profile update permissions.

---

## 7. Run / verify

```bash
npm run dev          # local dev (restart after .env changes — NEXT_PUBLIC_* are inlined)
npx tsc --noEmit     # typecheck (keep green)
npm run build        # production build (keep green)
```
Multiple lockfiles warning is benign (a stray `C:\Users\USer\package-lock.json`).

---

### Done in session 24 (2026-11-17), Dashboard + Kanban redesign, loading and click feedback
Full log in ENGINEERING.md. Summary:
- **Dashboard** rebuilt from `components/dashboard/` (DashboardHero, SectionCard, panels). Solid brand-blue hero (`--hero` token, deeper in dark) with greeting, count-up stats and the **FlowBar** (`components/tasks/FlowBar.tsx`): tasks per Kanban column in each column's colour. FlowBar is the identity motif, reused above the board and on each project row.
- **Per-section loading**: `lib/hooks/useSectionData.ts`, each section has its own query, skeleton, header spinner, error and "Coba lagi". One failing query no longer blanks the page.
- **Kanban**: tinted columns of equal height that scroll internally (lg), "+" per column (opens the form preset to that column), title-first cards with due chips and priority flags, a saving spinner on a dropped card, a dashed drop slot, TouchSensor, `KanbanSkeleton`, and a no-columns empty state.
- **Click feedback**: `components/ui/spinner.tsx` (the only spinner), `Button loading` prop, `components/layout/NavFeedback.tsx` (`LinkPendingIcon`/`LinkPendingHint` via `useLinkStatus` + `RouteProgress` top bar), `app/(app)/[workspace]/loading.tsx`.
- **Deep links**: `/tasks?new=1|mine=1|col=<key>`, `/projects?new=1`. **Gotcha:** do not strip these with `history.replaceState`. Search params are part of the page segment key, so changing them remounts the page and undoes the state.
- **Bug fixed:** the global `* { border-color }` was unlayered and beat every Tailwind border-colour utility; it now lives in `@layer base`.
- Verified against the live workspace with a read-only Playwright click-through (writes were blocked or answered locally), `tsc` and `next build` clean.

## 8. Working agreement / preferences
- Production-grade only: no mock data, no demo shortcuts. Choose the scalable option.
- **Design system first:** change shared tokens/components, never redesign pages independently. One source of truth for UI.
- Logo: full wordmark = page logo; square icon = favicon.
- Keep typecheck + build green before declaring done; report failures honestly.
