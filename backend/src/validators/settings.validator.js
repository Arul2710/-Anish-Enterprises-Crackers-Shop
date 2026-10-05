import { z } from 'zod';
import { money, trimmed } from './common.validator.js';

const pricingSchema = z
  .object({
    includeTax: z.boolean().optional(),
    taxPercent: z.coerce.number().min(0).max(100).optional(),
    roundToNearest: z.coerce.number().min(0).optional(),
    gstNumber: trimmed(40).optional(),
    gstPercent: z.coerce.number().min(0).max(100).optional(),
  })
  .optional();

export const updateSettingsSchema = z.object({
  body: z
    .object({
      shopName: trimmed(160).optional(),
      logoUrl: z.string().trim().url('Enter a valid logo URL').max(2048).optional().nullable(),
      logoAlt: trimmed(200).optional(),
      contact: z
        .object({
          supportPhone: trimmed(32).optional(),
          supportEmail: z.string().trim().toLowerCase().email('Enter a valid support email').max(254).optional().or(z.literal('')),
          addressLine1: trimmed(250).optional(),
          addressLine2: trimmed(250).optional(),
          city: trimmed(120).optional(),
          state: trimmed(120).optional(),
          pincode: trimmed(12).optional(),
          businessHours: trimmed(200).optional(),
          mapUrl: z.string().trim().url().max(2048).optional().or(z.literal('')),
          mapEmbedUrl: z.string().trim().url().max(2048).optional().or(z.literal('')),
        })
        .optional(),
      social: z
        .object({
          whatsapp: z.string().trim().url().max(2048).optional().or(z.literal('')),
          instagram: z.string().trim().url().max(2048).optional().or(z.literal('')),
          facebook: z.string().trim().url().max(2048).optional().or(z.literal('')),
          youtube: z.string().trim().url().max(2048).optional().or(z.literal('')),
        })
        .optional(),
      delivery: z
        .object({
          isDeliveryAvailable: z.boolean().optional(),
          deliveryFee: money.optional(),
          freeDeliveryAbove: money.optional(),
          estimatedDays: trimmed(120).optional(),
          shippingNote: trimmed(500).optional(),
        })
        .optional(),
      payments: z
        .object({
          enabledMethods: z.array(z.string()).min(1, 'Keep at least one payment option').optional(),
          pricing: pricingSchema,
        })
        .optional(),
      minimumOrderAmount: money.optional(),
      allowEnquiryOnly: z.boolean().optional(),
      lowStockThreshold: z.coerce.number().int().min(0).optional(),
      announcement: z
        .object({
          enabled: z.boolean().optional(),
          text: trimmed(300).optional(),
        })
        .optional(),
    })
    .refine((value) => Object.keys(value).length > 0, { message: 'Provide at least one setting to update' }),
});

/**
 * The owner explicitly states which sheet column is the customer-facing price.
 * Nothing is inferred: the import refuses to commit until this is confirmed.
 */
export const priceMappingSchema = z.object({
  body: z.object({
    sheetName: trimmed(80).optional(),
    nameColumn: trimmed(80).optional(),
    skuColumn: trimmed(80).optional(),
    categoryColumn: trimmed(80).optional(),
    packColumn: trimmed(80).optional(),
    sellingPriceColumn: requiredColumn(),
    originalPriceColumn: trimmed(80).optional().nullable(),
    confirm: z.boolean().optional().default(true),
  }),
});

function requiredColumn() {
  return trimmed(80).min(1, 'Choose which column holds the customer-facing selling price');
}

export const importCommitSchema = z.object({
  body: z.object({
    fileHash: trimmed(80).optional(),
    // Optional narrowing: import only these categories.
    categories: z.array(trimmed(120)).max(50).optional(),
    // Row numbers the operator reviewed and accepted.
    includeRows: z.array(z.coerce.number().int().min(1)).max(5000).optional(),
    updateExisting: z.boolean().optional().default(true),
  }),
});
