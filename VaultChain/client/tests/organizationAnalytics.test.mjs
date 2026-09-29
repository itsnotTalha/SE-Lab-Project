import test from 'node:test';
import assert from 'node:assert/strict';
import { organizationAnalytics } from '../src/utils/organizationAnalytics.mjs';

test('sales charts exclude dividend payouts and keep treasury movement separate', () => {
 const org = { sales: [{ id: 'sale', date: '2026-03-10', grossAmount: 100, creatorPayout: 80, treasuryCut: 20 }, { id: 'tx-payout-1', date: '2026-03-11', grossAmount: 50 }], treasuryTransactions: [{ date: '2026-03-01', type: 'Inflow', amount: 120 }, { date: '2026-03-11', type: 'Outflow', amount: 50 }] };
 const result = organizationAnalytics(org, 3);
 assert.equal(result.gross, 100);
 assert.equal(result.net, 70);
 assert.deepEqual(result.timeline.map((row) => row.month), ['2026-01','2026-02','2026-03']);
 assert.equal(result.timeline[2].contributors, 80);
});
test('periods span years and exclude older records without inventing transactions', () => {
 const result = organizationAnalytics({ sales: [{ date: '2025-10-01', grossAmount: 10 }, { date: '2026-01-01', grossAmount: 20 }], members: [{ name: 'Member', split: 40 }] }, 3);
 assert.deepEqual(result.timeline.map((row) => row.month), ['2025-11','2025-12','2026-01']);
 assert.equal(result.gross, 20);
 assert.equal(result.hasTransactions, false);
 assert.equal(result.members[0].share, 40);
});
test('empty organizations return honest empty breakdowns and zero totals', () => {
 const result = organizationAnalytics({}, 6);
 assert.equal(result.timeline.length, 6);
 assert.equal(result.gross, 0);
 assert.equal(result.hasSales, false);
 assert.deepEqual(result.inventory, []);
 assert.deepEqual(result.vaults, []);
});
