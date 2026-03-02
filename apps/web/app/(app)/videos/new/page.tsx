'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Globe, FileText, Presentation, MessageSquare, ArrowRight, ArrowLeft, Loader2, Upload } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

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

const STEP_LABELS = ['Input Type', 'Your Content', 'Review'];

export default function NewVideoPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [inputType, setInputType] = useState<string>('');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [url, setUrl] = useState('');
  const [prompt, setPrompt] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    setLoading(true); setError('');
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      let inputData: Record<string, string> = {};
      let uploadedFileName: string | undefined;

      if (file && (inputType === 'pdf' || inputType === 'ppt')) {
        const ext = file.name.split('.').pop();
        const path = `${user!.id}/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from('uploads').upload(path, file);
        if (upErr) throw new Error('File upload failed: ' + upErr.message);
        uploadedFileName = path;
        inputData = { fileName: uploadedFileName };
      } else if (inputType === 'url') {
        inputData = { url };
      } else {
        inputData = { text: prompt };
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
        body: JSON.stringify({ videoId: video.id, userId: user!.id, inputType, inputData, aspectRatio }),
      });

      if (!res.ok) {
        // Clean up the orphaned video record before surfacing the error
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
          const s = i + 1;
          const active = s === step;
          const done = s < step;
          return (
            <div key={s} className="flex items-center">
              <div className={`flex items-center gap-2 px-3 py-1.5 border transition-colors ${
                active
                  ? 'border-film-amber bg-film-amber/10 text-film-amber'
                  : done
                  ? 'border-film-amber/40 text-film-amber/60'
                  : 'border-film-border text-film-gray'
              }`}>
                <span className={`font-display text-sm tracking-wider ${active ? 'text-film-amber' : done ? 'text-film-amber/60' : 'text-film-gray'}`}>
                  {String(s).padStart(2, '0')}
                </span>
                <span className="font-sans text-xs tracking-widest uppercase">{label}</span>
              </div>
              {s < 3 && (
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

      {/* Step 1: Input type */}
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

      {/* Step 2: Content */}
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
                  {/* Mini canvas preview */}
                  <div className="flex-shrink-0 flex items-center justify-center" style={{ width: 40, height: 40 }}>
                    {opt.id === '16:9' ? (
                      <div className={`border-2 ${aspectRatio === opt.id ? 'border-film-amber' : 'border-film-gray'}`}
                        style={{ width: 36, height: 20 }} />
                    ) : (
                      <div className={`border-2 ${aspectRatio === opt.id ? 'border-film-amber' : 'border-film-gray'}`}
                        style={{ width: 20, height: 36 }} />
                    )}
                  </div>
                  <div>
                    <div className={`font-display tracking-wider text-sm ${aspectRatio === opt.id ? 'text-film-amber' : 'text-film-cream'}`}>
                      {opt.label}
                    </div>
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

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setStep(1)}
              className="btn-ghost"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="btn-amber"
            >
              Review <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Submit */}
      {step === 3 && (
        <div className="film-card p-8">
          <div className="flex items-center gap-3 mb-6">
            <span className="h-px w-6 bg-film-amber" />
            <span className="section-label">Ready to generate</span>
            <span className="h-px w-6 bg-film-amber" />
          </div>

          <div className="space-y-0 mb-8 border border-film-border">
            {[
              { label: 'Input Type',    value: inputTypes.find(t => t.id === inputType)?.label },
              { label: 'Aspect Ratio',  value: aspectRatioOptions.find(o => o.id === aspectRatio)?.sub + ' (' + aspectRatio + ')' },
              { label: 'Content',       value: url || file?.name || (prompt?.slice(0, 80) + (prompt?.length > 80 ? '…' : '')) || '—' },
              { label: 'Title',         value: title || 'Auto-generated' },
              { label: 'Credit Cost',   value: '1 credit' },
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
            <button onClick={() => setStep(2)} className="btn-ghost">
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
