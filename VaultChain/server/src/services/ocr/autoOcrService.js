// Recognition quality is a routing heuristic, not a handwriting classifier.
function assessLocalResult(result) {
	const text = String(result?.text || '').trim();
	if (!text) return 'no_local_text';
	if (!Number.isFinite(result.confidence) || result.confidence < 80) return 'low_local_confidence';
	const characters = [...text.replace(/\s/g, '')];
	const readable = characters.filter((character) => /[\p{L}\p{N}]/u.test(character)).length;
	if (readable < 3 || readable / characters.length < 0.5) return 'unclear_local_text';
	return null;
}

async function extractAutomatically({ filePath, mimeType }, { localExtract, onlineConfigured, onlineExtract }) {
	let local;
	let localError;
	try { local = await localExtract(filePath); } catch (error) { localError = error; }
	const reason = localError ? 'local_ocr_failed' : assessLocalResult(local);
	if (!reason) return { ...local, source: 'local_tesseract', selectionReason: 'clear_local_text', warning: null };
	if (onlineConfigured()) {
		try {
			return { ...(await onlineExtract({ filePath, mimeType })), selectionReason: reason, warning: null };
		} catch (error) {
			if (!local?.text?.trim()) throw error;
			return { ...local, source: 'local_tesseract', selectionReason: reason,
				warning: 'Online OCR was unavailable. Showing the local result; review it against the original and retry if needed.' };
		}
	}
	if (localError) throw localError;
	return { ...local, source: 'local_tesseract', selectionReason: reason,
		warning: 'Local recognition may be incomplete. Online handwriting OCR is not configured; review the original.' };
}

module.exports = { assessLocalResult, extractAutomatically };
