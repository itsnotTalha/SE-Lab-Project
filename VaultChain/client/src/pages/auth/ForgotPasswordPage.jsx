import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, KeyRound } from 'lucide-react';
import AuthLayout from '../../layouts/AuthLayout';
import Button from '../../components/ui/Button';
import RecoveryFields from '../../components/auth/RecoveryFields';
import { authService } from '../../services/authService';
import '../../styles/recovery.css';

export default function ForgotPasswordPage() {
 const [values, setValues] = useState({ identifier: '', question: '', answer: '', birthDate: '', recoveryCode: '', newPassword: '', confirmPassword: '' });
 const [questions, setQuestions] = useState([]);
 const [loading, setLoading] = useState(true);
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState('');
 const [success, setSuccess] = useState('');
 const heading = useRef(null);
 const inFlight = useRef(false);
 async function load() {
  setLoading(true); setError('');
  try { const data = await authService.getRecoveryQuestions(); setQuestions(data.questions); }
  catch (err) { setError(err.message); }
  finally { setLoading(false); }
 }
 useEffect(() => { load(); }, []);
 useEffect(() => { if (success) heading.current?.focus(); }, [success]);
 const field = (name) => ({ value: values[name], onChange: (event) => setValues({ ...values, [name]: event.target.value }) });
 async function submit(event) {
  event.preventDefault(); setError('');
  if (values.newPassword !== values.confirmPassword) { setError('New passwords do not match.'); return; }
  if (inFlight.current) return;
  inFlight.current = true; setBusy(true);
  try {
   const data = await authService.resetPassword(values);
   setValues({ identifier: '', question: '', answer: '', birthDate: '', recoveryCode: '', newPassword: '', confirmPassword: '' });
   setSuccess(data.message);
  } catch (err) { setError(err.message); }
  finally { inFlight.current = false; setBusy(false); }
 }
 return <AuthLayout mode="recovery">
  {success ? <div className="recovery-code-card">
   <CheckCircle2 size={36}/><h2 ref={heading} tabIndex={-1}>Password reset</h2><p role="status">{success}</p><p>All previous sessions have been signed out.</p><Link className="auth-back-link" to="/login">Return to sign in</Link>
  </div> : <>
   <header className="auth-card__header"><h2>Forgot password?</h2><p>Use the recovery details and code you saved in Profile.</p></header>
   {loading ? <p role="status">Loading recovery form…</p> : questions.length ? <form className="auth-form" onSubmit={submit} aria-busy={busy}>
    <div className="field"><label htmlFor="reset-identifier">Username or email</label><input id="reset-identifier" className="input" autoComplete="username" autoCapitalize="none" spellCheck={false} {...field('identifier')} required/></div>
    <RecoveryFields prefix="reset" values={values} onChange={setValues} questions={questions}/>
    <div className="field"><label htmlFor="reset-code">One-time recovery code</label><input id="reset-code" className="input" autoComplete="off" spellCheck={false} {...field('recoveryCode')} required/></div>
    <div className="field"><label htmlFor="reset-password">New password</label><input id="reset-password" className="input" type="password" autoComplete="new-password" minLength={8} maxLength={72} aria-describedby="reset-password-help" {...field('newPassword')} required/><span className="field-hint" id="reset-password-help">Use at least 8 characters (maximum 72 bytes).</span></div>
    <div className="field"><label htmlFor="reset-confirm">Confirm new password</label><input id="reset-confirm" className="input" type="password" autoComplete="new-password" minLength={8} maxLength={72} {...field('confirmPassword')} required/></div>
    {error && <div className="error-banner" role="alert">{error}</div>}
    <span className="field-hint" role="status">{busy ? 'Verifying recovery details and resetting your password…' : ''}</span>
    <Button type="submit" icon={KeyRound} disabled={busy}>{busy ? 'Resetting…' : 'Reset password'}</Button>
   </form> : <><div className="error-banner" role="alert">{error}</div><Button onClick={load}>Retry loading</Button></>}
   <p className="auth-card__footer">Recovery must be set up before you forget your password. If you are still signed in, configure it in Profile.</p>
   <Link to="/login" className="auth-back-link"><ArrowLeft size={14}/> Back to sign in</Link>
  </>}
 </AuthLayout>;
}
