import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { buildDemoChain, hashBlock, inspectDemoChain, GENESIS_HASH } from './chainDemo.mjs';

test('example blocks use SHA-256 and form a valid linked history', async () => {
	const blocks = await buildDemoChain('asset-fingerprint');
	assert.equal(blocks.length, 3);
	assert.equal(blocks[0].previousHash, GENESIS_HASH);
	const { index, event, fingerprint, previousHash } = blocks[0];
	assert.equal(blocks[0].hash, createHash('sha256').update(JSON.stringify({ index, event, fingerprint, previousHash })).digest('hex'));
	assert.ok((await inspectDemoChain(blocks)).every((result) => result.valid));
});

test('changing a record invalidates its hash and the following history', async () => {
	const blocks = await buildDemoChain();
	blocks[1].event = 'Changed owner';
	const checks = await inspectDemoChain(blocks);
	assert.equal(checks[0].valid, true);
	assert.equal(checks[1].hashMatches, false);
	assert.equal(checks[1].valid, false);
	assert.equal(checks[2].valid, false);
});

test('recalculating a changed middle block breaks the next link; reset restores it', async () => {
	const blocks = await buildDemoChain();
	blocks[1].event = 'Changed owner';
	blocks[1].hash = await hashBlock(blocks[1]);
	const checks = await inspectDemoChain(blocks);
	assert.equal(checks[1].hashMatches, true);
	assert.equal(checks[2].hashMatches, true);
	assert.equal(checks[2].linkMatches, false);
	assert.equal(checks[2].valid, false);
	assert.ok((await inspectDemoChain(await buildDemoChain())).every((result) => result.valid));
});

test('asset fingerprint changes propagate through the chain', async () => {
	const original = await buildDemoChain('original');
	const changed = await buildDemoChain('changed');
	original.forEach((block, index) => assert.notEqual(block.hash, changed[index].hash));
});
