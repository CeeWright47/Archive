export interface StoreDefault {
  name: string;
  /** Used to fetch a logo; null for stores that aren't a single brand. */
  domain: string | null;
}

export const STORE_DEFAULTS: readonly StoreDefault[] = [
  { name: "H&M", domain: "hm.com" },
  { name: "Uniqlo", domain: "uniqlo.com" },
  { name: "J.Crew", domain: "jcrew.com" },
  { name: "Abercrombie", domain: "abercrombie.com" },
  { name: "Banana Republic", domain: "bananarepublic.com" },
  { name: "Nordstrom", domain: "nordstrom.com" },
  { name: "Zara", domain: "zara.com" },
  { name: "Nike", domain: "nike.com" },
  { name: "Foot Locker", domain: "footlocker.com" },
  { name: "Amazon", domain: "amazon.com" },
  { name: "Thrift / vintage", domain: null },
  { name: "Online marketplaces", domain: null },
];

export function storeDomainFor(name: string): string | null {
  return STORE_DEFAULTS.find((s) => s.name === name)?.domain ?? null;
}
