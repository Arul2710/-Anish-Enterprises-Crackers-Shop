import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { ADMIN_ROLE, ADMIN_ROLES, PERMISSION, ROLE_PERMISSIONS, roleHasPermission } from '../config/constants.js';

const { Schema, model } = mongoose;

const adminSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    // Only ever a bcrypt hash. select:false keeps it out of every ordinary query.
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ADMIN_ROLES, default: ADMIN_ROLE.STAFF, index: true },
    isActive: { type: Boolean, default: true, index: true },
    lastLoginAt: { type: Date, default: null },
    lastLoginIp: { type: String, default: null },
    failedLoginCount: { type: Number, default: 0, min: 0 },
    lockedUntil: { type: Date, default: null },
    passwordChangedAt: { type: Date, default: Date.now },
    // Bumped to invalidate every issued token at once (sign out everywhere).
    tokenVersion: { type: Number, default: 0 },
    // `iat` claims of refresh tokens that were explicitly signed out.
    sessionRevocations: { type: [Number], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'Admin', default: null },
  },
  { timestamps: true, versionKey: false },
);

adminSchema.methods.verifyPassword = async function verifyPassword(plain) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(String(plain), this.passwordHash);
};

adminSchema.methods.hasPermission = function hasPermission(permission) {
  return roleHasPermission(this.role, permission);
};

/** Locks the account after repeated failures so a password cannot be brute forced. */
adminSchema.methods.isLocked = function isLocked(now = new Date()) {
  return Boolean(this.lockedUntil && this.lockedUntil > now);
};

adminSchema.methods.registerFailedLogin = function registerFailedLogin(now = new Date()) {
  this.failedLoginCount = (this.failedLoginCount || 0) + 1;
  if (this.failedLoginCount >= 5) {
    this.lockedUntil = new Date(now.getTime() + 15 * 60 * 1000);
    this.failedLoginCount = 0;
  }
};

adminSchema.statics.hashPassword = async function hashPassword(plain) {
  return bcrypt.hash(String(plain), env.BCRYPT_ROUNDS);
};

adminSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    delete ret.passwordHash;
    delete ret.failedLoginCount;
    delete ret.lockedUntil;
    delete ret.sessionRevocations;
    delete ret.tokenVersion;
    ret.permissions = ROLE_PERMISSIONS[ret.role] || [];
    return ret;
  },
});

export const Admin = model('Admin', adminSchema);
export { PERMISSION };
export default Admin;
