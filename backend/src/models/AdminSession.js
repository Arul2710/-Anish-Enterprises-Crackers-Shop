import mongoose from 'mongoose';

const { Schema, model } = mongoose;

/**
 * Persistent admin sessions.
 *
 * The session service writes one document per sign-in so a restart or redeploy
 * of the API does not sign the owner out. Tokens carry the `sid`; this
 * collection decides whether that id is still live. Expired rows are removed
 * lazily on read and eagerly by the TTL index on `expiresAt`.
 */
const adminSessionSchema = new Schema(
  {
    sid: { type: String, required: true, unique: true, index: true },
    subject: { type: String, required: true, index: true },
    role: { type: String, default: 'owner' },
    issuedAt: { type: Date, default: Date.now },
    lastLoginAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
    revokedAt: { type: Date, default: null },
  },
  { timestamps: false, versionKey: false },
);

export const AdminSession = model('AdminSession', adminSessionSchema);
export default AdminSession;
