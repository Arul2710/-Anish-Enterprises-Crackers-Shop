import { z } from 'zod';
import { MAX_CART_QUANTITY, PAYMENT_METHODS, ORDER_STATUSES, PAYMENT_STATUSES } from '../config/constants.js';
import { email, identifier, money, phone, quantity, requiredText, trimmed } from './common.validator.js';

const addressSchema = z.object({
  fullName: requiredText(120, 'Full name'),
  phone,
  email: email.optional().default(''),
  line1: requiredText(250, 'Address'),
  line2: trimmed(250).optional().default(''),
  city: trimmed(120).optional().default(''),
  state: trimmed(120).optional().default(''),
  pincode: trimmed(12).optional().default(''),
  landmark: trimmed(200).optional().default(''),
});

export const upsertCustomerSchema = z.object({
  body: z.object({
    name: requiredText(120, 'Name'),
    phone,
    email: email.optional().default(''),
    address: addressSchema.optional().nullable(),
    notes: trimmed(2000).optional().default(''),
  }),
});

export const listCustomersQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    search: trimmed(120).optional(),
    sort: trimmed(40).optional(),
    order: z.enum(['asc', 'desc']).optional(),
  }),
});

export const addCartItemSchema = z.object({
  body: z.object({
    productId: identifier,
    quantity: quantity.optional().default(1),
  }),
});

export const updateCartItemSchema = z.object({
  body: z.object({
    quantity: z.coerce
      .number()
      .int()
      .min(0, 'Use 0 to remove the item')
      .max(MAX_CART_QUANTITY, `Quantity cannot exceed ${MAX_CART_QUANTITY}`),
  }),
  params: z.object({ itemId: identifier }),
});

export const cartItemParamSchema = z.object({ itemId: identifier });

/**
 * Prices are never accepted from the client. Only identity, quantities and the
 * delivery preference are read; every amount is recomputed on the server.
 */
export const placeOrderSchema = z.object({
  body: z
    .object({
      customer: z.object({
        name: requiredText(120, 'Name'),
        phone,
        email: email.optional().default(''),
      }),
      deliveryAddress: addressSchema,
      // The client may say how it wants to be contacted; the server picks the rest.
      preferredContact: z.enum(['phone', 'whatsapp', 'email']).optional().default('phone'),
      paymentMethod: z.enum(PAYMENT_METHODS).optional(),
      // Optional convenience discount, validated against the minimum order value.
      discount: money.optional(),
      notes: trimmed(2000).optional().default(''),
      useCart: z.boolean().optional().default(true),
      // Direct purchase, used by the "buy now" style flows.
      items: z
        .array(z.object({ productId: identifier, quantity: quantity }))
        .min(1, 'Add at least one item')
        .max(50)
        .optional(),
    })
    .refine((value) => value.useCart || (Array.isArray(value.items) && value.items.length > 0), {
      message: 'Provide cart items or set useCart to true',
    }),
});

export const orderIdParamSchema = z.object({ orderId: identifier, id: identifier.optional() });

/** Customers address their order by its human reference, not its id. */
export const orderReferenceParamSchema = z.object({ reference: identifier });

export const customerIdParamSchema = z.object({ id: identifier });

export const listOrdersQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
    status: trimmed(40).optional(),
    paymentStatus: trimmed(40).optional(),
    search: trimmed(120).optional(),
    from: z.string().trim().optional(),
    to: z.string().trim().optional(),
    sort: trimmed(40).optional(),
    order: z.enum(['asc', 'desc']).optional(),
  }),
});

export const updateOrderStatusSchema = z.object({
  body: z.object({
    status: z.enum(ORDER_STATUSES, { message: 'Unknown order status' }),
    note: trimmed(500).optional().default(''),
  }),
  params: z.object({ id: identifier }),
});

export const updatePaymentStatusSchema = z.object({
  body: z.object({
    paymentStatus: z.enum(PAYMENT_STATUSES, { message: 'Unknown payment status' }).optional(),
    paidAmount: money.optional(),
    paymentReference: trimmed(120).optional().default(''),
    // Only a verified external payment may flip an order to Paid.
    verified: z.boolean().optional().default(false),
    note: trimmed(500).optional().default(''),
  })
    .refine((value) => value.paymentStatus !== undefined || value.paidAmount !== undefined, {
      message: 'Provide paymentStatus or paidAmount',
    }),
  params: z.object({ id: identifier }),
});

export const updateOrderDetailsSchema = z.object({
  body: z.object({
    internalNotes: trimmed(2000).optional(),
    notes: trimmed(2000).optional(),
    invoiceNumber: trimmed(60).optional(),
    deliveryFee: money.optional(),
  }),
  params: z.object({ id: identifier }),
});

export { addressSchema };
