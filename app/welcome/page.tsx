'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { Logo } from '@/components/brand/Logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { slugify } from '@/lib/utils';
import { toast } from 'sonner';
import {
  Loader2, Sparkles, ArrowRight, ArrowLeft, Plus, Check, Users, Mail,
  FolderKanban, CheckSquare, Rocket, PartyPopper, Layers, Link2, ChevronLeft,
} from 'lucide-react';
import type { Workspace, Profile, Project } from '@/types';
import { useT } from '@/lib/i18n/useT';
import { LanguageSwitcher } from '@/components/i18n/LanguageSwitcher';
import { useTaskStatuses } from '@/lib/hooks/useTaskStatuses';

const STEP_KEYS = ['stepWorkspace', 'stepInviteTeam', 'stepProject', 'stepTask', 'stepDone'] as const;

export default function WelcomeWizard() {
  const t = useT('auth');
  const STEPS = STEP_KEYS.map((k) => t(k));
  const router = useRouter();
  const supabase = createClient();
  const { setCurrentWorkspace, setWorkspaces, setCurrentUser } = useWorkspaceStore();

  const [checking, setChecking] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  // A brand-new user (no workspace yet) picks a path first: create one, or
  // join one they were already invited to but didn't sign up through the
  // invite link for (e.g. they registered directly and separately have an
  // invite email/link to redeem).
  const [mode, setMode] = useState<'choice' | 'create' | 'join'>('choice');
  const [joinInput, setJoinInput] = useState('');
  const [joining, setJoining] = useState(false);

  // collected data
  const [fullName, setFullName] = useState('');
  const [wsName, setWsName] = useState('');
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [invites, setInvites] = useState<string[]>(['', '', '']);
  const [projName, setProjName] = useState('');
  const [project, setProject] = useState<Project | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  // The wizard's demo task starts in this new workspace's first column
  // (Backlog, seeded automatically for every new workspace) — no picker.
  const { defaultKey: taskDefaultStatus } = useTaskStatuses(workspace?.id);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }
      const { data: memberships } = await supabase
        .from('workspace_members').select('workspaces(slug)').eq('user_id', user.id).limit(1);
      const slug = (memberships?.[0] as any)?.workspaces?.slug;
      if (slug) { router.replace(`/${slug}/dashboard`); return; }
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      const resolved = (prof as Profile) ?? {
        id: user.id, email: user.email ?? '', full_name: (user.user_metadata?.full_name as string) ?? null,
        avatar_url: null, bio: null, created_at: '', updated_at: '',
      };
      setProfile(resolved); setCurrentUser(resolved);
      if (resolved.full_name) setFullName(resolved.full_name);
      const suggested = user.user_metadata?.workspace_name as string | undefined;
      if (suggested) setWsName(suggested);
      setChecking(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // STEP 1 — save name + create workspace. Signup only asked for email and
  // password, so this is the first point the user's actual name and their
  // workspace's name are both known.
  const createWorkspace = async () => {
    if (!wsName.trim() || !fullName.trim() || !profile) return;
    setBusy(true);
    try {
      const trimmedName = fullName.trim();
      if (trimmedName !== (profile.full_name || '')) {
        const { error: pErr } = await supabase.from('profiles').update({ full_name: trimmedName }).eq('id', profile.id);
        if (pErr) throw pErr;
        const updatedProfile = { ...profile, full_name: trimmedName };
        setProfile(updatedProfile);
        setCurrentUser(updatedProfile);
      }

      const slug = `${slugify(wsName)}-${Math.floor(Math.random() * 10000)}`;
      const { data: ws, error } = await supabase
        .from('workspaces').insert({ name: wsName, slug, owner_id: profile.id, plan: 'free' }).select().single();
      if (error) throw error;
      const { error: mErr } = await supabase
        .from('workspace_members').insert({ workspace_id: ws.id, user_id: profile.id, role: 'owner' });
      if (mErr) throw mErr;
      setWorkspace(ws as Workspace);
      setWorkspaces([ws as Workspace]);
      setCurrentWorkspace(ws as Workspace);
      setStep(1);
    } catch (e: any) { toast.error(e.message || t('createWorkspaceError')); }
    finally { setBusy(false); }
  };

  // STEP 2 — send invitations (optional)
  const sendInvites = async () => {
    if (!workspace || !profile) return;
    const emails = invites.map((e) => e.trim()).filter((e) => e.includes('@'));
    setBusy(true);
    try {
      if (emails.length) {
        const rows = emails.map((email) => ({ workspace_id: workspace.id, email, role: 'member' as const, invited_by: profile.id }));
        const { data, error } = await supabase.from('workspace_invitations').insert(rows).select('token');
        if (error) throw error;
        // fire-and-forget emails via Resend
        fetch('/api/invitations/send', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            workspaceName: workspace.name,
            inviterName: profile.full_name || profile.email,
            invitations: emails.map((email, i) => ({ email, token: (data as any[])?.[i]?.token })),
          }),
        }).catch(() => {});
        toast.success(t('invitesSentToast').replace('{count}', String(emails.length)));
      }
      setStep(2);
    } catch (e: any) { toast.error(e.message || t('sendInvitesError')); }
    finally { setBusy(false); }
  };

  // STEP 3 — create project
  const createProject = async () => {
    if (!projName.trim() || !workspace || !profile) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.from('projects').insert({
        workspace_id: workspace.id, name: projName, color: '#6366f1', status: 'active', created_by: profile.id,
      }).select().single();
      if (error) throw error;
      setProject(data as Project);
      setStep(3);
    } catch (e: any) { toast.error(e.message || t('createProjectError')); }
    finally { setBusy(false); }
  };

  // STEP 4 — create task
  const createTask = async () => {
    if (!project || !workspace || !profile) return;
    setBusy(true);
    try {
      if (taskTitle.trim()) {
        const { error } = await supabase.from('tasks').insert({
          workspace_id: workspace.id, project_id: project.id, title: taskTitle, status: taskDefaultStatus, priority: 'medium', created_by: profile.id,
        });
        if (error) throw error;
      }
      setStep(4);
    } catch (e: any) { toast.error(e.message || t('createTaskError')); }
    finally { setBusy(false); }
  };

  // "Join a workspace" path — accepts either a bare invite token or a full
  // invite link (https://.../invite/<token>); extracts the token and reuses
  // the same accept_invitation() RPC the /invite/[token] page uses.
  const handleJoin = async () => {
    const raw = joinInput.trim();
    if (!raw) return;
    const token = raw.includes('/invite/') ? raw.split('/invite/').pop()!.split(/[?#]/)[0] : raw;
    setJoining(true);
    try {
      const { data, error } = await supabase.rpc('accept_invitation', { invite_token: token });
      if (error) throw error;
      const { data: ws } = await supabase.from('workspaces').select('slug').eq('id', data as string).single();
      toast.success(t('joinSuccessToast'));
      router.replace(ws?.slug ? `/${ws.slug}/dashboard` : '/dashboard');
    } catch (e: any) {
      toast.error(translateInviteError(e?.message || '', t));
    } finally {
      setJoining(false);
    }
  };

  const finish = () => { if (workspace) router.replace(`/${workspace.slug}/dashboard`); };

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:py-12 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,oklch(0.5_0.25_270/0.10),transparent_55%)]" />
      <LanguageSwitcher className="absolute right-4 top-4 sm:right-6 sm:top-6" />
      <div className="mx-auto w-full max-w-lg">
        {/* header + progress */}
        <div className="flex flex-col items-center text-center">
          <Logo height={30} priority />
          {mode === 'create' && (
            <>
              <div className="mt-8 flex w-full items-center gap-1.5">
                {STEPS.map((_, i) => (
                  <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <motion.div className="h-full gradient-brand" initial={false} animate={{ width: i <= step ? '100%' : '0%' }} transition={{ duration: 0.4 }} />
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                {t('progressStepLabel')
                  .replace('{current}', String(Math.min(step + 1, STEPS.length)))
                  .replace('{total}', String(STEPS.length))
                  .replace('{stepName}', STEPS[step])}
              </p>
            </>
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <AnimatePresence mode="wait">
            {/* CHOICE — no workspace yet */}
            {mode === 'choice' && (
              <Slide key="choice">
                <div className="mb-6 text-center">
                  <h2 className="font-display text-xl font-semibold tracking-tight">{t('choiceTitle')}</h2>
                  <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">
                    {t('choiceSubtitle')}
                  </p>
                </div>
                <div className="space-y-3">
                  <button
                    onClick={() => setMode('create')}
                    className="group flex w-full items-center gap-4 rounded-xl border border-border bg-background/50 p-4 text-left transition-all hover:border-primary/40 hover:bg-primary/5"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Layers className="h-5 w-5" />
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-bold text-foreground">{t('choiceCreateTitle')}</span>
                      <span className="block text-xs text-muted-foreground mt-0.5">{t('choiceCreateDesc')}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </button>
                  <button
                    onClick={() => setMode('join')}
                    className="group flex w-full items-center gap-4 rounded-xl border border-border bg-background/50 p-4 text-left transition-all hover:border-primary/40 hover:bg-primary/5"
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                      <Link2 className="h-5 w-5" />
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-bold text-foreground">{t('choiceJoinTitle')}</span>
                      <span className="block text-xs text-muted-foreground mt-0.5">{t('choiceJoinDesc')}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                  </button>
                </div>
              </Slide>
            )}

            {/* JOIN — paste invite link/token */}
            {mode === 'join' && (
              <Slide key="join">
                <button onClick={() => setMode('choice')} className="mb-4 -ml-1 flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground">
                  <ChevronLeft className="h-3.5 w-3.5" /> {t('backButtonLabel')}
                </button>
                <StepHead icon={Link2} title={t('joinTitle')} desc={t('joinDesc')} />
                <Input
                  autoFocus
                  value={joinInput}
                  onChange={(e) => setJoinInput(e.target.value)}
                  placeholder={t('joinInputPlaceholder')}
                  className="h-11"
                  onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                />
                <Button onClick={handleJoin} disabled={joining || !joinInput.trim()} className="mt-6 w-full h-11 gap-2">
                  {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} {t('joinButtonLabel')}
                </Button>
              </Slide>
            )}

            {/* STEP 1 */}
            {mode === 'create' && step === 0 && (
              <Slide key="s1">
                <StepHead icon={Sparkles} title={t('step1Title')} desc={t('step1Desc')} />
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('yourNameLabel')}</label>
                    <Input autoFocus value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t('namePlaceholder')} className="mt-1.5 h-11" />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t('workspaceNameLabel')}</label>
                    <Input value={wsName} onChange={(e) => setWsName(e.target.value)} placeholder={t('workspaceNamePlaceholder')} className="mt-1.5 h-11"
                      onKeyDown={(e) => e.key === 'Enter' && createWorkspace()} />
                  </div>
                </div>
                <Button onClick={createWorkspace} disabled={busy || !wsName.trim() || !fullName.trim()} className="mt-6 w-full h-11 gap-2">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} {t('continueButtonLabel')}
                </Button>
              </Slide>
            )}

            {/* STEP 2 */}
            {step === 1 && (
              <Slide key="s2">
                <StepHead icon={Users} title={t('step2Title')} desc={t('step2Desc')} />
                <div className="space-y-2">
                  {invites.map((val, i) => (
                    <div key={i} className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input value={val} onChange={(e) => setInvites((p) => p.map((x, idx) => idx === i ? e.target.value : x))}
                        placeholder={t('inviteEmailPlaceholder')} type="email" className="h-11 pl-9" />
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex gap-2">
                  <Button variant="ghost" onClick={() => setStep(2)} disabled={busy} className="flex-1">{t('skipButtonLabel')}</Button>
                  <Button onClick={sendInvites} disabled={busy} className="flex-1 gap-2">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} {t('continueButtonLabel')}
                  </Button>
                </div>
              </Slide>
            )}

            {/* STEP 3 */}
            {step === 2 && (
              <Slide key="s3">
                <StepHead icon={FolderKanban} title={t('step3Title')} desc={t('step3Desc')} />
                <Input autoFocus value={projName} onChange={(e) => setProjName(e.target.value)} placeholder={t('projectNamePlaceholder')} className="h-11"
                  onKeyDown={(e) => e.key === 'Enter' && createProject()} />
                <div className="mt-6 flex gap-2">
                  <Button variant="ghost" onClick={() => setStep(1)} disabled={busy} className="gap-1.5"><ArrowLeft className="h-4 w-4" /></Button>
                  <Button onClick={createProject} disabled={busy || !projName.trim()} className="flex-1 gap-2">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} {t('continueButtonLabel')}
                  </Button>
                </div>
              </Slide>
            )}

            {/* STEP 4 */}
            {step === 3 && (
              <Slide key="s4">
                <StepHead icon={CheckSquare} title={t('step4Title')} desc={t('step4Desc').replace('{projectName}', project?.name ?? '')} />
                <Input autoFocus value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder={t('taskTitlePlaceholder')} className="h-11"
                  onKeyDown={(e) => e.key === 'Enter' && createTask()} />
                <div className="mt-6 flex gap-2">
                  <Button variant="ghost" onClick={() => setStep(4)} disabled={busy} className="flex-1">{t('skipButtonLabel')}</Button>
                  <Button onClick={createTask} disabled={busy} className="flex-1 gap-2">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} {t('createAndContinueButtonLabel')}
                  </Button>
                </div>
              </Slide>
            )}

            {/* STEP 5 */}
            {step === 4 && (
              <Slide key="s5">
                <div className="text-center">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 12 }}
                    className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl gradient-brand text-white shadow-lg shadow-primary/30">
                    <PartyPopper className="h-8 w-8" />
                  </motion.div>
                  <h2 className="mt-5 font-display text-2xl font-semibold">{t('doneTitle')}</h2>
                  <p className="mt-2 text-sm text-muted-foreground">{t('doneSubtitle')}</p>
                  <div className="mt-6 space-y-2 text-left">
                    {[
                      { icon: FolderKanban, label: t('doneTipKanban') },
                      { icon: Users, label: t('doneTipInvite') },
                      { icon: CheckSquare, label: t('doneTipCalendar') },
                    ].map((x) => (
                      <div key={x.label} className="flex items-center gap-3 rounded-xl border border-border bg-background/50 p-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><x.icon className="h-4 w-4" /></span>
                        <span className="text-sm font-medium">{x.label}</span>
                        <Check className="ml-auto h-4 w-4 text-emerald-500" />
                      </div>
                    ))}
                  </div>
                  <Button onClick={finish} className="mt-6 w-full h-11 gap-2"><Rocket className="h-4 w-4" /> {t('openDashboardButton')}</Button>
                </div>
              </Slide>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function translateInviteError(message: string, t: (key: string) => string): string {
  if (message.includes('expired')) return t('inviteExpiredError');
  if (message.includes('already accepted')) return t('inviteAlreadyAcceptedError');
  if (message.includes('different email')) return t('inviteDifferentEmailError');
  if (message.includes('not found') || !message) return t('inviteNotFoundError');
  return message;
}

function Slide({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }}>
      {children}
    </motion.div>
  );
}

function StepHead({ icon: Icon, title, desc }: { icon: typeof Users; title: string; desc: string }) {
  return (
    <div className="mb-6">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
      <h2 className="mt-4 font-display text-xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}
