'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, KeyRound, Terminal, AlertTriangle, Folder, CheckSquare, Building2 } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { useT } from '@/lib/i18n/useT';
import { cn } from '@/lib/utils';

// Deliberately hardcoded, not `SITE_URL` from lib/seo — that constant
// follows `NEXT_PUBLIC_APP_URL`, which is set to `localhost` in local dev
// and to preview URLs on Vercel previews. Documentation describes the one
// real, canonical API surface regardless of where the docs page itself is
// being viewed from.
const BASE_URL = 'https://ruangbaru.my.id/api/v1';

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-xl bg-neutral-950 p-4 text-[12px] leading-6 text-neutral-100">
      <code>{children}</code>
    </pre>
  );
}

function MethodBadge({ method }: { method: 'GET' | 'POST' | 'PATCH' | 'DELETE' }) {
  const colors: Record<string, string> = {
    GET: 'bg-sky-500/15 text-sky-600',
    POST: 'bg-emerald-500/15 text-emerald-600',
    PATCH: 'bg-amber-500/15 text-amber-700',
    DELETE: 'bg-rose-500/15 text-rose-600',
  };
  return <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold', colors[method])}>{method}</span>;
}

function Endpoint({ method, path, title, description, request, response }: {
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  path: string;
  title: string;
  description: string;
  request?: string;
  response: string;
}) {
  return (
    <div className="border-t border-neutral-100 py-8 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center gap-2">
        <MethodBadge method={method} />
        <code className="text-sm font-semibold text-neutral-900">{path}</code>
      </div>
      <h3 className="mt-2 text-base font-semibold text-neutral-950">{title}</h3>
      <p className="mt-1 text-sm text-neutral-600">{description}</p>
      {request && (
        <div className="mt-4">
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-neutral-400">Request</p>
          <CodeBlock>{request}</CodeBlock>
        </div>
      )}
      <div className="mt-4">
        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-neutral-400">Response</p>
        <CodeBlock>{response}</CodeBlock>
      </div>
    </div>
  );
}

const SECTIONS = [
  { id: 'introduction', icon: Terminal },
  { id: 'authentication', icon: KeyRound },
  { id: 'errors', icon: AlertTriangle },
  { id: 'workspace', icon: Building2 },
  { id: 'projects', icon: Folder },
  { id: 'tasks', icon: CheckSquare },
] as const;

