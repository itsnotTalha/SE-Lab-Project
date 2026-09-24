const fs = require('fs/promises');

function isGeminiConfigured() {
	return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
}

async function extractPdfTextWithGemini({ filePath, mimeType = 'application/pdf' }) {
	const apiKey = process.env.GEMINI_API_KEY?.trim();
	if (!apiKey) {
		const error = new Error('GEMINI_API_KEY is not configured');
		error.code = 'NO_GEMINI_KEY';
		throw error;
	}

	const fileBuffer = await fs.readFile(filePath);
	const base64Data = fileBuffer.toString('base64');
	const model = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
	const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

	const requestBody = {
		contents: [
			{
				role: 'user',
				parts: [
					{
						inline_data: {
							mime_type: mimeType,
							data: base64Data,
						},
					},
					{
						text: 'Extract all text content from this document accurately, preserving words, numbers, and layout structure without adding any introductory commentary, greetings, or markdown fences. Output ONLY the raw extracted text.',
					},
				],
			},
		],
		generationConfig: {
			temperature: 0.0,
		},
	};

	const response = await fetch(endpoint, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(requestBody),
	});

	if (!response.ok) {
		const errorText = await response.text().catch(() => '');
		const error = new Error(`Gemini API error (${response.status}): ${errorText.slice(0, 300)}`);
		error.status = response.status;
		throw error;
	}

	const data = await response.json();
	const candidate = data?.candidates?.[0];
	const candidateText = candidate?.content?.parts?.[0]?.text;

	if (candidateText === undefined || candidateText === null) {
		throw new Error('Gemini API returned an empty or invalid response structure');
	}

	const text = String(candidateText).trim();
	return {
		text,
		confidence: 0.98,
		source: 'gemini_api',
		model,
	};
}

module.exports = {
	isGeminiConfigured,
	extractPdfTextWithGemini,
};
