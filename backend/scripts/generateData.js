// Deterministic dataset generator -> data/products.json
// Optional: put your own image URLs in data/image-pool.json, e.g.
//   { "T-Shirts": ["https://.../a.jpg", "https://.../b.jpg"] }
// Categories without a pool use category-matched images from LoremFlickr.
import fs from 'node:fs';

function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261024);
const pick = (a) => a[Math.floor(rand() * a.length)];
const int = (a, b) => a + Math.floor(rand() * (b - a + 1));
const shuffle = (a) => [...a].sort(() => rand() - 0.5);

const POOL = JSON.parse(fs.readFileSync(new URL('../data/image-pool.json', import.meta.url), 'utf8'));
const PER_CATEGORY = Number(process.env.PER_CATEGORY || 26);
const IMAGE_SEARCH_TERMS = {
  'T-Shirts': 't-shirt',
  Shirts: 'shirt',
  Bottomwear: 'jeans',
  'Hoodies & Jackets': 'hoodie',
  'Active Wear': 'sportswear',
  Socks: 'socks',
  'Festive Wear': 'kurta',
  Accessories: 'fashion-accessories',
  Tops: 'womens-top',
  Dresses: 'dress',
  Kurtis: 'kurti',
  Makeup: 'makeup',
  Handbags: 'handbag',
  Jewellery: 'jewelry',
  'Shorts & Bottoms': 'shorts',
  Toys: 'toys',
  Footwear: 'sneakers',
};

const LETTER = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const WAIST = ['28', '30', '32', '34', '36', '38'];
const KIDS = ['2-3Y', '4-5Y', '6-7Y', '8-9Y', '10-12Y'];
const FREE = ['Free'];

const CATALOG = {
  men: {
    'T-Shirts': { nouns: ['Oversized T-Shirt', 'Polo T-Shirt', 'Graphic Tee', 'Henley T-Shirt', 'Round Neck Tee'], price: [399, 1499], sizes: LETTER },
    'Shirts': { nouns: ['Casual Shirt', 'Linen Shirt', 'Striped Shirt', 'Oxford Shirt', 'Formal Shirt'], price: [699, 2499], sizes: LETTER },
    'Bottomwear': { nouns: ['Baggy Jeans', 'Slim Fit Chinos', 'Cargo Pants', 'Joggers', 'Straight Jeans'], price: [799, 2999], sizes: WAIST },
    'Hoodies & Jackets': { nouns: ['Pullover Hoodie', 'Zip Hoodie', 'Bomber Jacket', 'Denim Jacket', 'Windcheater'], price: [999, 3999], sizes: LETTER },
    'Active Wear': { nouns: ['Track Jacket', 'Training Tee', 'Running Shorts', 'Track Pants', 'Gym Vest'], price: [499, 2499], sizes: LETTER },
    'Socks': { nouns: ['Crew Socks', 'Ankle Socks', 'Sports Socks', 'Terry Socks'], price: [149, 499], sizes: FREE },
    'Festive Wear': { nouns: ['Kurta', 'Nehru Jacket', 'Kurta Set', 'Sherwani'], price: [1299, 5999], sizes: LETTER },
    'Accessories': { nouns: ['Leather Wallet', 'Sunglasses', 'Canvas Belt', 'Sling Bag', 'Baseball Cap'], price: [299, 1999], sizes: FREE },
  },
  women: {
    'Tops': { nouns: ['Crop Top', 'Peplum Top', 'Ribbed Tank', 'Wrap Top', 'Boxy Tee'], price: [399, 1699], sizes: LETTER },
    'Dresses': { nouns: ['Midi Dress', 'Wrap Dress', 'Maxi Dress', 'Shirt Dress', 'A-Line Dress'], price: [899, 3999], sizes: LETTER },
    'Kurtis': { nouns: ['Anarkali Kurti', 'Straight Kurti', 'Printed Kurti', 'Embroidered Kurti'], price: [599, 2499], sizes: LETTER },
    'Bottomwear': { nouns: ['Wide Leg Jeans', 'Palazzo Pants', 'Pleated Skirt', 'Leggings', 'Culottes'], price: [599, 2499], sizes: LETTER },
    'Makeup': { nouns: ['Matte Lipstick', 'Kajal Pencil', 'Compact Powder', 'Liquid Foundation', 'Eyeshadow Palette', 'Nail Polish Set'], price: [199, 1499], sizes: FREE },
    'Handbags': { nouns: ['Tote Bag', 'Sling Bag', 'Clutch', 'Satchel', 'Mini Backpack'], price: [699, 3499], sizes: FREE },
    'Jewellery': { nouns: ['Jhumka Earrings', 'Layered Necklace', 'Bangle Set', 'Stud Earrings', 'Charm Bracelet'], price: [249, 1999], sizes: FREE },
    'Active Wear': { nouns: ['Sports Bra', 'Yoga Pants', 'Training Jacket', 'Cycling Shorts'], price: [499, 2299], sizes: LETTER },
  },
  kids: {
    'T-Shirts': { nouns: ['Cartoon Tee', 'Striped Tee', 'Polo Tee', 'Graphic Tee'], price: [249, 899], sizes: KIDS },
    'Shorts & Bottoms': { nouns: ['Denim Shorts', 'Jogger Pants', 'Cargo Shorts', 'Leggings'], price: [299, 999], sizes: KIDS },
    'Dresses': { nouns: ['Party Frock', 'Cotton Frock', 'Tutu Dress', 'Denim Dress'], price: [449, 1799], sizes: KIDS },
    'Hoodies & Jackets': { nouns: ['Fleece Hoodie', 'Puffer Jacket', 'Zip Sweatshirt', 'Rain Jacket'], price: [599, 1999], sizes: KIDS },
    'Toys': { nouns: ['Building Blocks', 'Plush Teddy', 'Remote Car', 'Puzzle Set', 'Art Kit'], price: [199, 1999], sizes: FREE },
    'Footwear': { nouns: ['Velcro Sneakers', 'Sandals', 'Light-Up Shoes', 'Clogs'], price: [349, 1499], sizes: KIDS },
    'Accessories': { nouns: ['School Backpack', 'Hair Clip Set', 'Water Bottle', 'Sun Hat'], price: [149, 999], sizes: FREE },
  },
};