export default function ApiDocsPage() {
  const t = useT('apiDocs');
  const [active, setActive] = useState('introduction');

  const sectionLabel: Record<string, string> = {
    introduction: t('navIntroduction'),
    authentication: t('navAuthentication'),
    errors: t('navErrors'),
    workspace: t('navWorkspace'),
    projects: t('navProjects'),
    tasks: t('navTasks'),
  };

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <header className="sticky top-0 z-40 border-b border-neutral-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 transition-transform hover:scale-[1.02]">
            <Logo variant="wordmark" height={28} priority />
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-800">
              <ArrowLeft className="h-3.5 w-3.5" /> {t('backToApp')}
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-10 px-4 py-10 sm:px-6">
        {/* Sidebar nav — desktop only */}
        <nav className="hidden w-48 shrink-0 lg:block">
          <div className="sticky top-24 space-y-0.5">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                onClick={() => setActive(s.id)}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                  active === s.id ? 'bg-primary/10 text-primary' : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900'
                )}
              >
                <s.icon className="h-3.5 w-3.5" /> {sectionLabel[s.id]}
              </a>
            ))}
          </div>
        </nav>

        {/* Mobile TOC */}
        <nav className="mb-2 flex gap-1.5 overflow-x-auto lg:hidden">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="shrink-0 rounded-full border border-neutral-200 px-3 py-1 text-[11px] font-medium text-neutral-600"
            >
              {sectionLabel[s.id]}
            </a>
          ))}
        </nav>

        {/* Content */}
        <main className="min-w-0 flex-1 max-w-2xl">
          <section id="introduction" className="pb-10">
            <h1 className="text-[clamp(1.6rem,3vw,2.2rem)] font-semibold tracking-tight text-neutral-950">{t('title')}</h1>
            <p className="mt-3 text-sm leading-7 text-neutral-600">{t('introBody')}</p>
            <p className="mt-3 text-sm leading-7 text-neutral-600">{t('introBaseUrl')}</p>
            <CodeBlock>{BASE_URL}</CodeBlock>
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
              {t('introFairUseNote')}
            </div>
          </section>

          <section id="authentication" className="border-t border-neutral-100 py-10">
            <h2 className="text-lg font-semibold text-neutral-950">{t('navAuthentication')}</h2>
            <p className="mt-2 text-sm leading-7 text-neutral-600">{t('authBody')}</p>
            <CodeBlock>{`curl ${BASE_URL}/workspace \\\n  -H "Authorization: Bearer rb_live_••••••••••••••••••••••••••••••••"`}</CodeBlock>
            <p className="mt-3 text-sm leading-7 text-neutral-600">{t('authWhereToGetKey')}</p>
          </section>

          <section id="errors" className="border-t border-neutral-100 py-10">
            <h2 className="text-lg font-semibold text-neutral-950">{t('navErrors')}</h2>
            <p className="mt-2 text-sm leading-7 text-neutral-600">{t('errorsBody')}</p>
            <CodeBlock>{`{\n  "error": "Invalid or missing API key. Pass it as \\"Authorization: Bearer <key>\\"."\n}`}</CodeBlock>
            <div className="mt-4 overflow-x-auto rounded-xl border border-neutral-100">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 text-neutral-500">
                  <tr>
                    <th className="px-3 py-2 font-semibold">{t('errorsStatusCol')}</th>
                    <th className="px-3 py-2 font-semibold">{t('errorsMeaningCol')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-neutral-700">
                  <tr><td className="px-3 py-2 font-mono">400</td><td className="px-3 py-2">{t('errors400')}</td></tr>
                  <tr><td className="px-3 py-2 font-mono">401</td><td className="px-3 py-2">{t('errors401')}</td></tr>
                  <tr><td className="px-3 py-2 font-mono">404</td><td className="px-3 py-2">{t('errors404')}</td></tr>
                  <tr><td className="px-3 py-2 font-mono">500</td><td className="px-3 py-2">{t('errors500')}</td></tr>
                </tbody>
              </table>
            </div>
          </section>

          <section id="workspace">
            <h2 className="pt-10 text-lg font-semibold text-neutral-950">{t('navWorkspace')}</h2>
            <Endpoint
              method="GET"
              path="/workspace"
              title={t('workspaceGetTitle')}
              description={t('workspaceGetDesc')}
              response={`{\n  "data": {\n    "id": "5f2c...",\n    "name": "Acme Team",\n    "slug": "acme-team",\n    "plan": "free",\n    "created_at": "2026-01-10T08:00:00.000Z"\n  }\n}`}
            />
          </section>

          <section id="projects">
            <h2 className="pt-10 text-lg font-semibold text-neutral-950">{t('navProjects')}</h2>
            <Endpoint
              method="GET"
              path="/projects"
              title={t('projectsListTitle')}
              description={t('projectsListDesc')}
              response={`{\n  "data": [\n    {\n      "id": "a1b2...",\n      "name": "Website Redesign",\n      "description": null,\n      "color": "#106CD8",\n      "status": "active",\n      "created_at": "2026-02-01T00:00:00.000Z",\n      "updated_at": "2026-02-01T00:00:00.000Z"\n    }\n  ]\n}`}
            />
            <Endpoint
              method="POST"
              path="/projects"
              title={t('projectsCreateTitle')}
              description={t('projectsCreateDesc')}
              request={`{\n  "name": "Website Redesign",\n  "description": "Q1 marketing site refresh",\n  "color": "#106CD8"\n}`}
              response={`{\n  "data": {\n    "id": "a1b2...",\n    "name": "Website Redesign",\n    "description": "Q1 marketing site refresh",\n    "color": "#106CD8",\n    "status": "active",\n    "created_at": "2026-02-01T00:00:00.000Z",\n    "updated_at": "2026-02-01T00:00:00.000Z"\n  }\n}`}
            />
          </section>

          <section id="tasks">
            <h2 className="pt-10 text-lg font-semibold text-neutral-950">{t('navTasks')}</h2>
            <Endpoint
              method="GET"
              path="/tasks?project_id=&status="
              title={t('tasksListTitle')}
              description={t('tasksListDesc')}
              response={`{\n  "data": [\n    {\n      "id": "c3d4...",\n      "project_id": "a1b2...",\n      "title": "Draft new homepage copy",\n      "description_text": null,\n      "status": "backlog",\n      "priority": "medium",\n      "assignee_id": null,\n      "due_date": null,\n      "created_at": "2026-02-02T00:00:00.000Z",\n      "updated_at": "2026-02-02T00:00:00.000Z"\n    }\n  ]\n}`}
            />
            <Endpoint
              method="POST"
              path="/tasks"
              title={t('tasksCreateTitle')}
              description={t('tasksCreateDesc')}
              request={`{\n  "title": "Draft new homepage copy",\n  "project_id": "a1b2...",\n  "priority": "medium",\n  "due_date": "2026-02-14"\n}`}
              response={`{\n  "data": {\n    "id": "c3d4...",\n    "project_id": "a1b2...",\n    "title": "Draft new homepage copy",\n    "status": "backlog",\n    "priority": "medium",\n    "due_date": "2026-02-14",\n    "created_at": "2026-02-02T00:00:00.000Z",\n    "updated_at": "2026-02-02T00:00:00.000Z"\n  }\n}`}
            />
            <Endpoint
              method="GET"
              path="/tasks/:id"
              title={t('tasksGetTitle')}
              description={t('tasksGetDesc')}
              response={`{\n  "data": {\n    "id": "c3d4...",\n    "project_id": "a1b2...",\n    "title": "Draft new homepage copy",\n    "status": "backlog",\n    "priority": "medium",\n    "due_date": "2026-02-14",\n    "created_at": "2026-02-02T00:00:00.000Z",\n    "updated_at": "2026-02-02T00:00:00.000Z"\n  }\n}`}
            />
            <Endpoint
              method="PATCH"
              path="/tasks/:id"
              title={t('tasksUpdateTitle')}
              description={t('tasksUpdateDesc')}
              request={`{\n  "status": "in_progress"\n}`}
              response={`{\n  "data": {\n    "id": "c3d4...",\n    "status": "in_progress",\n    "updated_at": "2026-02-03T00:00:00.000Z"\n  }\n}`}
            />
            <Endpoint
              method="DELETE"
              path="/tasks/:id"
              title={t('tasksDeleteTitle')}
              description={t('tasksDeleteDesc')}
              response={`{\n  "data": { "deleted": true }\n}`}
            />
          </section>
        </main>
      </div>
    </div>
  );
}
