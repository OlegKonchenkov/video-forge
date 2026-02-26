'use client';
import { useState } from 'react';
import { Save, Loader2, User, Bell, Shield, AlertTriangle } from 'lucide-react';

const SECTIONS = ['Profile', 'Notifications', 'Security', 'Danger Zone'];

export default function SettingsPage() {
  const [active, setActive] = useState('Profile');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Profile fields
  const [name, setName] = useState('Dev User');
  const [email] = useState('dev@videoforge.local');
  const [company, setCompany] = useState('');
  const [timezone, setTimezone] = useState('UTC');

  // Notification preferences
  const [notifRender, setNotifRender] = useState(true);
  const [notifMarketing, setNotifMarketing] = useState(false);
  const [notifProduct, setNotifProduct] = useState(true);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await new Promise(r => setTimeout(r, 800)); // Simulate save
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="p-8 max-w-4xl">

      {/* Header */}
      <div className="mb-8 border-b border-film-border pb-6">
        <span className="section-label mb-2 block">Account</span>
        <h1 className="font-display text-4xl tracking-wider text-film-cream">SETTINGS</h1>
        <p className="text-film-gray font-sans text-sm mt-1">Manage your account preferences</p>
      </div>

      <div className="flex gap-8">

        {/* Sidebar nav */}
        <nav className="w-44 flex-shrink-0 space-y-0.5">
          {SECTIONS.map(s => (
            <button
              key={s}
              onClick={() => setActive(s)}
              className={`w-full text-left flex items-center gap-2 px-3 py-2.5 text-sm font-sans font-medium border-l-2 transition-all ${
                active === s
                  ? 'border-film-amber text-film-amber bg-film-warm'
                  : 'border-transparent text-film-gray hover:text-film-cream hover:bg-film-warm/60'
              }`}
            >
              {s === 'Profile' && <User className="w-3.5 h-3.5" />}
              {s === 'Notifications' && <Bell className="w-3.5 h-3.5" />}
              {s === 'Security' && <Shield className="w-3.5 h-3.5" />}
              {s === 'Danger Zone' && <AlertTriangle className="w-3.5 h-3.5" />}
              {s}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="flex-1">

          {/* Profile */}
          {active === 'Profile' && (
            <form onSubmit={handleSave} className="film-card p-8 space-y-6">
              <h2 className="font-display text-2xl tracking-wider text-film-cream">PROFILE</h2>

              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-sans font-semibold tracking-widest uppercase text-film-gray-light mb-2">
                    Full Name
                  </label>
                  <input
                    value={name} onChange={e => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-film-warm border border-film-border text-film-cream placeholder-film-gray font-sans text-sm focus:outline-none focus:border-film-amber/60 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-sans font-semibold tracking-widest uppercase text-film-gray-light mb-2">
                    Email
                  </label>
                  <input
                    value={email} disabled
                    className="w-full px-4 py-3 bg-film-warm/50 border border-film-border text-film-gray font-sans text-sm cursor-not-allowed"
                  />
                  <p className="text-[0.65rem] text-film-gray font-sans mt-1">Contact support to change email</p>
                </div>
                <div>
                  <label className="block text-xs font-sans font-semibold tracking-widest uppercase text-film-gray-light mb-2">
                    Company
                  </label>
                  <input
                    value={company} onChange={e => setCompany(e.target.value)}
                    placeholder="Acme Corp"
                    className="w-full px-4 py-3 bg-film-warm border border-film-border text-film-cream placeholder-film-gray font-sans text-sm focus:outline-none focus:border-film-amber/60 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-sans font-semibold tracking-widest uppercase text-film-gray-light mb-2">
                    Timezone
                  </label>
                  <select
                    value={timezone} onChange={e => setTimezone(e.target.value)}
                    className="w-full px-4 py-3 bg-film-warm border border-film-border text-film-cream font-sans text-sm focus:outline-none focus:border-film-amber/60 transition-colors"
                  >
                    {['UTC', 'America/New_York', 'America/Chicago', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Europe/Rome', 'Asia/Tokyo'].map(tz => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-4">
                <button type="submit" disabled={saving} className="btn-amber disabled:opacity-40">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
                {saved && <span className="text-film-amber font-sans text-xs tracking-wider">✓ Saved</span>}
              </div>
            </form>
          )}

          {/* Notifications */}
          {active === 'Notifications' && (
            <div className="film-card p-8 space-y-6">
              <h2 className="font-display text-2xl tracking-wider text-film-cream">NOTIFICATIONS</h2>

              {[
                { id: 'render', label: 'Video ready', desc: 'Get notified when your video finishes rendering', value: notifRender, set: setNotifRender },
                { id: 'product', label: 'Product updates', desc: 'New features, improvements, and release notes', value: notifProduct, set: setNotifProduct },
                { id: 'marketing', label: 'Marketing tips', desc: 'Best practices and video marketing advice', value: notifMarketing, set: setNotifMarketing },
              ].map(({ id, label, desc, value, set }) => (
                <div key={id} className="flex items-center justify-between py-4 border-b border-film-border last:border-0">
                  <div>
                    <p className="text-film-cream font-sans text-sm font-medium">{label}</p>
                    <p className="text-film-gray font-sans text-xs mt-0.5">{desc}</p>
                  </div>
                  <button
                    onClick={() => set(!value)}
                    className={`relative w-10 h-5 transition-colors ${value ? 'bg-film-amber' : 'bg-film-border'}`}
                    aria-pressed={value}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 bg-film-black transition-all ${value ? 'left-5' : 'left-0.5'}`}
                    />
                  </button>
                </div>
              ))}

              <button className="btn-amber" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Preferences
              </button>
            </div>
          )}

          {/* Security */}
          {active === 'Security' && (
            <div className="film-card p-8 space-y-6">
              <h2 className="font-display text-2xl tracking-wider text-film-cream">SECURITY</h2>

              <div className="space-y-5">
                <div>
                  <label className="block text-xs font-sans font-semibold tracking-widest uppercase text-film-gray-light mb-2">
                    New Password
                  </label>
                  <input
                    type="password" placeholder="Min 8 characters"
                    className="w-full px-4 py-3 bg-film-warm border border-film-border text-film-cream placeholder-film-gray font-sans text-sm focus:outline-none focus:border-film-amber/60 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-sans font-semibold tracking-widest uppercase text-film-gray-light mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password" placeholder="Repeat password"
                    className="w-full px-4 py-3 bg-film-warm border border-film-border text-film-cream placeholder-film-gray font-sans text-sm focus:outline-none focus:border-film-amber/60 transition-colors"
                  />
                </div>
                <button className="btn-amber">
                  <Save className="w-4 h-4" /> Update Password
                </button>
              </div>

              <div className="border-t border-film-border pt-6">
                <h3 className="font-display tracking-wider text-film-cream mb-3">ACTIVE SESSIONS</h3>
                <div className="film-card p-4 flex items-center justify-between">
                  <div>
                    <p className="text-film-cream font-sans text-sm">Current session</p>
                    <p className="text-film-gray font-sans text-xs mt-0.5">localhost:3000 · Just now</p>
                  </div>
                  <span className="px-2 py-0.5 text-[0.6rem] font-sans font-bold tracking-widest uppercase bg-film-amber/10 border border-film-amber/30 text-film-amber">
                    Active
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Danger Zone */}
          {active === 'Danger Zone' && (
            <div className="film-card border-red-900/40 p-8 space-y-6">
              <h2 className="font-display text-2xl tracking-wider text-red-400">DANGER ZONE</h2>

              <div className="space-y-4">
                <div className="p-5 border border-red-900/30 bg-red-950/20">
                  <h3 className="text-film-cream font-sans font-medium text-sm mb-1">Delete all videos</h3>
                  <p className="text-film-gray font-sans text-xs mb-4">Permanently delete all your generated videos and associated data. This action cannot be undone.</p>
                  <button className="btn-ghost border-red-900/40 text-red-400 hover:border-red-600/60 hover:text-red-300">
                    Delete All Videos
                  </button>
                </div>

                <div className="p-5 border border-red-900/30 bg-red-950/20">
                  <h3 className="text-film-cream font-sans font-medium text-sm mb-1">Close account</h3>
                  <p className="text-film-gray font-sans text-xs mb-4">Permanently delete your account and all data. Your subscription will be cancelled immediately with no refund.</p>
                  <button className="btn-ghost border-red-900/40 text-red-400 hover:border-red-600/60 hover:text-red-300">
                    Close Account
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
