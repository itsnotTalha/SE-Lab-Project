const assert = require('node:assert/strict');
const { test } = require('node:test');

const {
	compareMetadata,
	comparisonStatus,
	safeMetadataEvidence,
} = require('../src/services/verification/metadataComparisonService');

test('metadata comparison classifies same, changed, added, removed, and unavailable values', () => {
	assert.equal(comparisonStatus('PNG', 'PNG'), 'same');
	assert.equal(comparisonStatus('PNG', 'JPEG'), 'changed');
	assert.equal(comparisonStatus(null, 'Photoshop'), 'added');
	assert.equal(comparisonStatus('Camera', null), 'removed');
	assert.equal(comparisonStatus(null, null), 'unavailable');
});

test('safe metadata evidence reports GPS presence without exposing coordinates', () => {
	const evidence = safeMetadataEvidence({
		width: 1920,
		height: 1080,
		camera: 'Example Camera',
		location: '23.7, 90.4',
		metadataJson: { Software: 'Example Editor', Orientation: 1 },
	}, 'image/jpeg', 1024);
	assert.equal(evidence.gps, 'Present');
	assert.equal(evidence.software, 'Example Editor');
	assert.equal(JSON.stringify(evidence).includes('23.7'), false);
	const rows = compareMetadata(evidence, { ...evidence, software: null });
	assert.equal(rows.find((row) => row.field === 'software').status, 'removed');
});
