import { z } from 'zod';

const emptyToUndef = (v) => (v === '' || v === null || v === undefined ? undefined : v);
const opt = (schema) => z.preprocess(emptyToUndef, schema.optional());
const csv = z.string().max(300).transform((s) => s.split(',').map((x) => x.trim()).filter(Boolean));

export const SORT_KEYS = ['relevance', 'price_asc', 'price_desc', 'rating', 'newest', 'name'];

export const searchSchema = z
  .object({
    q: opt(z.string().trim().max(100)),
    audience: opt(z.enum(['men', 'women', 'kids'])),
    category: opt(csv),
    brand: opt(csv),
    storeId: opt(z.coerce.number().int().positive()),
    minPrice: opt(z.coerce.number().min(0, 'minPrice cannot be negative').max(10_000_000)),
    maxPrice: opt(z.coerce.number().min(0, 'maxPrice cannot be negative').max(10_000_000)),
    minRating: opt(z.coerce.number().min(0).max(5)),
    inStock: opt(z.enum(['true', 'false']).transform((v) => v === 'true')),
    sort: opt(z.enum(SORT_KEYS)),
    page: opt(z.coerce.number().int().min(1).max(100000)),
    limit: opt(z.coerce.number().int().min(1).max(100)),
  })
  .refine((d) => d.minPrice == null || d.maxPrice == null || d.minPrice <= d.maxPrice, {
    message: 'minPrice cannot be greater than maxPrice',
    path: ['minPrice'],
  });

export const idSchema = z.coerce.number().int().positive();

export const reviewSchema = z.object({
  userName: z.string().trim().min(2).max(60),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(120).optional(),
  comment: z.string().trim().min(3).max(1000),
});

export const orderSchema = z.object({
  clientId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.coerce.number().int().positive(),
    qty: z.coerce.number().int().min(1).max(10),
    size: z.string().max(10).optional(),
  })).min(1).max(50),
  address: z.object({
    name: z.string().trim().min(2).max(80),
    phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number'),
    line1: z.string().trim().min(5).max(200),
    city: z.string().trim().min(2).max(60),
    pincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
  }),
  paymentMethod: z.enum(['cod']).default('cod'),
});
