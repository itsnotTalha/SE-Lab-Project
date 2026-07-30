const fs = require('fs');
const path = require('path');
const multer = require('multer');

const uploadDirectory = path.resolve(__dirname, '../uploads');

fs.mkdirSync(uploadDirectory, { recursive: true });

const allowedMimeTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp']);

const storage = multer.diskStorage({
	destination(req, file, callback) {
		callback(null, uploadDirectory);
	},
	filename(req, file, callback) {
		const extension = path.extname(file.originalname).toLowerCase();
		const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
		callback(null, `${uniqueSuffix}${extension}`);
	},
});

function fileFilter(req, file, callback) {
	const extension = path.extname(file.originalname).toLowerCase();

	if (!allowedMimeTypes.has(file.mimetype) || !allowedExtensions.has(extension)) {
		const error = new Error('Only jpg, jpeg, png, and webp files are allowed');
		error.status = 400;
		callback(error, false);
		return;
	}

	callback(null, true);
}

const uploadAssetFile = multer({
	storage,
	fileFilter,
	limits: {
		fileSize: 20 * 1024 * 1024,
	},
});

function singleAssetUpload(req, res, next) {
	uploadAssetFile.single('file')(req, res, (error) => {
		if (!error) {
			next();
			return;
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
	uploadAssetFile,
	singleAssetUpload,
	uploadDirectory,
};