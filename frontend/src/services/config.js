/**
 * Single source for the backend API base URL.
 *
 * Production builds always talk to the deployed Render API. Local development
 * uses the Vite proxy (see vite.config.js), so the browser keeps calling the
 * relative /api path and cookies stay first-party.
 *
 * Guarded so the module can also be imported by the node smoke tests, where
 * import.meta.env does not exist.
 */
const PROD_API_BASE = 'https://anish-enterprises-crackers-shop-1.onrender.com/api';

const viteEnv = (typeof import.meta !== 'undefined' && import.meta.env) || {};

export const API_BASE = viteEnv.PROD
  ? PROD_API_BASE
  : viteEnv.VITE_API_URL || '/api';

export default API_BASE;
