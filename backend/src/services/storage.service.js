import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

if (env.cloudinaryConfigured) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

const dataUri = (file) => `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

/**
 * Uploads product imagery. With Cloudinary configured the file is streamed to
 * the CDN and only the resulting URL is stored; otherwise the upload is refused
 * rather than silently discarded.
 */
export const uploadImages = async (files = []) => {
  if (!files.length) return [];
  if (!env.cloudinaryConfigured) {
    throw ApiError.unprocessable(
      'Image uploads need Cloudinary credentials. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET, or add the image URL directly.',
      { code: 'storage_not_configured' },
    );
  }

  const results = [];
  for (const file of files) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const uploaded = await cloudinary.uploader.upload(dataUri(file), {
        folder: 'crackers-shop/products',
        resource_type: 'image',
        overwrite: false,
      });
      results.push({ url: uploaded.secure_url, publicId: uploaded.public_id, alt: '' });
    } catch (error) {
      // The provider's own message is logged, not returned, so credentials and
      // internal detail cannot leak through the API.
      logger.error('image upload failed', { file: file.originalname, message: error.message });
      throw ApiError.unprocessable(`Could not upload ${file.originalname}.`, { code: 'upload_failed' });
    }
  }
  return results;
};

export const destroyImage = async (publicId) => {
  if (!publicId || !env.cloudinaryConfigured) return false;
  await cloudinary.uploader.destroy(publicId);
  return true;
};

export const storageStatus = () => ({
  provider: env.UPLOAD_STORAGE,
  configured: env.cloudinaryConfigured,
  maxUploadBytes: env.MAX_UPLOAD_BYTES,
});
