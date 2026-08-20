import { AlertCircle, ArrowLeft, Eye, EyeOff, LogIn } from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import AuthLayout from '../../layouts/AuthLayout';

export default function LoginPage() {
	const navigate = useNavigate();
	const location = useLocation();
	const { login } = useAuth();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	async function handleSubmit(event) {
		event.preventDefault();
		setError('');
		if (!email.trim() || !password) { setError('Enter your email and password to continue.'); return; }
		setLoading(true);
		try {
			await login({ email: email.trim(), password });
			navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
		} catch (submitError) { setError(submitError.message); }
		finally { setLoading(false); }
	}

	return (
		<AuthLayout mode="login">
			<header className="auth-card__header"><h2>Welcome back</h2><p>Sign in to access your secure VaultChain workspace.</p></header>
			<form className="auth-form" onSubmit={handleSubmit} noValidate>
				<div className="field"><label htmlFor="login-email">Email address</label><input id="login-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required /></div>
				<div className="field"><label htmlFor="login-password">Password</label><div className="password-field"><input id="login-password" className="input" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" autoComplete="current-password" required /><button type="button" className="password-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17}/> : <Eye size={17}/>}</button></div></div>
				{error ? <div className="error-banner" role="alert"><AlertCircle size={16}/><span>{error}</span></div> : null}
				<Button type="submit" size="lg" icon={LogIn} disabled={loading}>{loading ? 'Signing in…' : 'Sign in securely'}</Button>
			</form>
			<p className="auth-card__footer">New to VaultChain? <Link to="/register">Create an account</Link></p>
			<Link to="/" className="auth-back-link"><ArrowLeft size={14}/> Back to home</Link>
		</AuthLayout>
	);
}
