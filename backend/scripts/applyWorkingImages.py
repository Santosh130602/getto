import json
from pathlib import Path

BACKEND_DATA = Path(__file__).resolve().parent.parent / "data"
PRODUCTS_FILE = BACKEND_DATA / "products.json"
BACKUP_FILE = BACKEND_DATA / "products.user_manual_backup.json"
VERIFIED_POOL_FILE = BACKEND_DATA / "verified_pool.json"
IMAGE_POOL_FILE = BACKEND_DATA / "image-pool.json"

def main():
    print("Loading data...")
    with open(PRODUCTS_FILE, "r", encoding="utf-8") as f:
        data = json.load(f)

    # 1. Restore user manual brand logos if backup exists
    if BACKUP_FILE.exists():
        with open(BACKUP_FILE, "r", encoding="utf-8") as f:
            backup_data = json.load(f)
        backup_brands = {b["name"]: b for b in backup_data.get("brands", [])}
        for brand in data.get("brands", []):
            b_name = brand.get("name")
            if b_name in backup_brands and backup_brands[b_name].get("logoUrl"):
                old_logo = brand.get("logoUrl")
                new_logo = backup_brands[b_name]["logoUrl"]
                if old_logo != new_logo:
                    print(f"Restoring manual logo for {b_name}: {new_logo[:60]}...")
                    brand["logoUrl"] = new_logo

    # 2. Load verified pools
    with open(VERIFIED_POOL_FILE, "r", encoding="utf-8") as f:
        verified_pool = json.load(f)

    # Populate category-level image-pool.json
    category_image_pool = {}
    for key, urls in verified_pool.items():
        _, cat = key.split(":", 1)
        if cat not in category_image_pool:
            category_image_pool[cat] = []
        category_image_pool[cat].extend(urls)

    with open(IMAGE_POOL_FILE, "w", encoding="utf-8") as f:
        json.dump(category_image_pool, f, indent=2)
    print(f"Updated {IMAGE_POOL_FILE} with {len(category_image_pool)} categories.")

    # 3. Update all products with working URLs
    cat_counters = {}
    updated_count = 0

    for p in data.get("products", []):
        aud = p.get("audience", "men")
        cat = p.get("category", "T-Shirts")
        pool_key = f"{aud}:{cat}"

        pool = verified_pool.get(pool_key)
        if not pool:
            # Fallback to category pool
            pool = category_image_pool.get(cat, [])

        if not pool:
            continue

        idx = cat_counters.get(pool_key, 0)
        cat_counters[pool_key] = idx + 1

        n = len(pool)
        # Select 4 distinct photos deterministically
        selected_images = [
            pool[(idx + 0) % n],
            pool[(idx + 1) % n],
            pool[(idx + 2) % n],
            pool[(idx + 3) % n],
        ]

        p["images"] = selected_images
        if p.get("isHero"):
            p["heroImage"] = selected_images[0]
        else:
            p["heroImage"] = None

        updated_count += 1

    with open(PRODUCTS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=1, ensure_ascii=False)

    print(f"Successfully updated {updated_count} products in {PRODUCTS_FILE} with verified real image URLs.")

if __name__ == "__main__":
    main()
