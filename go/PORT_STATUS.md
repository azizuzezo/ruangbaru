# Go backend — port status

Scope reminder (see ENGINEERING.md for the full session log): **most of this
app's data operations never went through a Node.js backend at all.**
Projects, tasks, notes, calendar, team, billing, settings — every one of
those CRUD every screen in `app/(app)/[workspace]/*` calls
`supabase.from(...)` directly from the browser, straight to Supabase's own
PostgREST/Realtime API, which is already language-agnostic infrastructure
Supabase runs, not something "written in Node.js." There is nothing to port
there — that traffic pattern doesn't change no matter what language the
frontend is written in.

The actual Node.js backend surface is: 7 functions in
`lib/supabase/actions.ts` (Server Actions bound to forms) + 11 API routes in
`app/api/**` + `app/auth/callback/route.ts`. That's the complete inventory,
and everything below is 1:1 against it.

## Status legend
- ✅ **Ported** — logic reimplemented in Go, builds and passes `go vet`.
- ⚠️ **Ported, best-effort** — reimplemented, but depends on something not
  independently verified in this session (see the note).
- ⬜ **Not started**

## Server Actions (`lib/supabase/actions.ts`)

| Function | Go handler | Status | Note |
|---|---|---|---|
| `signIn` | `AuthSignIn` | ⚠️ | Sets the `sb-<ref>-auth-token` cookie via `supa/cookies.go` — that encoding is reverse-engineered from public `@supabase/ssr` behavior, not a documented wire format. **Verify against your actual installed `@supabase/ssr` version in a browser before trusting this for real logins.** |
| `signUp` | `AuthSignUp` | ✅ | Same Resend-branded-email-first / Supabase-mailer-fallback logic as the original. |
| `signOut` | `AuthSignOut` | ⚠️ | Same cookie caveat as `signIn`. |
| `resetPassword` | `AuthResetPassword` | ✅ | Plain GoTrue `/recover` call, no cookie involved. |
| `signInWithGoogle` | `AuthGoogleStart` | ✅ (shape changed) | Original did `redirect()` server-side (Server Action). Go version returns `{url}` JSON for the frontend to redirect to itself — Go has no Server Action equivalent. **Frontend integration step:** replace the `signInWithGoogle()` call with `fetch` + `window.location.href = url`. |
| `getUser` | `AuthGetUser` | ✅ | |
| `getProfile` | `AuthGetProfile` | ✅ | |

## API routes (`app/api/**`, `app/auth/callback`)

| Route | Go handler | Status | Note |
|---|---|---|---|
| `POST /api/auth/forgot-password` | `ForgotPassword` | ✅ | |
| `POST /api/chat` | `Chat` | ✅ | System prompt copied verbatim. |
| `GET /api/google/callback` | `GoogleCallback` | ⚠️ | Needs `authenticatedUser` (cookie-dependent, same caveat as `signIn`) since this is a plain GET the user's browser hits after the Google redirect — there's no Authorization header to use here. |
| `GET /api/google/connect` | `GoogleConnect` | ✅ | No auth/secrets beyond the OAuth client id. |
| `POST /api/google/sync` | `GoogleSync` | ✅ | |
| `POST /api/invitations/send` | `InvitationsSend` | ✅ | Same security posture as the original: only trusts tokens, re-derives email/workspace/inviter from the DB under the caller's own RLS session, requires admin/owner role. |
| `POST /api/meetings/end` | `MeetingsEnd` | ✅ | LiveKit `DeleteRoom` reimplemented as a raw Twirp+JSON call (no SDK). |
| `POST /api/meetings/token` | `MeetingsToken` | ✅ | LiveKit access token reimplemented as manual HS256 JWT signing (no SDK). |
| `POST /api/support/ticket` | `SupportTicket` | ✅ | |
| `GET /api/admin/workspaces` | `AdminListWorkspaces` | ✅ | |
| `POST /api/admin/update-plan` | `AdminUpdatePlan` | ✅ | |
| `GET /auth/callback` | `AuthCallback` | ⚠️ | PKCE code exchange. Needs the `code_verifier` from a cookie whose exact name/encoding is assumed, not verified (`supa/auth.go`'s `ExchangeCodeForSession` doc comment has the details). This is the single riskiest piece of the port — Google OAuth login will silently fail here if the assumption is wrong. |

## Known simplifications vs. the Node version
- PostgREST `.single()` calls (which error on 0 or >1 rows) were approximated
  with `&limit=1` + "take the first result." Functionally equivalent for
  every query in this app (all are keyed on a unique id), but not identical
  error semantics.
- `AdminRequest`/`UserRequest` always send `Prefer: return=representation`.
  Harmless on GoTrue calls (ignored), matches the Node code's `.select()`
  usage on every PostgREST call it makes.

## Integration steps still needed on the frontend side
None of `app/api/**/route.ts`, `app/auth/callback/route.ts`, or
`lib/supabase/actions.ts` have been deleted or modified — the Next.js app
works exactly as it did before this port. To actually cut traffic over to
this Go service:
1. Deploy both images (see `k8s/`, `bitbucket-pipelines.yml`) behind the
   ingress in `k8s/ingress.yaml`, which routes `/api/*` and `/auth/callback`
   to the Go service and everything else to Next.js.
2. Replace the `<form action={signIn}>` / `<form action={signUp}>` style
   Server Action bindings in `app/(auth)/login/page.tsx` and
   `app/(auth)/register/page.tsx` with `fetch('/api/auth/signin', ...)` /
   `fetch('/api/auth/signup', ...)` calls, since Go has no Server Action
   equivalent.
3. Verify the ⚠️ items above against a real browser session before removing
   the corresponding Next.js code as a fallback.
4. Only once (1)–(3) are done and verified, delete the now-redundant
   `app/api/**/route.ts` files and the ported functions in
   `lib/supabase/actions.ts`.

## Not verified in this session
- **Docker builds**: Docker Desktop's daemon wasn't running in this
  environment, so neither `Dockerfile` (frontend) nor `go/Dockerfile`
  (backend) has actually been built. Both follow standard, widely-used
  multi-stage patterns (Next.js `output: "standalone"` + `distroless`
  static Go binary respectively) — run `docker build` locally before
  wiring the pipeline to a real ECR.
- **AWS/EKS/Bitbucket**: no cluster, ECR repo, or Bitbucket repo variables
  were touched — `bitbucket-pipelines.yml`'s deploy step is `trigger:
  manual` specifically so a real run requires a human to click "Run" after
  the repository variables listed at the top of that file are set.
