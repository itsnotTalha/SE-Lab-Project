import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';

const pageStyles = {
	page: {
		minHeight: '100vh',
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'center',
		padding: '24px',
		background: 'linear-gradient(135deg, #0f172a 0%, #111827 55%, #1f2937 100%)',
		color: '#e5e7eb',
	},
	card: {
		width: '100%',
		maxWidth: '420px',
		padding: '32px',
		borderRadius: '20px',
		background: 'rgba(17, 24, 39, 0.9)',
		border: '1px solid rgba(148, 163, 184, 0.18)',
		boxShadow: '0 24px 80px rgba(0, 0, 0, 0.35)',
	},
	title: {
		margin: 0,
		fontSize: '2rem',
		fontWeight: 700,
	},
	form: {
		display: 'grid',
		gap: '14px',
		marginTop: '24px',
	},
	input: {
		width: '100%',
		padding: '14px 16px',
		borderRadius: '12px',
		border: '1px solid rgba(148, 163, 184, 0.2)',
		background: '#0f172a',
		color: '#e5e7eb',
		fontSize: '1rem',
	},
	button: {
		padding: '14px 16px',
		border: 'none',
		borderRadius: '12px',
		background: 'linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)',
		color: '#fff',
		fontSize: '1rem',
		fontWeight: 700,
		cursor: 'pointer',
	},
	error: {
		padding: '12px 14px',
		borderRadius: '10px',
		background: 'rgba(220, 38, 38, 0.12)',
		border: '1px solid rgba(220, 38, 38, 0.28)',
		color: '#fca5a5',
	},
	footer: {
		marginTop: '18px',
		fontSize: '0.95rem',
		color: '#94a3b8',
	},
};

export default function LoginPage() {
	const navigate = useNavigate();
	const { login } = useAuth();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	async function handleSubmit(event) {
		event.preventDefault();
		setLoading(true);
		setError('');

		try {
			await login({ email, password });
			navigate('/dashboard', { replace: true });
		} catch (submitError) {
			setError(submitError.message);
		} finally {
			setLoading(false);
		}
	}

	return (
		<div style={pageStyles.page}>
			<section style={pageStyles.card}>
				<h1 style={pageStyles.title}>Login</h1>
				<p style={{ marginTop: '10px', color: '#94a3b8' }}>Access your VaultChain dashboard.</p>

				<form onSubmit={handleSubmit} style={pageStyles.form}>
					<input
						type="email"
						placeholder="Email"
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						style={pageStyles.input}
						autoComplete="email"
					/>
					<input
						type="password"
						placeholder="Password"
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						style={pageStyles.input}
						autoComplete="current-password"
					/>
					{error ? <div style={pageStyles.error}>{error}</div> : null}
					<button type="submit" style={pageStyles.button} disabled={loading}>
						{loading ? 'Signing in...' : 'Login'}
					</button>
				</form>

				<div style={pageStyles.footer}>
					No account yet? <Link to="/register">Create one</Link>
				</div>
			</section>
		</div>
	);
}