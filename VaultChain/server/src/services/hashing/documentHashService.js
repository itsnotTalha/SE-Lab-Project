const { createHash } = require('crypto');

// Versioned, fixed key order; excludes mutable OCR results and storage paths.
function generateMetadataSha256(document) {
	const metadata = {
		version: 1,
		originalName: document.originalName,
		description: document.description || null,
		category: document.category || (document.mimeType === 'application/pdf' ? 'pdf' : 'image'),
		mimeType: document.mimeType,
		fileSize: document.fileSize,
	};
	return createHash('sha256').update(JSON.stringify(metadata), 'utf8').digest('hex');
}

module.exports = { generateMetadataSha256 };
