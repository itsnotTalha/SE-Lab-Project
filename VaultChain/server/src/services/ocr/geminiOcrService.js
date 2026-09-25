const fs = require('fs/promises');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../../../.env') });

function isGeminiConfigured() {
	return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
}

const OCR_SYSTEM_PROMPT = `You are an expert OCR, document transcription, and handwriting recognition engine specializing in multilingual documents, specifically Bengali (বাংলা) and English.
Please extract and transcribe ALL text content from this document with 100% completeness and high fidelity:
1. Extract both HANDWRITTEN text (হাতের লেখা) and printed text accurately.
2. Accurately transcribe all Bengali text (বাংলা বর্ণমালা, যুক্তাক্ষর, শব্দ, বাক্য, সংখ্যা) and English words, sentences, numbers, symbols, and formulas.
3. Pay close attention to handwritten notes, annotations, scribbles, student answers, exam sheets, forms, signatures, and marginalia.
4. Maintain the original reading order, line breaks, bullet points, and layout structure verbatim.
5. Do NOT summarize, truncate, or omit any text. Transcribe the entire document completely from start to finish.
6. Output ONLY the raw extracted text content without any introductory greetings, markdown backticks/fences, or conversational explanation.`;

async function callGeminiGenerate(endpoint, mimeType, base64Data) {
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
						text: OCR_SYSTEM_PROMPT,
					},
				],
			},
		],
		generationConfig: {
			temperature: 0.1,
			maxOutputTokens: 8192,
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

	return String(candidateText).trim();
}

async function extractTextWithGemini({ filePath, mimeType = 'application/pdf' }) {
	const apiKey = process.env.GEMINI_API_KEY?.trim();
	if (!apiKey) {
		const error = new Error('GEMINI_API_KEY is not configured');
		error.code = 'NO_GEMINI_KEY';
		throw error;
	}

	const fileBuffer = await fs.readFile(filePath);
	const base64Data = fileBuffer.toString('base64');
	const primaryModel = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
	const fallbackModels = [primaryModel, 'gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-flash-latest'].filter(
		(value, index, self) => self.indexOf(value) === index
	);

	let lastError = null;
	for (const model of fallbackModels) {
		const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
		try {
			const text = await callGeminiGenerate(endpoint, mimeType, base64Data);
			return {
				text,
				confidence: 0.98,
				source: 'gemini_api',
				model,
			};
		} catch (error) {
			lastError = error;
			// If rate limited, not found, or temporary error, attempt fallback model
			if ([404, 429, 500, 503].includes(error.status)) {
				continue;
			}
			throw error;
		}
	}

	throw lastError;
}

const extractPdfTextWithGemini = extractTextWithGemini;

module.exports = {
	isGeminiConfigured,
	extractTextWithGemini,
	extractPdfTextWithGemini,
};
