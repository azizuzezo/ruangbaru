'use client';

import '@livekit/components-styles';
import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  LiveKitRoom, 
  RoomAudioRenderer, 
  useTracks, 
  useLocalParticipant, 
  VideoTrack 
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { 
  ArrowLeft, Loader2, Video, VideoOff, Settings, 
  Link2, PhoneOff, Mic, MicOff, ScreenShare, Pin, PinOff 
} from 'lucide-react';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
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
        style={{ '--lk-accent-bg': '#106CD8', '--lk-accent-fg': '#ffffff' } as React.CSSProperties}
        data-lk-theme="default"
      >
        <LiveKitRoom
          token={token}
          serverUrl={serverUrl}
          connect
          video={true}
          audio={true}
          onConnected={handleConnected}
          onDisconnected={handleLeave}
          style={{ height: '100%' }}
        >
          <CustomVideoConference />
          <RoomAudioRenderer />
        </LiveKitRoom>
      </div>
    </RoomShell>
  );
}

function CustomVideoConference() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );

  const { localParticipant } = useLocalParticipant();
  const [pinnedTrackKey, setPinnedTrackKey] = useState<string | null>(null);

  // Auto-pin screen share if available
  const screenShareTrack = tracks.find((t) => t.source === Track.Source.ScreenShare);
  const activePinnedTrack = tracks.find((t) => `${t.participant.sid}_${t.source}` === pinnedTrackKey) || screenShareTrack;

  // Filter out the pinned track from the grid/list
  const otherTracks = activePinnedTrack
    ? tracks.filter((t) => `${t.participant.sid}_${t.source}` !== `${activePinnedTrack.participant.sid}_${activePinnedTrack.source}`)
    : tracks;

  // Local media controls state
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  useEffect(() => {
    if (localParticipant) {
      setIsMuted(!localParticipant.isMicrophoneEnabled);
      setIsCamOff(!localParticipant.isCameraEnabled);
      setIsScreenSharing(localParticipant.isScreenShareEnabled);
    }
  }, [localParticipant]);

  const toggleMic = async () => {
    if (!localParticipant) return;
    const enabled = localParticipant.isMicrophoneEnabled;
    await localParticipant.setMicrophoneEnabled(!enabled);
    setIsMuted(enabled);
  };

  const toggleCam = async () => {
    if (!localParticipant) return;
    const enabled = localParticipant.isCameraEnabled;
    await localParticipant.setCameraEnabled(!enabled);
    setIsCamOff(enabled);
  };

  const toggleScreen = async () => {
    if (!localParticipant) return;
    const enabled = localParticipant.isScreenShareEnabled;
    try {
      await localParticipant.setScreenShareEnabled(!enabled);
      setIsScreenSharing(!enabled);
    } catch (err) {
      console.error('Failed to toggle screen share:', err);
    }
  };

  return (
    <div className="relative flex h-full w-full flex-col bg-neutral-950 p-3 justify-between">
      {/* Video Grid / Split View */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row gap-3">
        {activePinnedTrack ? (
          // Split Layout (Pinned / Screen Share active)
          <>
            {/* Pinned Video (Large) */}
            <div className="flex-1 min-w-0 h-full relative">
              <VideoTile
                track={activePinnedTrack}
                isPinned={true}
                onPinToggle={() => setPinnedTrackKey(null)}
              />
            </div>

            {/* Sidebar / Bottom strip for other participants */}
            <div className="w-full md:w-64 shrink-0 flex md:flex-col gap-3 overflow-x-auto md:overflow-x-visible md:overflow-y-auto max-h-[120px] md:max-h-none pb-2 md:pb-0">
              {otherTracks.map((t) => (
                <div key={`${t.participant.sid}_${t.source}`} className="w-40 h-24 md:w-full md:h-36 shrink-0">
                  <VideoTile
                    track={t}
                    isPinned={false}
                    onPinToggle={() => setPinnedTrackKey(`${t.participant.sid}_${t.source}`)}
                  />
                </div>
              ))}
            </div>
          </>
        ) : (
          // Grid Layout (No one pinned)
          <div className={cn(
            "grid w-full h-full gap-3",
            tracks.length === 1 ? "grid-cols-1 grid-rows-1" :
            tracks.length === 2 ? "grid-cols-1 md:grid-cols-2 grid-rows-2 md:grid-rows-1" :
            tracks.length <= 4 ? "grid-cols-2 grid-rows-2" :
            tracks.length <= 6 ? "grid-cols-2 md:grid-cols-3 grid-rows-3 md:grid-rows-2" :
            "grid-cols-3 grid-rows-3"
          )}>
            {tracks.map((t) => (
              <VideoTile
                key={`${t.participant.sid}_${t.source}`}
                track={t}
                isPinned={false}
                onPinToggle={() => setPinnedTrackKey(`${t.participant.sid}_${t.source}`)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Premium Custom Control Bar */}
      <div className="mt-3 flex justify-center items-center gap-3 bg-neutral-900/80 border border-neutral-800/40 backdrop-blur-md px-5 py-3 rounded-2xl mx-auto max-w-fit shadow-xl">
        <button
          onClick={toggleMic}
          aria-label={isMuted ? 'Nyalakan mikrofon' : 'Matikan mikrofon'}
          className={cn(
            "p-3 rounded-xl transition-all duration-200 active:scale-95",
            isMuted ? "bg-rose-500 text-white" : "bg-neutral-850 hover:bg-neutral-750 text-neutral-200"
          )}
        >
          {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
        </button>

        <button
          onClick={toggleCam}
          aria-label={isCamOff ? 'Nyalakan kamera' : 'Matikan kamera'}
          className={cn(
            "p-3 rounded-xl transition-all duration-200 active:scale-95",
            isCamOff ? "bg-rose-500 text-white" : "bg-neutral-850 hover:bg-neutral-750 text-neutral-200"
          )}
        >
          {isCamOff ? <VideoOff className="h-5 w-5" /> : <Video className="h-5 w-5" />}
        </button>

        <button
          onClick={toggleScreen}
          aria-label={isScreenSharing ? 'Hentikan berbagi layar' : 'Mulai berbagi layar'}
          className={cn(
            "p-3 rounded-xl transition-all duration-200 active:scale-95",
            isScreenSharing ? "bg-emerald-500 text-white animate-pulse" : "bg-neutral-850 hover:bg-neutral-750 text-neutral-200"
          )}
        >
          <ScreenShare className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

function VideoTile({ track, isPinned, onPinToggle }: { track: any; isPinned: boolean; onPinToggle: () => void }) {
  const isVideoEnabled = track.participant.isCameraEnabled || track.source === Track.Source.ScreenShare;
  const isAudioMuted = !track.participant.isMicrophoneEnabled;
  const initials = track.participant.identity.slice(0, 2).toUpperCase();

  return (
    <div className="relative w-full h-full bg-neutral-900 rounded-2xl overflow-hidden border border-neutral-850/60 group shadow-lg flex items-center justify-center">
      {isVideoEnabled ? (
        <VideoTrack trackRef={track} className="w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-neutral-800 to-neutral-950 text-white gap-3">
          <div className="relative flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 border border-primary/20 shadow-inner">
            <span className="text-sm font-bold tracking-wider text-primary">{initials}</span>
            {track.participant.isSpeaking && (
              <span className="absolute -inset-1 rounded-full border border-primary animate-ping opacity-60" />
            )}
          </div>
          <span className="text-[11px] font-semibold text-neutral-400">{track.participant.name || track.participant.identity}</span>
        </div>
      )}

      {/* Participant Name & Status Overlay */}
      <div className="absolute bottom-3 left-3 bg-neutral-950/60 border border-neutral-800/40 backdrop-blur-sm px-2.5 py-1 rounded-xl flex items-center gap-2 max-w-[calc(100%-2rem)]">
        <span className="text-[10px] font-bold text-white truncate">
          {track.participant.name || track.participant.identity}
          {track.source === Track.Source.ScreenShare && ' (Presentasi)'}
        </span>
        {isAudioMuted && (
          <MicOff className="h-3 w-3 text-rose-500 shrink-0" />
        )}
      </div>

      {/* Hover Pin Button */}
      <button
        onClick={onPinToggle}
        aria-label={isPinned ? 'Lepas pin video' : 'Pin video'}
        className={cn(
          "absolute top-3 right-3 p-2 rounded-xl border backdrop-blur-sm transition-all duration-200 active:scale-95",
          isPinned
            ? "bg-primary border-primary/40 text-white"
            : "bg-neutral-950/60 border-neutral-850/40 text-neutral-400 opacity-0 group-hover:opacity-100 hover:text-white hover:bg-neutral-900"
        )}
      >
        {isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

function RoomShell({ title, backHref, onLeave, onCopy, onEnd, children }: { title?: string; backHref: string; onLeave?: () => void; onCopy?: () => void; onEnd?: () => void; children: React.ReactNode }) {
  return (
    <div className="-mx-4 -my-6 flex h-[calc(100vh-4rem)] flex-col sm:-mx-6 lg:-mx-8">
      {/* Top bar */}
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
