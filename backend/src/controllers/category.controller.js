import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { sendCreated, sendNoContent, sendSuccess } from '../utils/response.js';
import { Category } from '../models/Category.js';
import { Product } from '../models/Product.js';
import { CATEGORY_TONES } from '../config/constants.js';
import { categoryLabel } from '../services/excel.service.js';
import { listCategories } from '../services/product.service.js';
import { slugify } from '../utils/ids.js';
import { uploadImages } from '../services/storage.service.js';

export const getCategories = asyncHandler(async (req, res) =>
  sendSuccess(res, { items: await listCategories() }),
);

export const adminGetCategories = asyncHandler(async (req, res) => {
  const items = await listCategories({ includeInactive: true });
  // Product counts let the admin see what a rename or deactivation would affect.
  const counts = await Product.aggregate([{ $group: { _id: '$category', count: { $sum: 1 } } }]);
  const byName = new Map(counts.map((row) => [row._id, row.count]));
  return sendSuccess(res, { items: items.map((item) => ({ ...item, productCount: byName.get(item.name) || 0 })) });
});

export const createCategory = asyncHandler(async (req, res) => {
  const name = String(req.body.name).trim();
  if (!name) throw ApiError.unprocessable('A category needs a name.', { code: 'category_name_required' });

  if (await Category.findOne({ name })) {
    throw ApiError.conflict(`A category called "${name}" already exists.`, { code: 'duplicate_category' });
  }

  const slug = slugify(req.body.slug || name);
  if (await Category.findOne({ slug })) {
    throw ApiError.conflict(`The slug "${slug}" is already in use.`, { code: 'duplicate_category_slug' });
  }

  const [category] = await Category.create([
    {
      name,
      slug,
      label: req.body.label || categoryLabel(name),
      description: req.body.description || '',
      tone: CATEGORY_TONES.includes(req.body.tone) ? req.body.tone : CATEGORY_TONES[0],
      order: req.body.order ?? (await Category.countDocuments()),
      isActive: req.body.isActive ?? true,
    },
  ]);

  return sendCreated(res, { category });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound('That category could not be found.', { code: 'category_not_found' });

  const body = req.body;
  if (body.name && body.name !== category.name) {
    const clash = await Category.findOne({ name: body.name });
    if (clash) throw ApiError.conflict(`A category called "${body.name}" already exists.`, { code: 'duplicate_category' });
  }
  if (body.slug && body.slug !== category.slug) {
    const clash = await Category.findOne({ slug: body.slug });
    if (clash) throw ApiError.conflict(`The slug "${body.slug}" is already in use.`, { code: 'duplicate_category_slug' });
  }

  for (const field of ['name', 'slug', 'label', 'description', 'tone', 'order', 'isActive']) {
    if (body[field] !== undefined) category[field] = body[field];
  }
  if (req.files?.length) {
    const [uploaded] = await uploadImages(req.files);
    category.image = uploaded.url;
  } else if (body.image !== undefined) {
    category.image = body.image;
  }

  // Products store the category name denormalised, so a rename has to follow.
  if (body.name && body.name !== category.name) {
    const previous = category.name;
    category.name = body.name;
    await category.save();
    await Product.updateMany({ category: previous }, { $set: { category: body.name, categoryRef: category._id } });
    return sendSuccess(res, { category, renamedFrom: previous, productsUpdated: true });
  }

  await category.save();
  return sendSuccess(res, { category });
});

export const removeCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound('That category could not be found.', { code: 'category_not_found' });

  const productCount = await Product.countDocuments({ category: category.name });
  if (productCount > 0) {
    // Never orphan products: deactivate instead of deleting.
    category.isActive = false;
    await category.save();
    return sendSuccess(res, {
      category,
      deactivated: true,
      reason: `${productCount} product(s) still use this category`,
    });
  }

  await category.deleteOne();
  return sendNoContent(res);
});