const BRANDS = [
  ['Islands of Loom', 'Island-soft everyday fits'], ['UrbanStitch', 'Street-ready essentials'],
  ['Threadly', 'Honest cotton basics'], ['Nomad Denim', 'Denim built to travel'],
  ['Aurora Wear', 'Colour for every mood'], ['Kiddo Club', 'Play-proof clothing'],
  ['GlowLab', 'Beauty that feels light'], ['Velvet Lane', 'Occasion & festive edit'],
  ['Stride Co', 'Move more, sweat less'], ['Saffron & Sage', 'Modern Indian wear'],
  ['BlueOak', 'Smart casual staples'], ['PlayPop', 'Joyful toys & gear'],
].map(([name, tagline], i) => ({
  name, tagline,
  logoUrl: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${['2f7ea3', '4fd1b9', '7c3aed', 'ea580c', 'db2777', '0f766e'][i % 6]}&color=fff&size=160&bold=true&format=png`,
}));

const ADJ = ['Classic', 'Essential', 'Everyday', 'Signature', 'Relaxed', 'Premium', 'Urban', 'Heritage', 'Breezy', 'Bold'];
const COLORS = ['Black', 'White', 'Navy', 'Olive', 'Beige', 'Maroon', 'Sky Blue', 'Charcoal', 'Mustard', 'Rose', 'Teal', 'Lavender'];
const MATERIAL = ['100% combed cotton', 'a soft cotton-poly blend', 'breathable linen blend', 'stretch-fit fabric', 'premium vegan leather', 'durable recycled fabric'];
const FEATURES = ['all-day comfort', 'a flattering fit', 'easy machine wash care', 'a lightweight feel', 'long-lasting colour', 'a modern silhouette'];

const STORES = [
  ['Getto Banjara Hills', 'Hyderabad', 1.2, 4.5], ['Getto Jubilee Hills', 'Hyderabad', 2.8, 4.4],
  ['Getto Gachibowli', 'Hyderabad', 5.1, 4.6], ['Getto Madhapur', 'Hyderabad', 4.3, 4.3],
  ['Getto Secunderabad', 'Hyderabad', 7.4, 4.2], ['Getto Kondapur', 'Hyderabad', 6.0, 4.5],
].map(([name, city, distanceKm, rating], i) => ({
  id: i + 1, name, city, distanceKm, rating, deliveryMinutes: 30 + i * 8,
  bannerUrl: `https://picsum.photos/seed/getto-store-${i + 1}/900/500`,
}));

