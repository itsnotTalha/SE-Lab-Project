const { asyncHandler } = require('../../middleware/asyncHandler');
const vaultService = require('../../services/vault/vaultService');

function ownerId(req) {
  return Number(req.user?.id);
}

function publicItem(item) {
  if (!item) return item;
  const { encryptedPath, ...safeItem } = item;
  return safeItem;
}

const upload = asyncHandler(async (req, res) => {
  const item = await vaultService.uploadVaultItem({
    ownerId: ownerId(req),
    file: req.file,
    title: req.body.title,
    description: req.body.description,
  });
  res.status(201).json({ success: true, item: publicItem(item) });
});

const list = asyncHandler(async (req, res) => {
  const items = await vaultService.listVault(ownerId(req));
  res.json({ success: true, items: items.map(publicItem) });
});

const details = asyncHandler(async (req, res) => {
  const item = await vaultService.getVaultItem(ownerId(req), req.params.id);
  res.json({ success: true, item: publicItem(item) });
});

const download = asyncHandler(async (req, res) => {
  const { item, content } = await vaultService.downloadVaultItem(ownerId(req), req.params.id);
  res.setHeader('Content-Type', item.mimeType || 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${String(item.originalName).replace(/[^a-zA-Z0-9._-]/g, '_')}"`);
  res.send(content);
});

const remove = asyncHandler(async (req, res) => {
  await vaultService.deleteVaultItem(ownerId(req), req.params.id);
  res.json({ success: true, message: 'Vault item deleted' });
});

module.exports = { upload, list, details, download, remove };
