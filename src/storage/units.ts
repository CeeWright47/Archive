export type Units = "imperial" | "metric";

const CM_PER_INCH = 2.54;
const LB_PER_KG = 2.2046226218;

export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = Math.round(cm / CM_PER_INCH);
  return { feet: Math.floor(totalInches / 12), inches: totalInches % 12 };
}

export function feetInchesToCm(feet: number, inches: number): number {
  return Math.round((feet * 12 + inches) * CM_PER_INCH * 10) / 10;
}

export function kgToLb(kg: number): number {
  return Math.round(kg * LB_PER_KG);
}

export function lbToKg(lb: number): number {
  return Math.round((lb / LB_PER_KG) * 10) / 10;
}

export function formatHeight(cm: number | null, units: Units): string | null {
  if (cm === null) return null;
  if (units === "metric") return `${Math.round(cm)} cm`;
  const { feet, inches } = cmToFeetInches(cm);
  return `${feet}'${inches}"`;
}

export function formatWeight(kg: number | null, units: Units): string | null {
  if (kg === null) return null;
  return units === "metric" ? `${Math.round(kg)} kg` : `${kgToLb(kg)} lb`;
}
