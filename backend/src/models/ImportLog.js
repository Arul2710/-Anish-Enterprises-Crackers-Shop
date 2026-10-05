import mongoose from 'mongoose';

const { Schema, model } = mongoose;
// Free-form payload: the exact shape of a workbook row cannot be known ahead of
// time, and it is only ever read back through the preview endpoint.
const Mixed = Schema.Types.Mixed;

const importRowSchema = new Schema(
  {
    rowNumber: { type: Number, required: true },
    raw: { type: Mixed, default: null },
    productId: { type: Schema.Types.ObjectId, ref: 'Product', default: null },
    action: { type: String, enum: ['created', 'updated', 'skipped', 'failed', 'invalid'], default: 'invalid' },
    reason: { type: String, default: '', maxlength: 300 },
    // Named "issues" rather than "errors": mongoose reserves `errors` and using
    // it interferes with document validation.
    issues: { type: [String], default: [] },
    snapshot: { type: Mixed, default: null },
  },
  { _id: false },
);

const importLogSchema = new Schema(
  {
    fileName: { type: String, required: true, maxlength: 255 },
    // Detects a re-upload of the same workbook.
    fileHash: { type: String, required: true, index: true },
    sheetName: { type: String, default: '', maxlength: 80 },
    status: { type: String, enum: ['previewed', 'committed', 'failed', 'rejected'], default: 'previewed', index: true },
    mode: { type: String, enum: ['preview', 'commit'], default: 'preview' },
    priceMapping: {
      confirmed: { type: Boolean, default: false },
      sellingPriceColumn: { type: String, default: null, maxlength: 80 },
      originalPriceColumn: { type: String, default: null, maxlength: 80 },
    },
    detectedColumns: { type: [String], default: [] },
    detectedCategories: { type: [String], default: [] },
    summary: {
      totalRows: { type: Number, default: 0 },
      validRows: { type: Number, default: 0 },
      invalidRows: { type: Number, default: 0 },
      created: { type: Number, default: 0 },
      updated: { type: Number, default: 0 },
      skipped: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
    },
    rows: { type: [importRowSchema], default: [] },
    performedBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null, index: true },
    durationMs: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false },
);

// A committed batch for a given file hash is unique, which is what blocks the
// same workbook being imported twice.
importLogSchema.index(
  { fileHash: 1, status: 1 },
  { unique: true, partialFilterExpression: { status: 'committed' } },
);

importLogSchema.set('toJSON', { virtuals: true });
importLogSchema.set('toObject', { virtuals: true });

export const ImportLog = model('ImportLog', importLogSchema);
export { importRowSchema };
export default ImportLog;
