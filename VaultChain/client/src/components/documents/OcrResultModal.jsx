import { AlertCircle, FileSearch, PenTool, RefreshCw, X } from 'lucide-react';
import { useEffect, useState } from 'react';

import { documentService } from '../../services/documentService';
import Button from '../ui/Button';
import CopyButton from '../ui/CopyButton';
import LoadingState from '../ui/LoadingState';
import StatusBadge from '../ui/StatusBadge';
import { formatDhakaTime } from '../../utils/date';

const TONES = { completed: 'success', failed: 'warning', processing: 'info', pending: 'info' };

export default function OcrResultModal({ document, onClose, onUpdated }) {
	const [ocr, setOcr] = useState(null);
	const [error, setError] = useState('');
	const [processing, setProcessing] = useState(false);
	const [processingMode, setProcessingMode] = useState('');

	useEffect(() => {
		let active = true;
		documentService
			.getOcr(document.id)
			.then((result) => {
				if (active) setOcr(result);
			})
			.catch((loadError) => {
				if (active) setError(loadError.message);
			});
		return () => {
			active = false;
		};
	}, [document.id]);

	async function rerun(mode = 'printed') {
		setProcessing(true);
		setProcessingMode(mode);
		setError('');
		try {
			const updated = await documentService.rerunOcr(document.id, mode);
			setOcr(await documentService.getOcr(document.id));
			onUpdated(updated);
		} catch (processError) {
			setError(processError.message);
		} finally {
			setProcessing(false);
			setProcessingMode('');
		}
	}

	return (
		<div className="modal" role="dialog" aria-modal="true" aria-labelledby="ocr-result-title">
			<button className="modal__backdrop" aria-label="Close" onClick={onClose} />
			<section className="modal__card ocr-modal">
				<header className="modal__header">
					<div>
						<span className="modal__icon">
							<FileSearch size={19} />
						</span>
						<div>
							<h2 id="ocr-result-title">Extracted text</h2>
							<p>{document.originalName}</p>
						</div>
					</div>
					<button type="button" className="icon-button" onClick={onClose} aria-label="Close">
						<X size={18} />
					</button>
				</header>

				{error ? (
					<div className="error-banner" role="alert">
						<AlertCircle size={16} />
						{error}
					</div>
				) : !ocr ? (
					<LoadingState label="Loading OCR result" />
				) : (
					<div className="ocr-modal__body">
						<div className="ocr-modal__status">
							<StatusBadge tone={TONES[ocr.status] || 'neutral'}>{ocr.status}</StatusBadge>
							<span>{ocr.processedAt ? formatDhakaTime(ocr.processedAt) : 'Not processed yet'}</span>
						</div>

						{ocr.error ? (
							<div className="error-banner">
								<AlertCircle size={16} />
								{ocr.error}
							</div>
						) : null}

						<div className="ocr-text">
							<pre>{ocr.extractedText || 'No text was detected in this document.'}</pre>
							<CopyButton value={ocr.extractedText} label="Copy text" />
						</div>

						<footer style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'space-between', alignItems: 'center' }}>
							<div style={{ display: 'flex', gap: '8px' }}>
								<Button
									variant="secondary"
									icon={RefreshCw}
									onClick={() => rerun('printed')}
									disabled={processing}
								>
									{processing && processingMode === 'printed' ? 'Extracting printed…' : 'Rerun Standard OCR'}
								</Button>
								<Button
									variant="secondary"
									icon={PenTool}
									onClick={() => rerun('handwritten')}
									disabled={processing}
								>
									{processing && processingMode === 'handwritten' ? 'Extracting HTR…' : 'Rerun TrOCR (HTR)'}
								</Button>
							</div>
							<Button onClick={onClose}>Done</Button>
						</footer>
					</div>
				)}
			</section>
		</div>
	);
}
