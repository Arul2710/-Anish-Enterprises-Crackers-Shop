import { readArray, writeStorage } from '../utils/storage';
import { enquiryService } from './api';
import { createOrderFromEnquiry } from './orders';

export const enquirySubmissionStorageKey = 'spark-shine-enquiries';

const sanitizeEnquiry = (value) => {
  if (!value || typeof value !== 'object' || !value.reference) return null;
  return {
    reference: String(value.reference),
    createdAt: value.createdAt || new Date().toISOString(),
    name: String(value.name || ''),
    mobile: String(value.mobile || ''),
    email: String(value.email || ''),
    address: String(value.address || ''),
    pin: String(value.pin || ''),
    city: String(value.city || ''),
    occasion: String(value.occasion || ''),
    notes: String(value.notes || ''),
    preferredContact: String(value.preferredContact || 'Phone call'),
    items: Array.isArray(value.items)
      ? value.items.map((item) => ({
          id: String(item.id || ''),
          name: String(item.name || ''),
          category: String(item.category || ''),
          packSize: String(item.packSize || ''),
          quantity: Number(item.quantity) || 0,
          customerPrice: Number(item.customerPrice) || 0,
        }))
      : [],
    indicativeTotal: Number(value.indicativeTotal) || 0,
    status: String(value.status || 'Received'),
  };
};

export const listEnquiries = () => readArray(enquirySubmissionStorageKey).map(sanitizeEnquiry).filter(Boolean);

export const createReference = () => {
  const stamp = Date.now().toString(36).toUpperCase().slice(-5);
  const suffix = Math.random().toString(36).toUpperCase().slice(2, 5);
  return `ENQ-${stamp}${suffix}`;
};

export const submitEnquiry = async (payload) => {
  const enquiry = sanitizeEnquiry({ ...payload, reference: payload.reference || createReference(), createdAt: new Date().toISOString() });
  if (!enquiry) throw new Error('Enquiry details are incomplete.');

  const stored = listEnquiries();
  writeStorage(enquirySubmissionStorageKey, [enquiry, ...stored]);
  // Every storefront enquiry also lands in admin order management as a new order.
  createOrderFromEnquiry(enquiry);
  await enquiryService.submit(enquiry);
  return enquiry;
};

export const updateEnquiryStatus = (reference, status) => {
  const next = listEnquiries().map((enquiry) => (enquiry.reference === reference ? { ...enquiry, status } : enquiry));
  writeStorage(enquirySubmissionStorageKey, next);
  return next;
};
