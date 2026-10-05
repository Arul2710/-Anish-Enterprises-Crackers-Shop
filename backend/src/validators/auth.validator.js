import { z } from 'zod';
import { email, identifier, requiredText, trimmed } from './common.validator.js';

export const loginSchema = z.object({
  body: z.object({
    email,
    // Length is checked here; strength is only enforced when changing a password.
    password: z.string().min(1, 'Enter your password').max(200),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Enter your current password').max(200),
    newPassword: z
      .string()
      .min(10, 'Use at least 10 characters')
      .max(200)
      .refine((value) => /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value), 'Include an uppercase letter, a lowercase letter and a number'),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    name: requiredText(120, 'Name').optional(),
    email: email.optional(),
  }),
});

export const createAdminSchema = z.object({
  body: z.object({
    name: requiredText(120, 'Name'),
    email,
    password: z
      .string()
      .min(10, 'Use at least 10 characters')
      .max(200)
      .refine((value) => /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value), 'Include an uppercase letter, a lowercase letter and a number'),
    role: z.enum(['owner', 'admin', 'staff']),
  }),
});

export const updateAdminSchema = z.object({
  body: z.object({
    name: requiredText(120, 'Name').optional(),
    role: z.enum(['owner', 'admin', 'staff']).optional(),
    isActive: z.boolean().optional(),
  }),
});

export const resetAdminPasswordSchema = z.object({
  body: z.object({
    newPassword: z
      .string()
      .min(10, 'Use at least 10 characters')
      .max(200)
      .refine((value) => /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value), 'Include an uppercase letter, a lowercase letter and a number'),
  }),
});

export const idParamSchema = z.object({ id: identifier });

export { trimmed };
