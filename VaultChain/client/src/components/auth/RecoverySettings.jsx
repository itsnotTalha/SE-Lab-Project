import { useEffect, useRef, useState } from 'react';
import { Download, ShieldCheck } from 'lucide-react';
import Button from '../ui/Button';
import SectionCard from '../ui/SectionCard';
import { authService } from '../../services/authService';
import RecoveryFields from './RecoveryFields';
import '../../styles/recovery.css';

const empty = { question: '', answer: '', birthDate: '', currentPassword: '' };
export default function RecoverySettings() {
 const [settings, setSettings] = useState(null);
 const [values, setValues] = useState(empty);
 const [loading, setLoading] = useState(true);
 const [saving, setSaving] = useState(false);
 const [error, setError] = useState('');
 const [code, setCode] = useState('');
 const [saved, setSaved] = useState(false);
 const codeHeading = useRef(null);
 const inFlight = useRef(false);
 async function load() {
  setLoading(true); setError('');
  try { const data = await authService.getRecoverySettings(); setSettings(data); setValues({ ...empty, question: data.question }); }
  catch (err) { setError(err.message); }
  finally { setLoading(false); }
 }
 useEffect(() => { load(); }, []);
 useEffect(() => { if (code) codeHeading.current?.focus(); }, [code]);
 useEffect(() => {
  if (!code) return;
  const warn = (event) => { event.preventDefault(); event.returnValue = ''; };
  window.addEventListener('beforeunload', warn);
  return () => window.removeEventListener('beforeunload', warn);
 }, [code]);
 async function submit(event) {
  event.preventDefault();
  if (inFlight.current) return;
  inFlight.current = true; setSaving(true); setError('');
  try {
   const data = await authService.saveRecoverySettings(values);
   setSettings({ ...settings, enabled: true, question: data.question });
   setValues({ ...empty, question: data.question }); setSaved(false); setCode(data.recoveryCode);
  } catch (err) { setError(err.message); }
  finally { inFlight.current = false; setSaving(false); }
 }
 function download() {
  const url = URL.createObjectURL(new Blob([`VaultChain one-time recovery code\n\n${code}\n\nStore privately. Recovery also requires your username or email, selected security question and answer, and birth date. Never share this code.\n`], { type: 'text/plain' }));
  const link = document.createElement('a'); link.href = url; link.download = 'vaultchain-recovery-code.txt'; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
 }
 return <SectionCard className="recovery-settings" title="Account recovery" description="Prepare a way back into your account if you forget your password.">
  {loading ? <p role="status">Loading recovery settings…</p> : <>
   {error && <div className="error-banner" role="alert">{error}</div>}
   {!settings ? <Button onClick={load}>Retry loading</Button> : code ? <div className="recovery-code-card">
    <h3 ref={codeHeading} tabIndex={-1}>Save your one-time recovery code</h3>
    <p role="status">Recovery is enabled. This code is shown only once. Store it in a password manager or another private place before leaving this page.</p>
    <code data-testid="recovery-code">{code}</code>
    <Button type="button" icon={Download} onClick={download}>Download code</Button>
    <label className="recovery-acknowledgement"><input type="checkbox" checked={saved} onChange={(event) => setSaved(event.target.checked)}/> I have saved my recovery code securely.</label>
    <Button type="button" disabled={!saved} onClick={() => setCode('')}>Done</Button>
   </div> : <div className="recovery-settings__grid">
    <div className="recovery-explanation"><ShieldCheck size={28}/><h3>{settings.enabled ? 'Recovery is enabled' : 'Recovery is not set up'}</h3><p>Resetting your password requires your security answer, birth date, and a one-time recovery code.</p><p>Your answer and birth date stay private and cannot be viewed after saving.</p><p>{settings.enabled ? 'Saving new details replaces your previous recovery code.' : 'Save the code generated below. Without it, this recovery method cannot reset your password.'}</p></div>
    <form className="form-grid" onSubmit={submit} aria-busy={saving}>
     <RecoveryFields prefix="recovery" values={values} onChange={setValues} questions={settings.questions}/>
     <div className="field"><label htmlFor="recovery-current-password">Current password</label><input id="recovery-current-password" className="input" type="password" autoComplete="current-password" value={values.currentPassword} onChange={(event) => setValues({ ...values, currentPassword: event.target.value })} required/></div>
     <span className="field-hint" role="status">{saving ? 'Saving recovery details…' : ''}</span>
     <Button type="submit" icon={ShieldCheck} disabled={saving}>{saving ? 'Saving…' : settings.enabled ? 'Replace recovery details & code' : 'Set up account recovery'}</Button>
    </form>
   </div>}
  </>}
 </SectionCard>;
}
