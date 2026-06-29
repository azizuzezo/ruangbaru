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
  FolderKanban, CheckSquare, Rocket, PartyPopper,
} from 'lucide-react';
import type { Workspace, Profile, Project } from '@/types';

const STEPS = ['Ruang Kerja', 'Undang Tim', 'Proyek', 'Tugas', 'Selesai'];

export default function WelcomeWizard() {
  const router = useRouter();
  const supabase = createClient();
  const { setCurrentWorkspace, setWorkspaces, setCurrentUser } = useWorkspaceStore();

  const [checking, setChecking] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  // collected data
  const [wsName, setWsName] = useState('');
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [invites, setInvites] = useState<string[]>(['', '', '']);
  const [projName, setProjName] = useState('');
  const [projIcon, setProjIcon] = useState('🚀');
  const [project, setProject] = useState<Project | null>(null);
  const [taskTitle, setTaskTitle] = useState('');

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
      const suggested = user.user_metadata?.workspace_name as string | undefined;
      if (suggested) setWsName(suggested);
      setChecking(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // STEP 1 — create workspace
  const createWorkspace = async () => {
    if (!wsName.trim() || !profile) return;
    setBusy(true);
    try {
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
    } catch (e: any) { toast.error(e.message || 'Gagal membuat ruang kerja'); }
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
        toast.success(`${emails.length} undangan terkirim`);
      }
      setStep(2);
    } catch (e: any) { toast.error(e.message || 'Gagal mengirim undangan'); }
    finally { setBusy(false); }
  };

  // STEP 3 — create project
  const createProject = async () => {
    if (!projName.trim() || !workspace || !profile) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.from('projects').insert({
        workspace_id: workspace.id, name: projName, icon: projIcon, color: '#6366f1', status: 'active', created_by: profile.id,
      }).select().single();
      if (error) throw error;
      setProject(data as Project);
      setStep(3);
    } catch (e: any) { toast.error(e.message || 'Gagal membuat proyek'); }
    finally { setBusy(false); }
  };

  // STEP 4 — create task
  const createTask = async () => {
    if (!project || !workspace || !profile) return;
    setBusy(true);
    try {
      if (taskTitle.trim()) {
        const { error } = await supabase.from('tasks').insert({
          workspace_id: workspace.id, project_id: project.id, title: taskTitle, status: 'todo', priority: 'medium', created_by: profile.id,
        });
        if (error) throw error;
      }
      setStep(4);
    } catch (e: any) { toast.error(e.message || 'Gagal membuat tugas'); }
    finally { setBusy(false); }
  };

  const finish = () => { if (workspace) router.replace(`/${workspace.slug}/dashboard`); };

  if (checking) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:py-12 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,oklch(0.5_0.25_270/0.10),transparent_55%)]" />
      <div className="mx-auto w-full max-w-lg">
        {/* header + progress */}
        <div className="flex flex-col items-center text-center">
          <Logo height={30} priority />
          <div className="mt-8 flex w-full items-center gap-1.5">
            {STEPS.map((_, i) => (
              <div key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <motion.div className="h-full gradient-brand" initial={false} animate={{ width: i <= step ? '100%' : '0%' }} transition={{ duration: 0.4 }} />
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Langkah {Math.min(step + 1, STEPS.length)} dari {STEPS.length} · {STEPS[step]}
          </p>
        </div>

        <div className="mt-6 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <AnimatePresence mode="wait">
            {/* STEP 1 */}
            {step === 0 && (
              <Slide key="s1">
                <StepHead icon={Sparkles} title={`Halo ${profile?.full_name?.split(' ')[0] || 'teman'}! 👋`} desc="Mari buat ruang kerja pertama untuk tim Anda. Bisa diubah nanti." />
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Nama Ruang Kerja</label>
                <Input autoFocus value={wsName} onChange={(e) => setWsName(e.target.value)} placeholder="cth. Agency HQ, Tim Marketing" className="mt-1.5 h-11"
                  onKeyDown={(e) => e.key === 'Enter' && createWorkspace()} />
                <Button onClick={createWorkspace} disabled={busy || !wsName.trim()} className="mt-6 w-full h-11 gap-2">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} Lanjut
                </Button>
              </Slide>
            )}

            {/* STEP 2 */}
            {step === 1 && (
              <Slide key="s2">
                <StepHead icon={Users} title="Undang tim Anda" desc="Tambahkan rekan kerja lewat email. Mereka akan menerima tautan undangan. Lewati jika ingin nanti." />
                <div className="space-y-2">
                  {invites.map((val, i) => (
                    <div key={i} className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input value={val} onChange={(e) => setInvites((p) => p.map((x, idx) => idx === i ? e.target.value : x))}
                        placeholder="rekan@perusahaan.com" type="email" className="h-11 pl-9" />
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex gap-2">
                  <Button variant="ghost" onClick={() => setStep(2)} disabled={busy} className="flex-1">Lewati</Button>
                  <Button onClick={sendInvites} disabled={busy} className="flex-1 gap-2">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} Lanjut
                  </Button>
                </div>
              </Slide>
            )}

            {/* STEP 3 */}
            {step === 2 && (
              <Slide key="s3">
                <StepHead icon={FolderKanban} title="Buat proyek pertama" desc="Proyek adalah wadah untuk tugas-tugas terkait." />
                <div className="flex gap-2">
                  <Input value={projIcon} onChange={(e) => setProjIcon(e.target.value)} className="h-11 w-14 text-center text-lg" />
                  <Input autoFocus value={projName} onChange={(e) => setProjName(e.target.value)} placeholder="cth. Peluncuran Website" className="h-11 flex-1"
                    onKeyDown={(e) => e.key === 'Enter' && createProject()} />
                </div>
                <div className="mt-6 flex gap-2">
                  <Button variant="ghost" onClick={() => setStep(1)} disabled={busy} className="gap-1.5"><ArrowLeft className="h-4 w-4" /></Button>
                  <Button onClick={createProject} disabled={busy || !projName.trim()} className="flex-1 gap-2">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} Lanjut
                  </Button>
                </div>
              </Slide>
            )}

            {/* STEP 4 */}
            {step === 3 && (
              <Slide key="s4">
                <StepHead icon={CheckSquare} title="Tambahkan tugas pertama" desc={`Apa hal pertama yang perlu dikerjakan di "${project?.name}"?`} />
                <Input autoFocus value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="cth. Susun brief & timeline" className="h-11"
                  onKeyDown={(e) => e.key === 'Enter' && createTask()} />
                <div className="mt-6 flex gap-2">
                  <Button variant="ghost" onClick={() => setStep(4)} disabled={busy} className="flex-1">Lewati</Button>
                  <Button onClick={createTask} disabled={busy} className="flex-1 gap-2">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Buat & Lanjut
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
                  <h2 className="mt-5 font-display text-2xl font-extrabold">Semua siap! 🎉</h2>
                  <p className="mt-2 text-sm text-muted-foreground">Ruang kerja Anda sudah dikonfigurasi. Berikut yang bisa Anda lakukan selanjutnya:</p>
                  <div className="mt-6 space-y-2 text-left">
                    {[
                      { icon: FolderKanban, t: 'Atur tugas di papan Kanban' },
                      { icon: Users, t: 'Undang lebih banyak anggota tim' },
                      { icon: CheckSquare, t: 'Pantau tenggat di kalender' },
                    ].map((x) => (
                      <div key={x.t} className="flex items-center gap-3 rounded-xl border border-border bg-background/50 p-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary"><x.icon className="h-4 w-4" /></span>
                        <span className="text-sm font-medium">{x.t}</span>
                        <Check className="ml-auto h-4 w-4 text-emerald-500" />
                      </div>
                    ))}
                  </div>
                  <Button onClick={finish} className="mt-6 w-full h-11 gap-2"><Rocket className="h-4 w-4" /> Buka Dashboard</Button>
                </div>
              </Slide>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
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
      <h2 className="mt-4 font-display text-xl font-extrabold tracking-tight">{title}</h2>
      <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}
