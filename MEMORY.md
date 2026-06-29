# RuangBaru Workspace — Project Memory & Context

> **Purpose:** This file is the single source of truth for project context so any
> new session (or a different Claude account / teammate) can continue work
> without losing history. **Read this first.** Update it whenever you make a
> meaningful change.

Last updated: 2026-06-29 (session 4 — dashboard interaction redesign + presence system)

---

## 1. What this is

**RuangBaru Workspace** — a production-grade, multi-tenant SaaS: an all-in-one
collaborative workspace for Indonesian SMEs/UMKM (projects, tasks, notes,
calendar, team). Tagline: _"Semua pekerjaan dalam satu ruang."_ Language: UI is
Indonesian (Bahasa Indonesia).

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
- **Email:** [lib/email/resend.ts](lib/email/resend.ts) + [app/api/invitations/send/route.ts](app/api/invitations/send/route.ts).
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

### Design system rules (session 3+)
- Font: `'Plus Jakarta Sans', ui-sans-serif, system-ui, sans-serif` for both `--font-sans` and `--font-display`
- Primary: `#106CD8` (blue) — actions, active states, links
- Success/collab: `#10B29F` (teal) — completion, online status
- Highlight: `#FDB31A` (yellow) — important badges only
- White/gray neutrals dominate. No dark hero sections. Subtle borders (1px, #E5E7EB). Minimal shadows.
- Website: ruangbaru.my.id (used in metadata, footer, emails)

### Known remaining gaps / TODO
- **Resend domain** `ruangbaru.com` must be verified in Resend or emails fail (falls back to copy-link).
- **Auth emails** (signup confirm / password reset) still use Supabase's mailer. To use Resend, set Resend as custom SMTP in Supabase Dashboard → Auth → SMTP (config, not code).
- **Payments** intentionally stubbed (honest "coming soon" toast on Billing).
- **Realtime collaboration** enabled at DB level, but only Header notifications subscribe; boards/notes don't live-sync between users yet.
- Notes, Tasks (Kanban), and Settings pages still lack skeleton loading states.
- Product tour is a summary step, not an interactive dashboard overlay.
- **`three` package**: added to dependencies in session 2.

---

## 7. Run / verify

```bash
npm run dev          # local dev (restart after .env changes — NEXT_PUBLIC_* are inlined)
npx tsc --noEmit     # typecheck (keep green)
npm run build        # production build (keep green)
```
Multiple lockfiles warning is benign (a stray `C:\Users\USer\package-lock.json`).

---

## 8. Working agreement / preferences
- Production-grade only: no mock data, no demo shortcuts. Choose the scalable option.
- **Design system first:** change shared tokens/components, never redesign pages independently. One source of truth for UI.
- Logo: full wordmark = page logo; square icon = favicon.
- Keep typecheck + build green before declaring done; report failures honestly.
