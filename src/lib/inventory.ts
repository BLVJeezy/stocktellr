export type Category = {
  key: string;
  name: string;
  short: string;
  locations: string[];
  units: string[];
};

export const CATEGORIES: Category[] = [
  {
    key: "snoeptoog",
    name: "Snoeptoog",
    short: "ST",
    locations: ["Voorraadhok", "Toog"],
    units: ["LOS", "DOOS"],
  },
  {
    key: "ijs_berging",
    name: "Ijs Berging",
    short: "IJS",
    locations: ["Berging", "Vriezer"],
    units: ["LOS", "DOOS"],
  },
  {
    key: "frigo_los",
    name: "Frigo Los",
    short: "FL",
    locations: ["Rek 1", "Rek 2"],
    units: ["LOS"],
  },
  {
    key: "frigo_trays",
    name: "Frigo Trays & Berging",
    short: "FT",
    locations: ["Frigo", "Berging"],
    units: ["TRAYS", "LOS"],
  },
  {
    key: "haribo",
    name: "Haribo",
    short: "HB",
    locations: ["Voorraad Klein"],
    units: ["KG", "BAK"],
  },
];

export function getCategory(key: string): Category | undefined {
  return CATEGORIES.find((c) => c.key === key);
}

export type Item = {
  id: string;
  category: string;
  name: string;
  unit: string;
  sort_order: number;
  image_url: string | null;
};

export type Count = {
  id: string;
  item_id: string;
  location: string;
  qty: number;
};

export function toCsv(rows: string[][]): string {
  return rows
    .map((r) =>
      r
        .map((cell) => {
          const v = cell ?? "";
          return /[",;\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
        })
        .join(";"),
    )
    .join("\r\n");
}

/** Evaluates a simple counting formula like "10+20+56" or "12*3-4". Returns null when invalid. */
export function evalFormula(input: string): number | null {
  const expr = input.replace(/,/g, ".").replace(/\s+/g, "");
  if (!/^[0-9+\-*/.()]+$/.test(expr)) return null;
  try {
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict";return (${expr});`)();
    return typeof result === "number" && Number.isFinite(result) ? result : null;
  } catch {
    return null;
  }
}
