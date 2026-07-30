const fs = require('fs/promises');
const exifr = require('exifr');

function formatGpsCoordinate(value, direction) {
	if (typeof value !== 'number' || !direction) {
		return null;
	}

	const signedValue = direction === 'S' || direction === 'W' ? -Math.abs(value) : Math.abs(value);
	return String(signedValue);
}

function buildLocationString(metadata) {
	const latitude = formatGpsCoordinate(metadata.latitude, metadata.latitudeRef);
	const longitude = formatGpsCoordinate(metadata.longitude, metadata.longitudeRef);

	if (!latitude || !longitude) {
		return null;
	}

	return `${latitude},${longitude}`;
}

function buildCameraString(metadata) {
	const make = metadata.make ? String(metadata.make).trim() : '';
	const model = metadata.model ? String(metadata.model).trim() : '';
	const parts = [make, model].filter(Boolean);

	return parts.length ? parts.join(' ') : null;
}

function pickCreatedDate(metadata) {
	return metadata.dateTimeOriginal || metadata.createDate || metadata.modifyDate || null;
}

function buildPatterns(metadata, width, height) {
	const patterns = [];

	if (width && height) {
		patterns.push('resolution-available');
	}

	if (metadata.latitude != null && metadata.longitude != null) {
		patterns.push('gps-present');
	}

	if (metadata.make || metadata.model) {
		patterns.push('camera-present');
	}

	if (metadata.dateTimeOriginal || metadata.createDate || metadata.modifyDate) {
		patterns.push('capture-date-present');
	}

	if (metadata.Orientation != null) {
		patterns.push('orientation-present');
	}

	return patterns;
}

async function extractImageMetadata(filePath) {
	if (!filePath) {
		const error = new Error('Missing file path');
		error.status = 400;
		throw error;
	}

	try {
		await fs.access(filePath);
	} catch (error) {
		const missingFileError = new Error('Uploaded file not found');
		missingFileError.status = 404;
		throw missingFileError;
	}

	let metadata;

	try {
		metadata = await exifr.parse(filePath, { gps: true, tiff: true, ifd0: true, exif: true, xmp: true });
	} catch (error) {
		const readError = new Error('Failed to extract image metadata');
		readError.status = 500;
		readError.cause = error;
		throw readError;
	}

	const parsedMetadata = metadata || {};
	const width = parsedMetadata.ImageWidth || parsedMetadata.ExifImageWidth || parsedMetadata.PixelXDimension || null;
	const height = parsedMetadata.ImageHeight || parsedMetadata.ExifImageHeight || parsedMetadata.PixelYDimension || null;
	const pixelCount = width && height ? width * height : null;
	const patterns = buildPatterns(parsedMetadata, width, height);

	return {
		width,
		height,
		pixelCount,
		patterns,
		camera: buildCameraString(parsedMetadata),
		location: buildLocationString(parsedMetadata),
		createdDate: pickCreatedDate(parsedMetadata),
		metadataJson: {
			...parsedMetadata,
			pixelCount,
			patterns,
		},
	};
}

module.exports = {
	extractImageMetadata,
};