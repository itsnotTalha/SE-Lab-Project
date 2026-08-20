function displayValue(value) {
	if (value == null || value === '') return null;
	if (value instanceof Date) return value.toISOString();
	return String(value);
}

function comparisonStatus(registered, compared) {
	if (registered == null && compared == null) return 'unavailable';
	if (registered == null) return 'added';
	if (compared == null) return 'removed';
	return registered === compared ? 'same' : 'changed';
}

function firstPresent(object, keys) {
	for (const key of keys) {
		if (object?.[key] != null && object[key] !== '') return object[key];
	}
	return null;
}

function safeMetadataEvidence(metadata = {}, mimeType, fileSize) {
	const raw = metadata.metadataJson || {};
	const width = metadata.width ?? null;
	const height = metadata.height ?? null;
	const hasGps = Boolean(metadata.location || metadata.patterns?.includes('gps-present'));

	return {
		dimensions: width && height ? `${width} × ${height}` : null,
		aspectRatio: width && height ? (width / height).toFixed(4) : null,
		format: mimeType || null,
		fileSize: Number.isFinite(fileSize) ? String(fileSize) : null,
		camera: metadata.camera || null,
		dateTaken: displayValue(metadata.createdDate),
		orientation: displayValue(firstPresent(raw, ['Orientation', 'orientation'])),
		software: displayValue(firstPresent(raw, ['Software', 'software', 'CreatorTool'])),
		gps: hasGps ? 'Present' : 'Not present',
	};
}

const FIELD_LABELS = {
	dimensions: 'Dimensions',
	aspectRatio: 'Aspect ratio',
	format: 'Format',
	fileSize: 'File size (bytes)',
	camera: 'Camera',
	dateTaken: 'Date taken',
	orientation: 'Orientation',
	software: 'Software',
	gps: 'GPS metadata',
};

function compareMetadata(registeredInput, comparedInput) {
	return Object.keys(FIELD_LABELS).map((field) => {
		const registered = registeredInput[field] ?? null;
		const compared = comparedInput[field] ?? null;
		return {
			field,
			label: FIELD_LABELS[field],
			registered,
			compared,
			status: comparisonStatus(registered, compared),
		};
	});
}

module.exports = {
	comparisonStatus,
	safeMetadataEvidence,
	compareMetadata,
};
