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

export default function NewVideoPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [inputType, setInputType] = useState<string>('');
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

      // Upload file to Supabase Storage if needed
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

      // Create video record
      const { data: video, error: dbErr } = await supabase
        .from('videos')
        .insert({ title: title || `Video ${new Date().toLocaleDateString()}`, input_type: inputType, input_data: inputData, user_id: user!.id })
        .select()
        .single();
      if (dbErr) throw new Error(dbErr.message);

      // Submit job to VPS worker API
      await fetch(`${process.env.NEXT_PUBLIC_WORKER_URL}/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.NEXT_PUBLIC_WORKER_API_KEY! },
        body: JSON.stringify({ videoId: video.id, userId: user!.id, inputType, inputData }),
      });

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
      <div className="mb-8">
        <h1 className="text-3xl font-black">Create New Video</h1>
        <div className="mt-4 flex items-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${s <= step ? 'bg-accent text-white' : 'bg-white/10 text-slate-500'}`}>{s}</div>
              {s < 3 && <div className={`w-16 h-px transition-all ${s < step ? 'bg-accent' : 'bg-white/10'}`} />}
            </div>
          ))}
          <span className="ml-2 text-sm text-slate-500">
            {step === 1 ? 'Input type' : step === 2 ? 'Your content' : 'Review'}
          </span>
        </div>
      </div>

      {error && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>}

      {/* Step 1: Input type */}
      {step === 1 && (
        <div className="grid grid-cols-2 gap-4">
          {inputTypes.map((t) => (
            <button key={t.id} onClick={() => { setInputType(t.id); setStep(2); }}
              className={`glass p-6 rounded-2xl text-left hover:border-accent/30 transition-all duration-200 hover:-translate-y-0.5 ${inputType === t.id ? 'border-accent/50 bg-accent/5' : ''}`}>
              <t.icon className="w-8 h-8 text-accent mb-3" />
              <div className="font-bold mb-1">{t.label}</div>
              <div className="text-sm text-slate-400">{t.desc}</div>
            </button>
          ))}
        </div>
      )}

      {/* Step 2: Content */}
      {step === 2 && (
        <div className="glass rounded-2xl p-8 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Video title (optional)</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="My Product Ad"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-accent/50 transition-colors" />
          </div>

          {inputType === 'url' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Website URL</label>
              <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://yourproduct.com"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-accent/50 transition-colors" />
            </div>
          )}

          {(inputType === 'pdf' || inputType === 'ppt') && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Upload {inputType.toUpperCase()}</label>
              <label className="flex flex-col items-center justify-center w-full h-32 rounded-xl border-2 border-dashed border-white/20 hover:border-accent/40 cursor-pointer transition-colors">
                <Upload className="w-8 h-8 text-slate-500 mb-2" />
                <span className="text-sm text-slate-400">{file ? file.name : 'Click to upload or drag & drop'}</span>
                <input type="file" className="hidden" accept={inputType === 'pdf' ? '.pdf' : '.ppt,.pptx'}
                  onChange={e => setFile(e.target.files?.[0] ?? null)} />
              </label>
            </div>
          )}

          {inputType === 'prompt' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Describe your product</label>
              <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={5}
                placeholder="We sell a SaaS platform that helps HR teams automate onboarding. Our main features are..."
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:border-accent/50 transition-colors resize-none" />
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={() => setStep(1)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button onClick={() => setStep(3)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent/10 border border-accent/20 text-accent hover:bg-accent/20 transition-colors">
              Review <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Submit */}
      {step === 3 && (
        <div className="glass rounded-2xl p-8">
          <h2 className="text-xl font-bold mb-6">Ready to generate</h2>
          <div className="space-y-3 mb-8">
            {[
              { label: 'Input type', value: inputTypes.find(t => t.id === inputType)?.label },
              { label: 'Content', value: url || (file?.name) || (prompt?.slice(0, 80) + (prompt?.length > 80 ? '...' : '')) || '—' },
              { label: 'Title', value: title || 'Auto-generated' },
              { label: 'Credit cost', value: '1 credit' },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between py-3 border-b border-white/5">
                <span className="text-slate-400 text-sm">{label}</span>
                <span className="text-sm font-medium">{value}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/10 text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <button onClick={handleSubmit} disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-accent to-cyan text-white font-bold hover:opacity-90 transition-all glow-blue disabled:opacity-50">
              {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Submitting...</> : <>Generate Video — 1 Credit <ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
