'use client';

import '@livekit/components-styles';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { LiveKitRoom, VideoConference, RoomAudioRenderer } from '@livekit/components-react';
import { ArrowLeft, Loader2, Video, VideoOff, Settings, Link2, PhoneOff } from 'lucide-react';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { Meeting } from '@/types';

type State = 'loading' | 'ready' | 'not_configured' | 'error' | 'not_found';

export default function MeetingRoomPage() {
  const params = useParams<{ workspace: string; meetingId: string }>();
  const router = useRouter();
  const { currentUser } = useWorkspaceStore();
  const supabase = createClient();

  const [state, setState] = useState<State>('loading');
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [token, setToken] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  const joinedRef = useRef(false);

  const backHref = `/${params.workspace}/meetings`;

  useEffect(() => {
    let cancelled = false;
    async function init() {
      // 1. Load the meeting.
      const { data: m } = await supabase.from('meetings').select('*').eq('id', params.meetingId).single();
      if (cancelled) return;
      if (!m) { setState('not_found'); return; }
      setMeeting(m as Meeting);

      // 2. Get a LiveKit token (server verifies auth + membership).
      try {
        const res = await fetch('/api/meetings/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room: (m as Meeting).room_name }),
        });
        if (cancelled) return;
        if (res.status === 503) { setState('not_configured'); return; }
        if (!res.ok) { setState('error'); return; }
        const data = await res.json();
        setToken(data.token);
        setServerUrl(data.url);
        setState('ready');
      } catch {
        if (!cancelled) setState('error');
      }
    }
    init();
    return () => { cancelled = true; };
  }, [params.meetingId]);

  // Presence: mark joined + set meeting live.
  const handleConnected = async () => {
    if (joinedRef.current || !meeting || !currentUser) return;
    joinedRef.current = true;
    const now = new Date().toISOString();
    await supabase.from('meeting_participants').upsert(
      { meeting_id: meeting.id, user_id: currentUser.id, joined_at: now, left_at: null },
      { onConflict: 'meeting_id,user_id' },
    );
    await supabase.from('meetings').update({ status: 'live', started_at: meeting.started_at || now }).eq('id', meeting.id);
  };

  const handleLeave = async () => {
    if (meeting && currentUser) {
      await supabase.from('meeting_participants').update({ left_at: new Date().toISOString() }).eq('meeting_id', meeting.id).eq('user_id', currentUser.id);
    }
    router.push(backHref);
  };

  const handleEnd = async () => {
    if (!meeting) return;
    try {
      const res = await fetch('/api/meetings/end', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId: meeting.id }),
      });
      if (!res.ok) throw new Error();
      toast.success('Rapat diakhiri untuk semua peserta.');
    } catch {
      toast.error('Gagal mengakhiri rapat.');
    }
    router.push(backHref);
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Tautan rapat disalin — bagikan untuk mengundang.');
    } catch {
      toast.error('Tidak dapat menyalin tautan.');
    }
  };

  const isHost = !!(meeting && currentUser && meeting.created_by === currentUser.id);

  // ── Non-room states ───────────────────────────────────────────────────────
  if (state === 'loading') {
    return (
      <RoomShell title={meeting?.title} backHref={backHref}>
        <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm">Menyiapkan rapat…</p>
        </div>
      </RoomShell>
    );
  }

  if (state === 'not_found') {
    return (
      <RoomShell title="Rapat tidak ditemukan" backHref={backHref}>
        <CenterCard icon={<VideoOff className="h-7 w-7" />} title="Rapat tidak ditemukan" desc="Rapat ini mungkin sudah dihapus atau Anda tidak memiliki akses.">
          <Link href={backHref}><Button variant="outline" size="sm">Kembali ke daftar rapat</Button></Link>
        </CenterCard>
      </RoomShell>
    );
  }

  if (state === 'not_configured') {
    return (
      <RoomShell title={meeting?.title} backHref={backHref}>
        <CenterCard icon={<Settings className="h-7 w-7" />} title="Rapat belum diaktifkan"
          desc="Fitur rapat memerlukan kunci LiveKit. Admin perlu menambahkan LIVEKIT_API_SECRET di environment server, lalu memulai ulang aplikasi.">
          <Link href={backHref}><Button variant="outline" size="sm">Kembali</Button></Link>
        </CenterCard>
      </RoomShell>
    );
  }

  if (state === 'error') {
    return (
      <RoomShell title={meeting?.title} backHref={backHref}>
        <CenterCard icon={<VideoOff className="h-7 w-7" />} title="Tidak dapat bergabung" desc="Terjadi kendala saat menyiapkan rapat. Coba muat ulang halaman.">
          <Button variant="outline" size="sm" onClick={() => location.reload()}>Coba lagi</Button>
        </CenterCard>
      </RoomShell>
    );
  }

  // ── Live room ─────────────────────────────────────────────────────────────
  return (
    <RoomShell title={meeting?.title} backHref={backHref} onLeave={handleLeave} onCopy={copyLink} onEnd={isHost ? handleEnd : undefined}>
      <div
        className="h-full w-full overflow-hidden rounded-b-2xl"
        // Brand the LiveKit components.
        style={{ '--lk-accent-bg': '#106CD8', '--lk-accent-fg': '#ffffff' } as React.CSSProperties}
        data-lk-theme="default"
      >
        <LiveKitRoom
          token={token}
          serverUrl={serverUrl}
          connect
          video
          audio
          onConnected={handleConnected}
          onDisconnected={handleLeave}
          style={{ height: '100%' }}
        >
          <VideoConference />
          <RoomAudioRenderer />
        </LiveKitRoom>
      </div>
    </RoomShell>
  );
}

function RoomShell({ title, backHref, onLeave, onCopy, onEnd, children }: { title?: string; backHref: string; onLeave?: () => void; onCopy?: () => void; onEnd?: () => void; children: React.ReactNode }) {
  return (
    <div className="-mx-4 -my-6 flex h-[calc(100vh-4rem)] flex-col sm:-mx-6 lg:-mx-8">
      {/* Top bar (RuangBaru chrome — no external branding) */}
      <div className="flex items-center justify-between gap-2 border-b border-border bg-card px-4 py-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <Link href={backHref} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-2 min-w-0">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary"><Video className="h-3.5 w-3.5" /></span>
            <span className="truncate text-sm font-bold text-foreground">{title || 'Rapat'}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {onCopy && (
            <Button size="sm" variant="outline" onClick={onCopy} className="gap-1.5">
              <Link2 className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Salin tautan</span>
            </Button>
          )}
          {onLeave && (
            <Button size="sm" variant={onEnd ? 'outline' : 'destructive'} onClick={onLeave} className="gap-1.5">Keluar</Button>
          )}
          {onEnd && (
            <Button size="sm" variant="destructive" onClick={onEnd} className="gap-1.5">
              <PhoneOff className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Akhiri rapat</span>
            </Button>
          )}
        </div>
      </div>
      <div className="relative flex-1 bg-neutral-950">{children}</div>
    </div>
  );
}

function CenterCard({ icon, title, desc, children }: { icon: React.ReactNode; title: string; desc: string; children?: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">{icon}</div>
      <p className="mt-4 text-base font-bold text-foreground">{title}</p>
      <p className="mt-1.5 max-w-md text-sm text-muted-foreground">{desc}</p>
      <div className="mt-5">{children}</div>
    </div>
  );
}