const NAMES = ['Aarav S.', 'Ananya R.', 'Rohit K.', 'Sneha P.', 'Vikram T.', 'Priya M.', 'Karthik N.', 'Meera D.', 'Imran A.', 'Divya L.', 'Siddharth G.', 'Neha B.'];
const GOOD = [['Loved it', 'Fabric quality is great and the fit is exactly as shown.'], ['Worth the price', 'Looks premium and feels comfortable all day.'], ['Great buy', 'Colour is true to the photos. Delivery was quick too.'], ['Perfect fit', 'Size chart is accurate. Would order again.']];
const MID = [['Decent', 'Good for the price, though the stitching could be better.'], ['Okay product', 'Does the job. Colour is slightly different from the photos.']];
const BAD = [['Not for me', 'Fit was off and the material felt thin.']];

const imagesFor = (category, sku, n = 4) => {
  const pool = POOL[category];
  if (pool?.length) return shuffle(pool).slice(0, n);
  const searchTerm = IMAGE_SEARCH_TERMS[category] || 'clothing';
  const productId = Number(sku.match(/\d+$/)?.[0] || 0);
  return Array.from({ length: n }, (_, i) =>
    `https://loremflickr.com/600/750/${encodeURIComponent(searchTerm)}?lock=${productId * n + i + 1}`
  );
};
const price9 = (x) => Math.max(99, Math.round(x / 50) * 50 - 1);

const products = [];
let seq = 1000;
for (const [audience, cats] of Object.entries(CATALOG)) {
  for (const [category, def] of Object.entries(cats)) {
    for (let i = 0; i < PER_CATEGORY; i++) {
      const brand = pick(BRANDS).name;
      const noun = def.nouns[i % def.nouns.length];
      const colors = shuffle(COLORS).slice(0, 3);
      const sku = `GT-${audience.slice(0, 1).toUpperCase()}${category.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase()}-${seq++}`;
      const price = price9(def.price[0] + rand() * (def.price[1] - def.price[0]));
      const mrp = Math.max(price, price9(price * (1.15 + rand() * 0.5)));
      const reviews = Array.from({ length: int(2, 5) }, () => {
        const r = rand();
        const [rating, [title, comment]] = r < 0.6 ? [int(4, 5), pick(GOOD)] : r < 0.9 ? [3, pick(MID)] : [int(1, 2), pick(BAD)];
        return { userName: pick(NAMES), rating, title, comment, createdAt: new Date(Date.now() - int(1, 200) * 86400000).toISOString() };
      });
      const rating = Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10;
      products.push({
        sku,
        name: `${brand} ${pick(ADJ)} ${colors[0]} ${noun}`,
        description: `${noun} from ${brand}, made with ${pick(MATERIAL)}. Designed for ${pick(FEATURES)} and ${pick(FEATURES)}. Part of our ${category} collection for ${audience}.`,
        brand, audience, category, price, mrp, rating, reviewCount: reviews.length,
        stock: rand() < 0.08 ? 0 : int(3, 60),
        images: imagesFor(category, sku), sizes: def.sizes, colors,
        storeId: int(1, STORES.length), isHero: false, heroImage: null,
        createdAt: new Date(Date.now() - int(0, 365) * 86400000).toISOString(),
        reviews,
      });
    }
  }
}
for (const a of Object.keys(CATALOG)) {
  products.filter((p) => p.audience === a && p.stock > 0).sort((x, y) => y.rating - x.rating).slice(0, 4).forEach((p) => {
    p.isHero = true;
    p.heroImage = p.images[0];
  });
}
fs.writeFileSync(new URL('../data/products.json', import.meta.url), JSON.stringify({ brands: BRANDS, stores: STORES, products }, null, 1));
console.log(`Generated ${products.length} products, ${products.reduce((s, p) => s + p.reviews.length, 0)} reviews`);
