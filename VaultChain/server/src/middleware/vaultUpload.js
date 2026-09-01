const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadDirectory = path.resolve(__dirname, '../temp/vault');
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const allowedMimeTypes = new Set(['application/pdf', 'application/x-pdf']);

fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination(req, file, callback) {
    callback(null, uploadDirectory);
  },
  filename(req, file, callback) {
    callback(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}.upload`);
  },
});

function fileFilter(req, file, callback) {
  const extension = path.extname(file.originalname || '').toLowerCase();
  if (extension !== '.pdf' || !allowedMimeTypes.has(file.mimetype)) {
    const error = new Error('Only valid PDF files can be stored in the document vault');
    error.status = 400;
    callback(error, false);
    return;
  }
  callback(null, true);
}

const uploadVaultFile = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

function singleVaultUpload(req, res, next) {
  uploadVaultFile.single('file')(req, res, async (error) => {
    if (!error) {
      if (!req.file) {
        const missing = new Error('Vault file is required');
        missing.status = 400;
        next(missing);
        return;
      }
      next();
      return;
    }

    if (req.file?.path) await fs.promises.unlink(req.file.path).catch(() => {});
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      error.status = 413;
      error.message = 'File size exceeds the 20 MB limit';
    } else if (error instanceof multer.MulterError) {
      error.status = 400;
    }
    next(error);
  });
}

module.exports = { singleVaultUpload, vaultTemporaryDirectory: uploadDirectory };
