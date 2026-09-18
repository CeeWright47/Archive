// One-time backfill: infer pieces.subcategory from name keywords.
// Only fills rows where subcategory is null and exactly one subcategory matches.
// Usage: node scripts/infer-subcategories.cjs [--dry-run]

const fs = require("node:fs");
const path = require("node:path");
const { parseEnv } = require("node:util");
const postgres = require("postgres");

const dryRun = process.argv.includes("--dry-run");

const env = parseEnv(
  fs.readFileSync(path.resolve(__dirname, "..", ".env"), "utf8"),
);
if (!env.SUPABASE_DB_URL) {
  console.error("Missing SUPABASE_DB_URL in .env");
  process.exit(1);
}

const CATEGORY_ALIASES = {
  top: "Tops",
  tops: "Tops",
  bottom: "Bottoms",
  bottoms: "Bottoms",
  outerwear: "Outerwear",
  shoe: "Shoes",
  shoes: "Shoes",
  accessory: "Accessories",
  accessories: "Accessories",
};

// Keep in sync with src/storage/subcategories.ts. Keywords are matched as whole words.
const KEYWORDS = {
  Tops: {
    Tee: ["tee", "t-shirt", "tshirt", "t shirt"],
    Polo: ["polo"],
    "Button-up": [
      "button-up",
      "button up",
      "button-down",
      "button down",
      "oxford",
      "flannel",
      "dress shirt",
      "ocbd",
    ],
    Knit: [
      "knit",
      "sweater",
      "cardigan",
      "pullover",
      "crewneck sweater",
      "turtleneck",
    ],
    Jersey: ["jersey"],
    Tank: ["tank"],
    Sweatshirt: ["sweatshirt", "crewneck"],
    Hoodie: ["hoodie", "hooded"],
  },
  Bottoms: {
    Jeans: ["jeans", "denim"],
    Chinos: ["chino", "chinos", "khaki", "khakis"],
    Cargos: ["cargo", "cargos"],
    Shorts: ["shorts", "short"],
    Slacks: ["slacks", "trousers", "trouser", "dress pants", "wool pants"],
    Joggers: ["joggers", "jogger", "sweatpants", "track pants"],
  },
  Shoes: {
    Sneakers: [
      "sneaker",
      "sneakers",
      "trainers",
      "runners",
      "air force",
      "jordan",
      "dunk",
      "samba",
      "gazelle",
      "new balance",
      "nb",
    ],
    Boots: ["boot", "boots", "chelsea"],
    Loafers: ["loafer", "loafers", "penny"],
    "Boat shoes": ["boat shoe", "boat shoes", "top-sider", "sperry"],
    Mocs: ["moc", "mocs", "moccasin", "moccasins", "driver", "drivers"],
    Sandals: [
      "sandal",
      "sandals",
      "slide",
      "slides",
      "flip flop",
      "flip-flop",
      "birkenstock",
    ],
  },
  Outerwear: {
    Jacket: [
      "jacket",
      "bomber",
      "trucker",
      "windbreaker",
      "puffer",
      "blazer",
      "harrington",
      "varsity",
      "anorak",
    ],
    Coat: ["coat", "overcoat", "topcoat", "parka", "trench", "peacoat"],
    Overshirt: ["overshirt", "shacket", "chore"],
    Vest: ["vest", "gilet"],
  },
  Accessories: {
    Hat: ["hat", "cap", "beanie", "bucket"],
    Belt: ["belt"],
    Watch: ["watch"],
    Jewelry: [
      "jewelry",
      "chain",
      "necklace",
      "bracelet",
      "ring",
      "earring",
      "pendant",
    ],
    Bag: ["bag", "tote", "backpack", "crossbody", "duffle", "duffel", "sling"],
  },
};

function matchesKeyword(name, keyword) {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}(s)?($|[^a-z0-9])`, "i").test(name);
}

function infer(category, name) {
  const table = KEYWORDS[category];
  if (!table || !name) return null;
  const lower = name.toLowerCase();
  const hits = Object.entries(table)
    .filter(([, words]) => words.some((w) => matchesKeyword(lower, w)))
    .map(([sub]) => sub);
  return hits.length === 1 ? hits[0] : null;
}

const sql = postgres(env.SUPABASE_DB_URL, {
  ssl: "require",
  max: 1,
  connect_timeout: 10,
});

(async () => {
  try {
    const rows = await sql`
      select id, name, category from public.pieces where subcategory is null
    `;
    const updates = [];
    const unsure = [];
    for (const row of rows) {
      const category =
        CATEGORY_ALIASES[(row.category ?? "").trim().toLowerCase()];
      const sub = category ? infer(category, row.name) : null;
      if (sub) updates.push({ id: row.id, name: row.name, sub });
      else unsure.push(row.name);
    }

    if (!dryRun) {
      for (const u of updates) {
        await sql`update public.pieces set subcategory = ${u.sub} where id = ${u.id}`;
      }
    }

    console.log(
      `${dryRun ? "[dry-run] " : ""}inferred ${updates.length} of ${rows.length}`,
    );
    for (const u of updates) console.log(`  ${u.sub.padEnd(11)} ← ${u.name}`);
    if (unsure.length > 0) {
      console.log(`left null (${unsure.length}):`);
      for (const n of unsure) console.log(`  ${n}`);
    }
  } catch (error) {
    console.error("INFER_FAILED", error.message);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
})();
