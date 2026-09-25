const fs = require('fs/promises');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });
require('dotenv').config({ path: path.resolve(__dirname, '../../../../.env') });

function isGeminiConfigured() {
	if (
		(process.env.NODE_ENV === 'test' || process.env.npm_lifecycle_event === 'test' || process.argv.some((a) => a.includes('--test'))) &&
		!process.env.ENABLE_GEMINI_TESTS
	) {
		return false;
	}
	return Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim());
}

const OCR_SYSTEM_PROMPT = `You are an expert document digitizer and handwriting transcription engine specializing in multilingual technical documents, handwritten notes, diagrams, and formulas in Bengali (বাংলা) and English.
Please transcribe and convert this document into clean, professional, standardized digitized text (স্ট্যান্ডার্ড টেক্সট):
1. Completeness & Fidelity:
   - Extract and transcribe ALL text content, labels, pin diagrams, signal names, formulas, notes, dates, and definitions with 100% completeness.
   - Accurately recognize both handwritten text (হাতের লেখা) and printed text in both Bengali (বাংলা বর্ণমালা, যুক্তাক্ষর, শব্দ, বাক্য, সংখ্যা) and English.
2. Standardized Formatting & Layout:
   - Convert messy handwriting layouts, braces (e.g. bracketed groupings like "} Expected Behaviour" or "} Performance"), arrows (->), and pin diagrams into clean, well-structured headings, bullet lists, sub-points, or clear sections.
   - Do NOT output disjointed ASCII art or broken braces. Translate visual groupings into logical hierarchy (e.g. Section Title -> Bullet Points).
   - Convert margin notes, side notes, or scribbles into clean callouts (e.g. "> **Note:** ...").
3. Clarity & Technical Normalization:
   - Accurately correct obvious handwriting misspellings, scribbles, and abbreviations (e.g. "comprare" -> "compare", "soft." -> "software", "8086 Pin Diagram", "Active Low", "Address/Data Bus") while strictly preserving the author's technical meaning.
   - Ensure proper punctuation, capitalization, and clean Unicode formatting for both Bengali and English.
4. Output Format:
   - Output ONLY the clean, standardized digitized text directly without introductory greetings, conversational chit-chat, or code-block wrappers.`;

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
		signal: AbortSignal.timeout(15000),
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
	const primaryModel = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
	const fallbackModels = [
		primaryModel,
		'gemini-3.5-flash',
		'gemini-3.5-flash-lite',
		'gemini-3-flash-preview',
		'gemini-flash-latest',
		'gemini-3.8-flash',
	].filter((value, index, self) => self.indexOf(value) === index);

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
