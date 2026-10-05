import multer from 'multer';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

const ALLOWED_MIME = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'application/octet-stream',
  'application/zip',
]);

/**
 * Workbooks are parsed straight out of memory and never written to disk, so
 * there is no uploads directory to secure or clean up.
 */
export const workbookUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_BYTES, files: 1 },
  fileFilter(_req, file, cb) {
    const nameOk = /\.(xlsx|xls)$/i.test(file.originalname || '');
    if (!nameOk) return cb(ApiError.badRequest('Only .xlsx or .xls workbooks are accepted.'));
    if (!ALLOWED_MIME.has(file.mimetype)) return cb(ApiError.badRequest('That file is not a valid Excel workbook.'));
    return cb(null, true);
  },
}).single('file');

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_UPLOAD_BYTES, files: 6 },
  fileFilter(_req, file, cb) {
    if (!/^image\/(jpe?g|png|webp|avif|gif)$/i.test(file.mimetype || '')) {
      return cb(ApiError.badRequest('Only JPG, PNG, WEBP, AVIF or GIF images are accepted.'));
    }
    return cb(null, true);
  },
}).array('images', 6);

/** Wraps multer so its own errors surface as clean API errors. */
export const handleUpload = (uploader) => (req, res, next) =>
  uploader(req, res, (error) => {
    if (!error) return next();
    if (error instanceof multer.MulterError) {
      const message =
        error.code === 'LIMIT_FILE_SIZE'
          ? `That file is larger than the ${Math.round(env.MAX_UPLOAD_BYTES / 1024 / 1024)}MB limit.`
          : 'That upload could not be processed.';
      return next(ApiError.badRequest(message, { code: error.code }));
    }
    return next(error);
  });

export default workbookUpload;
