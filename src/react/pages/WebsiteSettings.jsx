import { useEffect, useState } from 'react';
import { Globe, Save } from 'lucide-react';
import { useSettings } from '../settings/SettingsProvider.jsx';
import { PageHead, ErrorNote, Spinner } from '../components/ui.jsx';
import { Notice } from '../components/forms.jsx';

export function WebsiteSettings() {
  const { settings, loading, error, save, reload } = useSettings();
  const saved = settings.enable_public_website === 'true';
  const [enabled, setEnabled] = useState(saved), [busy, setBusy] = useState(false), [failure, setFailure] = useState(null), [message, setMessage] = useState('');
  useEffect(() => { setEnabled(saved); }, [saved]);
  const submit = async event => {
    event.preventDefault(); setBusy(true); setFailure(null); setMessage('');
    try { await save({ enable_public_website: String(enabled) }); setMessage('Website settings saved.'); }
    catch (err) { setFailure(err); }
    finally { setBusy(false); }
  };
  return <div className="space-y-5">
    <PageHead title="Settings" subtitle="Choose how visitors enter your application." />
    <ErrorNote error={error || failure} />
    {error && <button className="btn-ghost mb-4" onClick={reload}>Reload settings</button>}
    {message && <Notice>{message}</Notice>}
    {loading ? <Spinner /> : <form className="card max-w-2xl space-y-5 p-5" onSubmit={submit}>
      <div className="flex items-start gap-3"><Globe size={21} className="mt-1 shrink-0 text-accent" aria-hidden="true" /><div>
        <label className="flex items-center gap-3 font-semibold"><input type="checkbox" className="h-4 w-4 accent-accent" checked={enabled} disabled={busy || !!error} onChange={event => { setEnabled(event.target.checked); setMessage(''); }} />Enable public website</label>
        <p className="mt-3 text-sm leading-relaxed text-mist-muted">When enabled, visitors see your public home page without signing in. When disabled, the home page opens the back office and visitors must sign in with an Admin account.</p>
        <p className="mt-2 text-xs text-mist-dim">Applies to this application in the current environment. Back office access always requires the Admin role.</p>
      </div></div>
      <div className="border-t border-ink-700 pt-4"><button className="btn-primary" type="submit" disabled={busy || !!error || enabled === saved}><Save size={15} />{busy ? 'Saving…' : 'Save changes'}</button></div>
    </form>}
  </div>;
}
