const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadDirectory = path.resolve(__dirname, '../uploads/documents');
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const allowedMimeTypes = new Set(['application/pdf', 'application/x-pdf']);

fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination(req, file, callback) {
    callback(null, uploadDirectory);
  },
  filename(req, file, callback) {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    callback(null, `${uniqueSuffix}.pdf`);
  },
});

function fileFilter(req, file, callback) {
  const extension = path.extname(file.originalname || '').toLowerCase();

  if (extension !== '.pdf' || !allowedMimeTypes.has(file.mimetype)) {
    const error = new Error('Only valid PDF files are allowed');
    error.status = 400;
    callback(error, false);
    return;
  }

  callback(null, true);
}

const uploadDocumentFile = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE },
});

function singleDocumentUpload(req, res, next) {
  uploadDocumentFile.single('document')(req, res, async (error) => {
    if (!error) {
      try {
        if (!req.file) {
          const missingFileError = new Error('PDF document is required');
          missingFileError.status = 400;
          next(missingFileError);
          return;
        }

        const handle = await fs.promises.open(req.file.path, 'r');
        const header = Buffer.alloc(5);
        await handle.read(header, 0, 5, 0);
        await handle.close();

        if (header.toString('ascii') !== '%PDF-') {
          await fs.promises.unlink(req.file.path).catch(() => {});
          const invalidPdfError = new Error('Uploaded file is not a valid PDF');
          invalidPdfError.status = 400;
          next(invalidPdfError);
          return;
        }

        next();
      } catch (validationError) {
        if (req.file?.path) {
          await fs.promises.unlink(req.file.path).catch(() => {});
        }
        validationError.status = 400;
        next(validationError);
      }
      return;
    }

    if (req.file?.path) {
      await fs.promises.unlink(req.file.path).catch(() => {});
    }

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        error.status = 413;
        error.message = 'File size exceeds the 20 MB limit';
      } else {
        error.status = 400;
      }
    }

    next(error);
  });
}

module.exports = {
  singleDocumentUpload,
  documentUploadDirectory: uploadDirectory,
};
