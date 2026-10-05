import axios from 'axios';
import { products } from '../data/products';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
});

export const productService = {
  async list() {
    return products;
  },
  async getById(id) {
    return products.find((product) => product.id === id) || null;
  },
};

export const enquiryService = {
  mode: 'frontend-only',
  async submit(enquiry) {
    return {
      submittedAt: new Date().toISOString(),
      reference: enquiry.reference,
      enquiry,
    };
  },
};

export const authService = {
  async login(credentials) {
    return {
      mock: true,
      message: 'Authentication is prepared for a future backend and is not secure in this frontend demo.',
      email: credentials.email,
    };
  },
};
