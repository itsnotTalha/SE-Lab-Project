import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { API_BASE_URL } from '../../constants/api';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/authService';

const pageStyles = {
	page: {
		minHeight: '100vh',
		padding: '32px 24px 48px',
		background:
			'radial-gradient(circle at top left, rgba(59, 130, 246, 0.22), transparent 30%), radial-gradient(circle at top right, rgba(14, 165, 233, 0.18), transparent 24%), linear-gradient(135deg, #020617 0%, #0f172a 55%, #111827 100%)',
		color: '#e5e7eb',
	},
	container: {
		maxWidth: '1120px',
		margin: '0 auto',
	},
	header: {
		display: 'flex',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		gap: '16px',
		marginBottom: '24px',
	},
	headline: {
		margin: 0,
		fontSize: '2.35rem',
		fontWeight: 800,
		letterSpacing: '-0.03em',
	},
	subtitle: {
		margin: '10px 0 0',
		color: '#94a3b8',
		maxWidth: '720px',
		lineHeight: 1.6,
	},
	nav: {
		display: 'flex',
		gap: '10px',
		flexWrap: 'wrap',
	},
	navLink: {
		padding: '10px 14px',
		borderRadius: '999px',
		background: 'rgba(15, 23, 42, 0.72)',
		border: '1px solid rgba(148, 163, 184, 0.18)',
		color: '#e5e7eb',
		textDecoration: 'none',
		fontWeight: 600,
	},
	grid: {
		display: 'grid',
		gridTemplateColumns: 'minmax(0, 1.1fr) minmax(0, 0.9fr)',
		gap: '20px',
		alignItems: 'start',
	},
	card: {
		background: 'rgba(15, 23, 42, 0.82)',
		border: '1px solid rgba(148, 163, 184, 0.16)',
		borderRadius: '22px',
		boxShadow: '0 24px 80px rgba(0, 0, 0, 0.28)',
		backdropFilter: 'blur(14px)',
	},
	panel: {
		padding: '24px',
	},
	panelTitle: {
		margin: 0,
		fontSize: '1.15rem',
		fontWeight: 700,
	},
	panelText: {
		marginTop: '8px',
		marginBottom: 0,
		color: '#94a3b8',
		lineHeight: 1.6,
	},
	form: {
		display: 'grid',
		gap: '14px',
		marginTop: '20px',
	},
	fieldGrid: {
		display: 'grid',
		gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
		gap: '14px',
	},
	field: {
		display: 'grid',
		gap: '8px',
	},
	label: {
		fontSize: '0.92rem',
		fontWeight: 600,
		color: '#cbd5e1',
	},
	input: {
		width: '100%',
		padding: '13px 14px',
		borderRadius: '12px',
		border: '1px solid rgba(148, 163, 184, 0.18)',
		background: '#020617',
		color: '#e5e7eb',
		fontSize: '0.98rem',
	},
	textarea: {
		width: '100%',
		minHeight: '108px',
		padding: '13px 14px',
		borderRadius: '12px',
		border: '1px solid rgba(148, 163, 184, 0.18)',
		background: '#020617',
		color: '#e5e7eb',
		fontSize: '0.98rem',
		resize: 'vertical',
	},
	button: {
		display: 'inline-flex',
		alignItems: 'center',
		justifyContent: 'center',
		gap: '10px',
		padding: '13px 16px',
		border: 'none',
		borderRadius: '12px',
		background: 'linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)',
		color: '#fff',
		fontSize: '0.98rem',
		fontWeight: 700,
		cursor: 'pointer',
	},
	buttonSecondary: {
		padding: '11px 14px',
		borderRadius: '12px',
		border: '1px solid rgba(148, 163, 184, 0.24)',
		background: 'rgba(15, 23, 42, 0.55)',
		color: '#e5e7eb',
		fontWeight: 600,
		cursor: 'pointer',
	},
	error: {
		padding: '12px 14px',
		borderRadius: '12px',
		background: 'rgba(220, 38, 38, 0.12)',
		border: '1px solid rgba(220, 38, 38, 0.3)',
		color: '#fca5a5',
		whiteSpace: 'pre-wrap',
	},
	success: {
		padding: '12px 14px',
		borderRadius: '12px',
		background: 'rgba(34, 197, 94, 0.12)',
		border: '1px solid rgba(34, 197, 94, 0.28)',
		color: '#bbf7d0',
	},
	list: {
		display: 'grid',
		gap: '12px',
		marginTop: '18px',
	},
	item: {
		padding: '14px',
		borderRadius: '14px',
		background: 'rgba(2, 6, 23, 0.68)',
		border: '1px solid rgba(148, 163, 184, 0.12)',
	},
	itemLabel: {
		margin: 0,
		fontSize: '0.82rem',
		textTransform: 'uppercase',
		letterSpacing: '0.08em',
		color: '#94a3b8',
	},
	itemValue: {
		margin: '6px 0 0',
		fontSize: '0.96rem',
		wordBreak: 'break-word',
	},
	json: {
		marginTop: '16px',
		padding: '16px',
		borderRadius: '14px',
		background: '#020617',
		border: '1px solid rgba(148, 163, 184, 0.12)',
		color: '#cbd5e1',
		overflowX: 'auto',
		fontSize: '0.9rem',
		lineHeight: 1.6,
	},
	muted: {
		color: '#94a3b8',
	},
	stack: {
		display: 'grid',
		gap: '14px',
	},
};

