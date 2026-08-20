const { asyncHandler } = require('../../middleware/asyncHandler');
const vaultService = require('../../services/vault/vaultService');

const createVault = asyncHandler(async (req, res) => {
	res.status(201).json({ success: true, vault: await vaultService.createVault(req.user.id, req.body) });
});
const getVaults = asyncHandler(async (req, res) => {
	res.json({ success: true, vaults: await vaultService.getVaults(req.user.id), stats: await vaultService.getStats(req.user.id) });
});
const getVault = asyncHandler(async (req, res) => {
	res.json({ success: true, vault: await vaultService.getVault(req.user.id, req.params.reference) });
});
const updateVault = asyncHandler(async (req, res) => {
	res.json({ success: true, vault: await vaultService.updateVault(req.user.id, req.params.reference, req.body) });
});
const deleteVault = asyncHandler(async (req, res) => {
	await vaultService.deleteVault(req.user.id, req.params.reference);
	res.status(204).send();
});
const addAssets = asyncHandler(async (req, res) => {
	res.json({ success: true, vault: await vaultService.addAssets(req.user.id, req.params.reference, req.body) });
});
const removeAsset = asyncHandler(async (req, res) => {
	res.json({ success: true, vault: await vaultService.removeAsset(req.user.id, req.params.reference, req.params.assetId) });
});

module.exports = { createVault, getVaults, getVault, updateVault, deleteVault, addAssets, removeAsset };
