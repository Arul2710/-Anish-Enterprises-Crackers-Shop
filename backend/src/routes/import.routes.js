import { Router } from 'express';
import { commit, getLog, history, mappingStatus, preview, recent } from '../controllers/import.controller.js';
import { requireAuth, requirePermission } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { handleUpload, workbookUpload } from '../middleware/upload.middleware.js';
import { importLimiter } from '../middleware/rateLimit.middleware.js';
import { PERMISSION } from '../config/constants.js';
import { importCommitSchema } from '../validators/settings.validator.js';

const router = Router();

/**
 * Every import route requires an authenticated admin with the imports:run
 * permission. The workbook is parsed from memory and never written to disk.
 */
router.use(requireAuth, requirePermission(PERMISSION.IMPORTS_RUN), importLimiter);

router.get('/mapping', mappingStatus);
router.get('/history', history);
router.get('/recent', recent);
router.get('/:id', getLog);

/** Preview writes nothing; it reports what the workbook would produce. */
router.post('/preview', handleUpload(workbookUpload), preview);

/** Commit requires the owner to have confirmed the selling-price column. */
router.post('/commit', handleUpload(workbookUpload), validate(importCommitSchema), commit);

export default router;