function toPrettyJson(value) {
	if (value == null) {
		return '—';
	}

	return JSON.stringify(value, null, 2);
}

function getPixelCount(metadata) {
	if (!metadata) {
		return null;
	}

	const directPixelCount = metadata.pixelCount ?? metadata.pixel_count;
	if (directPixelCount != null) {
		return directPixelCount;
	}

	const width = metadata.width ?? metadata.metadataJson?.ImageWidth;
	const height = metadata.height ?? metadata.metadataJson?.ImageHeight;

	if (typeof width === 'number' && typeof height === 'number') {
		return width * height;
	}

	return null;
}

export default function DashboardPage() {
	const navigate = useNavigate();
	const { logout } = useAuth();
	const [title, setTitle] = useState('');
	const [category, setCategory] = useState('image');
	const [description, setDescription] = useState('');
	const [file, setFile] = useState(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const [result, setResult] = useState(null);
	const [metadataLookupId, setMetadataLookupId] = useState('');
	const [metadataLookup, setMetadataLookup] = useState(null);
	const [lookupLoading, setLookupLoading] = useState(false);
	const [lookupError, setLookupError] = useState('');
	const [hashLookupId, setHashLookupId] = useState('');
	const [hashLookup, setHashLookup] = useState(null);
	const [hashLookupLoading, setHashLookupLoading] = useState(false);
	const [hashLookupError, setHashLookupError] = useState('');

	async function fetchHashesByAssetId(assetId) {
		if (!assetId) {
			throw new Error('Enter an asset id to inspect hashes.');
		}

		const token = authService.getToken();
		const response = await fetch(`${API_BASE_URL}/assets/${assetId}/hash`, {
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		const data = await response.json();

		if (!response.ok) {
			throw new Error(data.message || 'Hash lookup failed');
		}

		return data.hashes;
	}

	function handleLogout() {
		logout();
		navigate('/login', { replace: true });
	}

	async function handleUpload(event) {
		event.preventDefault();
		setLoading(true);
		setError('');
		setResult(null);

		try {
			if (!file) {
				throw new Error('Please choose an image file to upload.');
			}

			const token = authService.getToken();
			const formData = new FormData();
			formData.append('title', title);
			formData.append('category', category);
			formData.append('description', description);
			formData.append('file', file);

			const response = await fetch(`${API_BASE_URL}/assets/upload`, {
				method: 'POST',
				headers: {
					Authorization: `Bearer ${token}`,
				},
				body: formData,
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || 'Upload failed');
			}

			setResult(data);
			const assetId = String(data.asset?.id || '');
			setMetadataLookupId(assetId);
			setHashLookupId(assetId);

			if (assetId) {
				try {
					const hashes = await fetchHashesByAssetId(assetId);
					setHashLookup(hashes);
				} catch (hashFetchError) {
					setHashLookupError(hashFetchError.message);
				}
			}
		} catch (submitError) {
			setError(submitError.message);
		} finally {
			setLoading(false);
		}
	}

	async function handleHashLookup(event) {
		event.preventDefault();
		setHashLookupLoading(true);
		setHashLookupError('');
		setHashLookup(null);

		try {
			if (!hashLookupId.trim()) {
				throw new Error('Enter an asset id to inspect hashes.');
			}

			const hashes = await fetchHashesByAssetId(hashLookupId.trim());
			setHashLookup(hashes);
		} catch (hashLookupSubmitError) {
			setHashLookupError(hashLookupSubmitError.message);
		} finally {
			setHashLookupLoading(false);
		}
	}

	async function handleMetadataLookup(event) {
		event.preventDefault();
		setLookupLoading(true);
		setLookupError('');
		setMetadataLookup(null);

		try {
			if (!metadataLookupId.trim()) {
				throw new Error('Enter an asset id to inspect metadata.');
			}

			const token = authService.getToken();
			const response = await fetch(`${API_BASE_URL}/assets/${metadataLookupId.trim()}/metadata`, {
				headers: {
					Authorization: `Bearer ${token}`,
				},
			});

			const data = await response.json();

			if (!response.ok) {
				throw new Error(data.message || 'Metadata lookup failed');
			}

			setMetadataLookup(data.metadata);
		} catch (lookupSubmitError) {
			setLookupError(lookupSubmitError.message);
		} finally {
			setLookupLoading(false);
		}
	}

	return (
		<div style={pageStyles.page}>
			<div style={pageStyles.container}>
				<header style={pageStyles.header}>
					<div>
						<h1 style={pageStyles.headline}>VaultChain Dashboard</h1>
						<p style={pageStyles.subtitle}>
							Use this page to test the authenticated image upload flow and inspect the generated hash and EXIF metadata returned by the backend.
						</p>
					</div>
					<nav style={pageStyles.nav}>
						<Link to="/assets" style={pageStyles.navLink}>
							Assets
						</Link>
						<Link to="/profile" style={pageStyles.navLink}>
							Profile
						</Link>
						<button type="button" onClick={handleLogout} style={{ ...pageStyles.navLink, cursor: 'pointer' }}>
							Logout
						</button>
					</nav>
				</header>

				<div style={pageStyles.grid}>
					<section style={{ ...pageStyles.card, ...pageStyles.panel }}>
						<h2 style={pageStyles.panelTitle}>Upload image</h2>
						<p style={pageStyles.panelText}>
							Submit a JPG, PNG, or WebP file and the dashboard will show the created asset, SHA-256 hash, and metadata payload.
						</p>

						<form onSubmit={handleUpload} style={pageStyles.form}>
							<div style={pageStyles.fieldGrid}>
								<label style={pageStyles.field}>
									<span style={pageStyles.label}>Title</span>
									<input
										type="text"
										value={title}
										onChange={(event) => setTitle(event.target.value)}
										style={pageStyles.input}
										placeholder="Sample asset title"
									/>
								</label>
								<label style={pageStyles.field}>
									<span style={pageStyles.label}>Category</span>
									<input
										type="text"
										value={category}
										onChange={(event) => setCategory(event.target.value)}
										style={pageStyles.input}
										placeholder="image"
									/>
								</label>
							</div>

							<label style={pageStyles.field}>
								<span style={pageStyles.label}>Description</span>
								<textarea
									value={description}
									onChange={(event) => setDescription(event.target.value)}
									style={pageStyles.textarea}
									placeholder="Optional notes for this asset"
								/>
							</label>

							<label style={pageStyles.field}>
								<span style={pageStyles.label}>Image file</span>
								<input
									type="file"
									accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
									onChange={(event) => setFile(event.target.files?.[0] || null)}
									style={pageStyles.input}
								/>
							</label>

							{error ? <div style={pageStyles.error}>{error}</div> : null}
							<button type="submit" style={pageStyles.button} disabled={loading}>
								{loading ? 'Uploading...' : 'Upload and inspect'}
							</button>
						</form>

						{result ? (
							<div style={{ ...pageStyles.success, marginTop: '18px' }}>
								Upload succeeded. Asset id {result.asset?.id} was created and the backend returned metadata, asset, and hash details.
							</div>
						) : null}
						{result?.hash ? (
							<div style={{ ...pageStyles.success, marginTop: '12px' }}>
								{result.hash.alreadyUploadedBefore
									? `This image was already uploaded before as asset id ${result.hash.duplicateAssetId}.`
									: 'This image does not appear to have been uploaded before.'}
							</div>
						) : null}
					</section>

					<section style={{ ...pageStyles.card, ...pageStyles.panel }}>
						<h2 style={pageStyles.panelTitle}>Generated data</h2>
						<p style={pageStyles.panelText}>
							These values come straight from the upload response and the metadata lookup endpoint.
						</p>

						<div style={pageStyles.list}>
							<div style={pageStyles.item}>
								<p style={pageStyles.itemLabel}>Upload metadata</p>
								<p style={pageStyles.itemValue}>{result?.metadata ? toPrettyJson(result.metadata) : 'No metadata yet'}</p>
							</div>
							<div style={pageStyles.item}>
								<p style={pageStyles.itemLabel}>Asset</p>
								<p style={pageStyles.itemValue}>{result?.asset ? toPrettyJson(result.asset) : 'No upload yet'}</p>
							</div>
							<div style={pageStyles.item}>
								<p style={pageStyles.itemLabel}>SHA-256</p>
								<p style={pageStyles.itemValue}>{result?.hash?.sha256 || hashLookup?.sha256 || 'No hash yet'}</p>
							</div>
							<div style={pageStyles.item}>
								<p style={pageStyles.itemLabel}>pHash</p>
								<p style={pageStyles.itemValue}>{result?.hash?.phash || hashLookup?.phash || 'No perceptual hash yet'}</p>
							</div>
							<div style={pageStyles.item}>
								<p style={pageStyles.itemLabel}>Already uploaded before</p>
								<p style={pageStyles.itemValue}>
									{result?.hash ? (result.hash.alreadyUploadedBefore ? `Yes, asset ${result.hash.duplicateAssetId}` : 'No') : hashLookup ? (hashLookup.alreadyUploadedBefore ? `Yes, asset ${hashLookup.duplicateAssetId}` : 'No') : 'No data yet'}
								</p>
							</div>
							<div style={pageStyles.item}>
								<p style={pageStyles.itemLabel}>Pixel count</p>
								<p style={pageStyles.itemValue}>
									{getPixelCount(result?.metadata) != null ? getPixelCount(result.metadata).toLocaleString() : 'No pixel count yet'}
								</p>
							</div>
							<div style={pageStyles.item}>
								<p style={pageStyles.itemLabel}>Patterns</p>
								<p style={pageStyles.itemValue}>
									{result?.metadata?.patterns?.length ? result.metadata.patterns.join(', ') : 'No patterns detected'}
								</p>
							</div>
						</div>

						<form onSubmit={handleMetadataLookup} style={{ ...pageStyles.form, marginTop: '20px' }}>
							<label style={pageStyles.field}>
								<span style={pageStyles.label}>Lookup metadata by asset id</span>
								<input
									type="number"
									value={metadataLookupId}
									onChange={(event) => setMetadataLookupId(event.target.value)}
									style={pageStyles.input}
									placeholder="e.g. 1"
								/>
							</label>
							{lookupError ? <div style={pageStyles.error}>{lookupError}</div> : null}
							<button type="submit" style={pageStyles.buttonSecondary} disabled={lookupLoading}>
								{lookupLoading ? 'Loading metadata...' : 'Fetch metadata'}
							</button>
						</form>

						<form onSubmit={handleHashLookup} style={{ ...pageStyles.form, marginTop: '16px' }}>
							<label style={pageStyles.field}>
								<span style={pageStyles.label}>Lookup hashes by asset id</span>
								<input
									type="number"
									value={hashLookupId}
									onChange={(event) => setHashLookupId(event.target.value)}
									style={pageStyles.input}
									placeholder="e.g. 1"
								/>
							</label>
							{hashLookupError ? <div style={pageStyles.error}>{hashLookupError}</div> : null}
							<button type="submit" style={pageStyles.buttonSecondary} disabled={hashLookupLoading}>
								{hashLookupLoading ? 'Loading hashes...' : 'Fetch hashes'}
							</button>
						</form>

						<div style={pageStyles.json}>
							<strong style={{ color: '#e2e8f0' }}>GET /api/assets/:id/metadata</strong>
							{metadataLookup ? (
								<div style={{ marginTop: '10px', color: '#94a3b8' }}>
									Pixel count: {getPixelCount(metadataLookup) != null ? getPixelCount(metadataLookup).toLocaleString() : 'n/a'}
								</div>
							) : null}
							<pre style={{ margin: '10px 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
								{metadataLookup ? toPrettyJson(metadataLookup) : 'No metadata lookup yet'}
							</pre>
						</div>

						<div style={{ ...pageStyles.json, marginTop: '16px' }}>
							<strong style={{ color: '#e2e8f0' }}>GET /api/assets/:id/hash</strong>
							{hashLookup ? (
								<div style={{ marginTop: '10px', color: '#94a3b8' }}>
									SHA-256: {hashLookup.sha256 || 'n/a'}
									<br />
									pHash: {hashLookup.phash || 'n/a'}
									<br />
									Already uploaded before: {hashLookup.alreadyUploadedBefore ? `Yes, asset ${hashLookup.duplicateAssetId}` : 'No'}
								</div>
							) : null}
							<pre style={{ margin: '10px 0 0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
								{hashLookup ? toPrettyJson(hashLookup) : 'No hash lookup yet'}
							</pre>
						</div>

						<p style={{ ...pageStyles.panelText, marginTop: '16px' }}>
							Tip: after uploading a file, the asset id is filled in automatically so you can immediately check the stored metadata row.
						</p>
					</section>
				</div>
			</div>
		</div>
	);
}