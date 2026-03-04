'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Globe, FileText, Presentation, MessageSquare,
  ArrowRight, ArrowLeft, Loader2, Upload, ImageIcon, X,
  Play, Square, ChevronDown,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// ─── Static data ─────────────────────────────────────────────────────────────

const inputTypes = [
  { id: 'url',    label: 'Website URL',    icon: Globe,         desc: 'We scrape and extract key messages' },
  { id: 'pdf',    label: 'PDF Document',   icon: FileText,      desc: 'Brochure, proposal, report, case study' },
  { id: 'ppt',    label: 'PowerPoint',     icon: Presentation,  desc: 'Upload your existing slide deck' },
  { id: 'prompt', label: 'Text Prompt',    icon: MessageSquare, desc: 'Describe your product in plain English' },
];

const aspectRatioOptions = [
  { id: '16:9', label: '16 : 9', sub: 'Landscape', hint: 'YouTube · LinkedIn' },
  { id: '9:16', label: '9 : 16', sub: 'Portrait',  hint: 'TikTok · Reels · Stories' },
] as const;

const STEP_LABELS = ['Input Type', 'Your Content', 'Settings', 'Review'];

// Curated voice list (preview_url populated from /api/voices on step load)
const CURATED_VOICES_DEFAULT: Voice[] = [
  { voice_id: 'onwK4e9ZLuTAKqWW03F9', name: 'Daniel',    preview_url: '' },
  { voice_id: '21m00Tcm4TlvDq8ikWAM', name: 'Rachel',    preview_url: '' },
  { voice_id: '2EiwWnXFnvU5JabPnv8n', name: 'Clyde',     preview_url: '' },
  { voice_id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi',      preview_url: '' },
  { voice_id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella',     preview_url: '' },
  { voice_id: 'ErXwobaYiN019PkySvjV', name: 'Antoni',    preview_url: '' },
  { voice_id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Elli',      preview_url: '' },
  { voice_id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Josh',      preview_url: '' },
  { voice_id: 'VR6AewLTigWG4xSOukaG', name: 'Arnold',    preview_url: '' },
  { voice_id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam',      preview_url: '' },
  { voice_id: 'yoZ06aMxZJJ28mfd3POQ', name: 'Sam',       preview_url: '' },
  { voice_id: 'XB0fDUnXU5powFXDhCwa', name: 'Charlotte', preview_url: '' },
];

const MUSIC_CATEGORIES = ['Corporate', 'Energetic', 'Cinematic', 'Calm', 'Upbeat'] as const;
type MusicCategory = typeof MUSIC_CATEGORIES[number];

const MUSIC_TRACKS: Record<MusicCategory, { id: string; label: string }[]> = {
  Corporate: [{ id: 'Song-3', label: 'Song 3' }, { id: 'Song-7', label: 'Song 7' }, { id: 'Song-11', label: 'Song 11' }],
  Energetic: [{ id: 'Song-1', label: 'Song 1' }, { id: 'Song-5', label: 'Song 5' }, { id: 'Song-14', label: 'Song 14' }],
  Cinematic: [{ id: 'Song-6', label: 'Song 6' }, { id: 'Song-9', label: 'Song 9' }, { id: 'Song-12', label: 'Song 12' }],
  Calm:      [{ id: 'Song-2', label: 'Song 2' }, { id: 'Song-8', label: 'Song 8' }, { id: 'Song-15', label: 'Song 15' }],
  Upbeat:    [{ id: 'Song-4', label: 'Song 4' }, { id: 'Song-10', label: 'Song 10' }, { id: 'Song-17', label: 'Song 17' }],
};

type Voice = { voice_id: string; name: string; preview_url: string };

// ─── Component ───────────────────────────────────────────────────────────────

export default function NewVideoPage() {
  const router   = useRouter();
  const resRef   = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Wizard state
  const [step, setStep]               = useState(1);
  const [inputType, setInputType]     = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [url, setUrl]                 = useState('');
  const [prompt, setPrompt]           = useState('');
  const [file, setFile]               = useState<File | null>(null);
  const [resources, setResources]     = useState<File[]>([]);
  const [title, setTitle]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState('');

  // Settings step state
  const [voiceMode, setVoiceMode]             = useState<'off' | 'auto' | 'choose'>('auto');
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>('');
  const [voices, setVoices]                   = useState<Voice[]>(CURATED_VOICES_DEFAULT);
  const [voicesLoading, setVoicesLoading]     = useState(false);
  const [playingId, setPlayingId]             = useState<string>('');  // id of currently previewing item
  const [musicCategory, setMusicCategory]     = useState<MusicCategory | ''>('');  // '' = Auto
  const [selectedMusicId, setSelectedMusicId] = useState<string>('auto');

  // ── Audio preview helpers ──────────────────────────────────────────────────

  function stopAudio() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setPlayingId('');
  }

  function playPreview(id: string, previewUrl: string) {
    if (playingId === id) { stopAudio(); return; }
    stopAudio();
    const audio = new Audio(previewUrl);
    audioRef.current = audio;
    audio.play();
    setPlayingId(id);
    audio.onended = () => setPlayingId('');
  }

  async function loadAllVoices() {
    setVoicesLoading(true);
    try {
      const res = await fetch('/api/voices?curated=false');
      if (res.ok) setVoices(await res.json());
    } finally {
      setVoicesLoading(false);
    }
  }

  // Fetch preview URLs for the curated list when entering Settings step
  async function loadCuratedPreviews() {
    if (voices[0]?.preview_url) return; // already loaded
    try {
      const res = await fetch('/api/voices?curated=true');
      if (res.ok) setVoices(await res.json());
    } catch { /* silent — voices remain without preview_url */ }
  }

  // ── Resource upload helpers ────────────────────────────────────────────────

  function addResources(files: FileList | null) {
    if (!files) return;
    const allowed = Array.from(files).filter(f =>
      f.type.startsWith('image/') || f.type.startsWith('video/')
    );
    setResources(prev => [...prev, ...allowed].slice(0, 8));
  }

  function removeResource(idx: number) {
    setResources(prev => prev.filter((_, i) => i !== idx));
  }

  // ── Resolved voiceId for the worker ───────────────────────────────────────

  function resolvedVoiceId(): string | null {
    if (voiceMode === 'off')  return null;
    if (voiceMode === 'auto') return 'auto';
    return selectedVoiceId || 'auto';
  }

  // ── Submit ─────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    setLoading(true); setError('');
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      let inputData: Record<string, string> = {};

      if (file && (inputType === 'pdf' || inputType === 'ppt')) {
        const ext        = file.name.split('.').pop();
        const uploadPath = `${user!.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('uploads').upload(uploadPath, file);
        if (upErr) throw new Error('File upload failed: ' + upErr.message);
        inputData = { fileName: uploadPath };
      } else if (inputType === 'url') {
        inputData = { url };
      } else {
        inputData = { text: prompt };
      }

      // Upload user resource images/videos to Supabase Storage
      const resourcePaths: string[] = [];
      for (const resFile of resources) {
        const ext   = resFile.name.split('.').pop();
        const rPath = `${user!.id}/resources/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: rErr } = await supabase.storage.from('uploads').upload(rPath, resFile);
        if (!rErr) resourcePaths.push(rPath);
      }

      const { data: video, error: dbErr } = await supabase
        .from('videos')
        .insert({ title: title || `Video ${new Date().toLocaleDateString()}`, input_type: inputType, input_data: inputData, user_id: user!.id })
        .select()
        .single();
      if (dbErr) throw new Error(dbErr.message);

      const res = await fetch(`${process.env.NEXT_PUBLIC_WORKER_URL}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.NEXT_PUBLIC_WORKER_API_KEY! },
        body: JSON.stringify({
          videoId: video.id,
          userId:  user!.id,
          inputType,
          inputData,
          aspectRatio,
          resourcePaths,
          voiceId: resolvedVoiceId(),
          musicId: selectedMusicId,
        }),
      });

      if (!res.ok) {
        await supabase.from('videos').delete().eq('id', video.id);
        const body = await res.json().catch(() => ({}));
        throw new Error(
          res.status === 402
            ? 'Insufficient credits. Please upgrade your plan.'
            : body.error ?? `Worker error (${res.status})`
        );
      }

      router.push(`/videos/${video.id}`);
    } catch (e: unknown) {
      const err = e as Error;
      setError(err.message);
      setLoading(false);
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-8 max-w-3xl">

      {/* Header */}
      <div className="mb-8 border-b border-film-border pb-6">
        <span className="section-label mb-2 block">Production</span>
        <h1 className="font-display text-4xl tracking-wider text-film-cream">CREATE NEW VIDEO</h1>
        <p className="text-film-gray font-sans text-sm mt-1">Generate an AI-powered ad from your content</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-8">
        {STEP_LABELS.map((label, i) => {
          const s      = i + 1;
          const active = s === step;
          const done   = s < step;
          return (
            <div key={s} className="flex items-center">
              <div className={`flex items-center gap-2 px-3 py-1.5 border transition-colors ${
                active ? 'border-film-amber bg-film-amber/10 text-film-amber'
                       : done  ? 'border-film-amber/40 text-film-amber/60'
                               : 'border-film-border text-film-gray'
              }`}>
                <span className={`font-display text-sm tracking-wider ${active ? 'text-film-amber' : done ? 'text-film-amber/60' : 'text-film-gray'}`}>
                  {String(s).padStart(2, '0')}
                </span>
                <span className="font-sans text-xs tracking-widest uppercase">{label}</span>
              </div>
              {s < STEP_LABELS.length && (
                <div className={`w-8 h-px ${s < step ? 'bg-film-amber/40' : 'bg-film-border'}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-3 border border-red-800/50 bg-red-950/30 text-red-400 text-sm font-sans">
          {error}
        </div>
      )}

      {/* ── Step 1: Input type ─────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="grid grid-cols-2 gap-4">
          {inputTypes.map((t) => (
            <button
              key={t.id}
              onClick={() => { setInputType(t.id); setStep(2); }}
              className={`film-card p-6 text-left transition-all duration-200 hover:-translate-y-0.5 group ${
                inputType === t.id ? 'border-film-amber/60' : 'hover:border-film-amber/30'
              }`}
            >
              <t.icon className={`w-7 h-7 mb-3 transition-colors ${inputType === t.id ? 'text-film-amber' : 'text-film-gray group-hover:text-film-amber/70'}`} />
              <div className="font-display tracking-wider text-film-cream text-sm mb-1">{t.label}</div>
              <div className="text-xs text-film-gray font-sans">{t.desc}</div>
            </button>
          ))}
        </div>
      )}

      {/* ── Step 2: Content ────────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="film-card p-8 space-y-6">

          {/* Aspect Ratio */}
          <div>
            <label className="block text-xs font-sans font-semibold tracking-widest uppercase text-film-gray-light mb-3">
              Aspect Ratio
            </label>
            <div className="grid grid-cols-2 gap-3">
              {aspectRatioOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setAspectRatio(opt.id)}
                  className={`flex items-center gap-4 p-4 border transition-all text-left ${
                    aspectRatio === opt.id
                      ? 'border-film-amber bg-film-amber/10'
                      : 'border-film-border hover:border-film-amber/30 bg-film-warm'
                  }`}
                >
                  <div className="flex-shrink-0 flex items-center justify-center" style={{ width: 40, height: 40 }}>
                    {opt.id === '16:9'
                      ? <div className={`border-2 ${aspectRatio === opt.id ? 'border-film-amber' : 'border-film-gray'}`} style={{ width: 36, height: 20 }} />
                      : <div className={`border-2 ${aspectRatio === opt.id ? 'border-film-amber' : 'border-film-gray'}`} style={{ width: 20, height: 36 }} />
                    }
                  </div>
                  <div>
                    <div className={`font-display tracking-wider text-sm ${aspectRatio === opt.id ? 'text-film-amber' : 'text-film-cream'}`}>{opt.label}</div>
                    <div className="text-xs text-film-gray font-sans">{opt.sub}</div>
                    <div className="text-xs text-film-gray/60 font-sans mt-0.5">{opt.hint}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Video title */}
          <div>
            <label className="block text-xs font-sans font-semibold tracking-widest uppercase text-film-gray-light mb-2">
              Video Title <span className="text-film-gray normal-case tracking-normal font-normal">(optional)</span>
            </label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="My Product Ad"
              className="w-full px-4 py-3 bg-film-warm border border-film-border text-film-cream placeholder-film-gray font-sans text-sm focus:outline-none focus:border-film-amber/60 transition-colors"
            />
          </div>

          {/* URL input */}
          {inputType === 'url' && (
            <div>
              <label className="block text-xs font-sans font-semibold tracking-widest uppercase text-film-gray-light mb-2">
                Website URL
              </label>
              <input
                value={url}
                onChange={e => setUrl(e.target.value)}
                placeholder="https://yourproduct.com"
                className="w-full px-4 py-3 bg-film-warm border border-film-border text-film-cream placeholder-film-gray font-sans text-sm focus:outline-none focus:border-film-amber/60 transition-colors"
              />
            </div>
          )}

          {/* File upload */}
          {(inputType === 'pdf' || inputType === 'ppt') && (
            <div>
              <label className="block text-xs font-sans font-semibold tracking-widest uppercase text-film-gray-light mb-2">
                Upload {inputType.toUpperCase()}
              </label>
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-film-border hover:border-film-amber/40 cursor-pointer transition-colors bg-film-warm">
                <Upload className="w-7 h-7 text-film-gray mb-2" />
                <span className="text-sm text-film-gray font-sans">
                  {file ? file.name : 'Click to upload or drag & drop'}
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept={inputType === 'pdf' ? '.pdf' : '.ppt,.pptx'}
                  onChange={e => setFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          )}

          {/* Text prompt */}
          {inputType === 'prompt' && (
            <div>
              <label className="block text-xs font-sans font-semibold tracking-widest uppercase text-film-gray-light mb-2">
                Describe Your Product
              </label>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                rows={5}
                placeholder="We sell a SaaS platform that helps HR teams automate onboarding. Our main features are..."
                className="w-full px-4 py-3 bg-film-warm border border-film-border text-film-cream placeholder-film-gray font-sans text-sm focus:outline-none focus:border-film-amber/60 transition-colors resize-none"
              />
            </div>
          )}

          {/* Resource upload */}
          <div>
            <label className="block text-xs font-sans font-semibold tracking-widest uppercase text-film-gray-light mb-1">
              Your Images &amp; Videos <span className="text-film-gray normal-case tracking-normal font-normal">(optional · max 8)</span>
            </label>
            <p className="text-xs text-film-gray/60 font-sans mb-3">
              Upload photos, product shots, or clips — they'll be used as scene backgrounds instead of AI-generated images.
            </p>

            {resources.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {resources.map((f, idx) => (
                  <div key={idx} className="relative group w-16 h-16 border border-film-border bg-film-warm flex items-center justify-center overflow-hidden">
                    {f.type.startsWith('image/')
                      ? <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-full object-cover" />
                      : <div className="flex flex-col items-center gap-1 p-1">
                          <ImageIcon className="w-4 h-4 text-film-gray" />
                          <span className="text-[9px] text-film-gray font-mono truncate w-full text-center">{f.name.slice(0, 8)}</span>
                        </div>
                    }
                    <button
                      onClick={() => removeResource(idx)}
                      className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-900/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-2.5 h-2.5 text-white" />
                    </button>
                  </div>
                ))}
                {resources.length < 8 && (
                  <button
                    onClick={() => resRef.current?.click()}
                    className="w-16 h-16 border border-dashed border-film-border bg-film-warm flex items-center justify-center text-film-gray hover:border-film-amber/40 hover:text-film-amber/70 transition-colors"
                  >
                    <Upload className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}

            {resources.length === 0 && (
              <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-film-border hover:border-film-amber/40 cursor-pointer transition-colors bg-film-warm">
                <ImageIcon className="w-6 h-6 text-film-gray mb-1.5" />
                <span className="text-xs text-film-gray font-sans">Click to add images or videos</span>
                <input ref={resRef} type="file" className="hidden" multiple accept="image/*,video/*" onChange={e => addResources(e.target.files)} />
              </label>
            )}
            <input ref={resRef} type="file" className="hidden" multiple accept="image/*,video/*" onChange={e => addResources(e.target.files)} />
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setStep(1)} className="btn-ghost">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button onClick={() => { setStep(3); loadCuratedPreviews(); }} className="btn-amber">
              Next: Settings <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Settings ───────────────────────────────────────────────── */}
      {step === 3 && (
        <div className="film-card p-8 space-y-8">

          {/* ── Voice section ────────────────────────────────────────────── */}
          <div>
            <label className="block text-xs font-sans font-semibold tracking-widest uppercase text-film-gray-light mb-4">
              Voiceover
            </label>

            {/* Mode toggle */}
            <div className="flex gap-2 mb-5">
              {(['off', 'auto', 'choose'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setVoiceMode(mode)}
                  className={`px-4 py-2 border text-xs font-sans tracking-widest uppercase transition-colors ${
                    voiceMode === mode
                      ? 'border-film-amber bg-film-amber/10 text-film-amber'
                      : 'border-film-border text-film-gray hover:border-film-amber/30'
                  }`}
                >
                  {mode === 'off' ? 'Off' : mode === 'auto' ? '✦ Auto' : 'Choose Voice'}
                </button>
              ))}
            </div>

            {voiceMode === 'off' && (
              <p className="text-xs text-film-gray/60 font-sans">No voiceover will be generated. Scenes use a fixed 6-second duration each.</p>
            )}

            {voiceMode === 'auto' && (
              <p className="text-xs text-film-gray/60 font-sans">AI picks the best voice based on your content language and tone.</p>
            )}

            {voiceMode === 'choose' && (
              <div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {voices.map((v) => (
                    <div
                      key={v.voice_id}
                      onClick={() => setSelectedVoiceId(v.voice_id)}
                      className={`border p-3 cursor-pointer transition-all ${
                        selectedVoiceId === v.voice_id
                          ? 'border-film-amber bg-film-amber/10'
                          : 'border-film-border bg-film-warm hover:border-film-amber/30'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`font-display tracking-wide text-sm ${selectedVoiceId === v.voice_id ? 'text-film-amber' : 'text-film-cream'}`}>
                          {v.name}
                        </span>
                        {v.preview_url && (
                          <button
                            onClick={e => { e.stopPropagation(); playPreview(v.voice_id, v.preview_url); }}
                            className="w-6 h-6 flex items-center justify-center text-film-gray hover:text-film-amber transition-colors"
                          >
                            {playingId === v.voice_id
                              ? <Square className="w-3 h-3" />
                              : <Play className="w-3 h-3" />}
                          </button>
                        )}
                      </div>
                      <div className={`w-full h-px ${selectedVoiceId === v.voice_id ? 'bg-film-amber/40' : 'bg-film-border'}`} />
                    </div>
                  ))}
                </div>

                <button
                  onClick={loadAllVoices}
                  disabled={voicesLoading}
                  className="flex items-center gap-2 text-xs text-film-gray hover:text-film-amber transition-colors font-sans tracking-widest uppercase"
                >
                  {voicesLoading
                    ? <><Loader2 className="w-3 h-3 animate-spin" /> Loading…</>
                    : <><ChevronDown className="w-3 h-3" /> Load all voices</>}
                </button>
              </div>
            )}
          </div>

          {/* ── Music section ────────────────────────────────────────────── */}
          <div>
            <label className="block text-xs font-sans font-semibold tracking-widest uppercase text-film-gray-light mb-4">
              Background Music
            </label>

            {/* Category tabs */}
            <div className="flex flex-wrap gap-2 mb-5">
              <button
                onClick={() => { setMusicCategory(''); setSelectedMusicId('auto'); stopAudio(); }}
                className={`px-4 py-2 border text-xs font-sans tracking-widest uppercase transition-colors ${
                  musicCategory === ''
                    ? 'border-film-amber bg-film-amber/10 text-film-amber'
                    : 'border-film-border text-film-gray hover:border-film-amber/30'
                }`}
              >
                ✦ Auto
              </button>
              {MUSIC_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => { setMusicCategory(cat); stopAudio(); }}
                  className={`px-4 py-2 border text-xs font-sans tracking-widest uppercase transition-colors ${
                    musicCategory === cat
                      ? 'border-film-amber bg-film-amber/10 text-film-amber'
                      : 'border-film-border text-film-gray hover:border-film-amber/30'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {musicCategory === '' && (
              <p className="text-xs text-film-gray/60 font-sans">AI picks the best music style for your content type.</p>
            )}

            {musicCategory !== '' && (
              <div className="grid grid-cols-2 gap-3">
                {MUSIC_TRACKS[musicCategory].map((track) => {
                  const previewUrl = `https://www.soundhelix.com/examples/mp3/SoundHelix-${track.id}.mp3`;
                  return (
                    <div
                      key={track.id}
                      onClick={() => setSelectedMusicId(track.id)}
                      className={`border p-3 cursor-pointer transition-all ${
                        selectedMusicId === track.id
                          ? 'border-film-amber bg-film-amber/10'
                          : 'border-film-border bg-film-warm hover:border-film-amber/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-display tracking-wide text-sm ${selectedMusicId === track.id ? 'text-film-amber' : 'text-film-cream'}`}>
                          {track.label}
                        </span>
                        <button
                          onClick={e => { e.stopPropagation(); playPreview(track.id, previewUrl); }}
                          className="w-6 h-6 flex items-center justify-center text-film-gray hover:text-film-amber transition-colors"
                        >
                          {playingId === track.id
                            ? <Square className="w-3 h-3" />
                            : <Play className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={() => { stopAudio(); setStep(2); }} className="btn-ghost">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button onClick={() => { stopAudio(); setStep(4); }} className="btn-amber">
              Review <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Review & Submit ────────────────────────────────────────── */}
      {step === 4 && (
        <div className="film-card p-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="h-px w-6 bg-film-amber" />
            <span className="section-label">Ready to generate</span>
            <span className="h-px w-6 bg-film-amber" />
          </div>

          <div className="space-y-0 mb-8 border border-film-border">
            {[
              { label: 'Input Type',   value: inputTypes.find(t => t.id === inputType)?.label },
              { label: 'Aspect Ratio', value: aspectRatioOptions.find(o => o.id === aspectRatio)?.sub + ' (' + aspectRatio + ')' },
              { label: 'Content',      value: url || file?.name || (prompt?.slice(0, 80) + (prompt?.length > 80 ? '…' : '')) || '—' },
              { label: 'Your Assets',  value: resources.length ? `${resources.length} file${resources.length > 1 ? 's' : ''} attached` : 'AI-generated' },
              {
                label: 'Voiceover',
                value: voiceMode === 'off'  ? 'Off'
                     : voiceMode === 'auto' ? 'Auto (AI picks)'
                     : voices.find(v => v.voice_id === selectedVoiceId)?.name ?? 'Auto',
              },
              {
                label: 'Music',
                value: selectedMusicId === 'auto'
                  ? 'Auto (AI picks)'
                  : `${musicCategory} — ${musicCategory ? MUSIC_TRACKS[musicCategory as MusicCategory]?.find(t => t.id === selectedMusicId)?.label ?? selectedMusicId : selectedMusicId}`,
              },
              { label: 'Title',       value: title || 'Auto-generated' },
              { label: 'Credit Cost', value: '1 credit' },
            ].map(({ label, value }, idx, arr) => (
              <div
                key={label}
                className={`flex items-center justify-between px-5 py-3 ${idx < arr.length - 1 ? 'border-b border-film-border' : ''}`}
              >
                <span className="text-film-gray text-xs font-sans font-semibold tracking-widest uppercase">{label}</span>
                <span className="text-film-cream text-sm font-sans">{value}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(3)} className="btn-ghost">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="btn-amber flex-1 justify-center disabled:opacity-40"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                : <>Generate Video — 1 Credit <ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
