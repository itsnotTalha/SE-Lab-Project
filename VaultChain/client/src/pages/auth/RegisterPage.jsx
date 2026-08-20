import { AlertCircle, ArrowLeft, Eye, EyeOff, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import AuthLayout from '../../layouts/AuthLayout';

export default function RegisterPage() {
	const navigate = useNavigate();
	const { register } = useAuth();
	const [fullName, setFullName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const strength = Math.min(4, Math.floor(password.length / 3));

	async function handleSubmit(event) {
		event.preventDefault();
		setError('');
		if (!fullName.trim() || !email.trim() || !password) { setError('Complete all fields to create your account.'); return; }
		if (password.length < 8) { setError('Password must be at least 8 characters long.'); return; }
		setLoading(true);
		try { await register({ fullName: fullName.trim(), email: email.trim(), password }); navigate('/dashboard', { replace: true }); }
		catch (submitError) { setError(submitError.message); }
		finally { setLoading(false); }
	}

	return (
		<AuthLayout mode="register">
			<header className="auth-card__header"><h2>Create your vault</h2><p>Start building a verifiable identity for your digital assets.</p></header>
			<form className="auth-form" onSubmit={handleSubmit} noValidate>
				<div className="field"><label htmlFor="register-name">Full name</label><input id="register-name" className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your full name" autoComplete="name" required /></div>
				<div className="field"><label htmlFor="register-email">Email address</label><input id="register-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required /></div>
				<div className="field"><label htmlFor="register-password">Password</label><div className="password-field"><input id="register-password" className="input" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password" required /><button type="button" className="password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div><div className="password-strength" aria-label="Password length indicator">{[1,2,3,4].map((n)=><span key={n} className={strength >= n ? 'is-active' : ''}/>)}</div></div>
				{error ? <div className="error-banner" role="alert"><AlertCircle size={16}/><span>{error}</span></div> : null}
				<Button type="submit" size="lg" icon={UserPlus} disabled={loading}>{loading ? 'Creating vault…' : 'Create secure account'}</Button>
			</form>
			<p className="auth-card__footer">Already have an account? <Link to="/login">Sign in</Link></p>
			<Link to="/" className="auth-back-link"><ArrowLeft size={14}/> Back to home</Link>
		</AuthLayout>
	);
}
