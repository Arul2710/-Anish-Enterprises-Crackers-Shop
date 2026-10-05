import { z } from 'zod';
import { MAX_CART_QUANTITY } from '../config/constants.js';

const trimmed = (max) => z.string().trim().max(max);
const requiredText = (max, label) => trimmed(max).min(1, `${label} is required`);

export const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Not a valid id');

/** Accepts a 24-char ObjectId, or a documented legacy id such as SS26-042. */
export const identifier = z.string().trim().min(1).max(80);

export const money = z.coerce.number().min(0).max(1_000_000);

export const phone = z
  .string()
  .trim()
  .min(6, 'A contact number is required')
  .max(32)
  .transform((value) => value.replace(/[^\d+()\-\s]/g, ''))
  .refine((value) => (value.match(/\d/g) || []).length >= 6, 'Enter a valid contact number');

export const email = z.string().trim().toLowerCase().email('Enter a valid email address').max(254).or(z.literal(''));

export const quantity = z.coerce.number().int().min(1, 'Quantity must be at least 1').max(MAX_CART_QUANTITY, `Quantity cannot exceed ${MAX_CART_QUANTITY}`);

export const paginationQuery = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export { trimmed, requiredText, MAX_CART_QUANTITY };
