const { asyncHandler } = require('../../middleware/asyncHandler');
const vaultService = require('../../services/vault/vaultService');

const createVault = asyncHandler(async (req, res) => {
	res.status(201).json({ success: true, vault: await vaultService.createVault(req.user.id, req.body) });
});
const getVaults = asyncHandler(async (req, res) => {
	res.json({ success: true, vaults: await vaultService.getVaults(req.user.id, req.authTokenFingerprint), stats: await vaultService.getStats(req.user.id) });
});
const getVault = asyncHandler(async (req, res) => {
	res.json({ success: true, vault: await vaultService.getVault(req.user.id, req.params.reference, req.authTokenFingerprint) });
});
const unlockVault = asyncHandler(async (req, res) => {
	res.json({ success: true, vault: await vaultService.unlockVault(req.user.id, req.params.reference, req.body.password, req.authTokenFingerprint) });
});
const lockVault = asyncHandler(async (req, res) => {
	res.json({ success: true, vault: await vaultService.lockVault(req.user.id, req.params.reference, req.authTokenFingerprint) });
});
const changePassword = asyncHandler(async (req, res) => {
	res.json({ success: true, vault: await vaultService.changePassword(req.user.id, req.params.reference, req.body, req.authTokenFingerprint) });
});
const resetPassword = asyncHandler(async (req, res) => {
	res.json({ success: true, vault: await vaultService.resetPassword(req.user.id, req.params.reference, req.body, req.authTokenFingerprint) });
});
const updateVault = asyncHandler(async (req, res) => {
	res.json({ success: true, vault: await vaultService.updateVault(req.user.id, req.params.reference, req.body, req.authTokenFingerprint) });
});
const deleteVault = asyncHandler(async (req, res) => {
	await vaultService.deleteVault(req.user.id, req.params.reference, req.authTokenFingerprint);
	res.status(204).send();
});
const addAssets = asyncHandler(async (req, res) => {
	res.json({ success: true, vault: await vaultService.addAssets(req.user.id, req.params.reference, req.body, req.authTokenFingerprint) });
});
const removeAsset = asyncHandler(async (req, res) => {
	res.json({ success: true, vault: await vaultService.removeAsset(req.user.id, req.params.reference, req.params.assetId, req.authTokenFingerprint) });
});

module.exports = { createVault, getVaults, getVault, unlockVault, lockVault, changePassword, resetPassword, updateVault, deleteVault, addAssets, removeAsset };
