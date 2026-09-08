/**
 * Local brand marks for known FIXTURE / demo portfolio names (V3-shaped book).
 * Auth book UI only — do not use on public marketing chrome.
 * Missing / invented fixture names fall back to the letter mark.
 */

const LOGO_BY_SLUG: Record<string, string> = {
  "salad-days": "/company-logos/salad-days.png",
  deconstruct: "/company-logos/deconstruct.png",
  "go-zero": "/company-logos/go-zero.png",
  hosteller: "/company-logos/hosteller.png",
  ugaoo: "/company-logos/ugaoo.png",
  wild: "/company-logos/wild.png",
  holy: "/company-logos/holy.png",
  yepoda: "/company-logos/yepoda.png",
  katkin: "/company-logos/katkin.png",
  "creme-castle": "/company-logos/creme-castle.png",
  cava: "/company-logos/cava.png",
  "lightfury-games": "/company-logos/lightfury-games.png",
  superyou: "/company-logos/superyou.png",
};

/** Normalized display-name → slug for the assets above. */
const NAME_ALIASES: Record<string, string> = {
  "salad days": "salad-days",
  deconstruct: "deconstruct",
  "the deconstruct": "deconstruct",
  "go zero": "go-zero",
  gozero: "go-zero",
  hosteller: "hosteller",
  "the hosteller": "hosteller",
  ugaoo: "ugaoo",
  wild: "wild",
  "we are wild": "wild",
  holy: "holy",
  yepoda: "yepoda",
  katkin: "katkin",
  "kat kin": "katkin",
  "creme castle": "creme-castle",
  "crème castle": "creme-castle",
  cava: "cava",
  "cava athleisure": "cava",
  "lightfury games": "lightfury-games",
  lightfury: "lightfury-games",
  superyou: "superyou",
  "super you": "superyou",
};

export function normalizeCompanyKey(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function companyLogoSlug(name: string): string | null {
  const key = normalizeCompanyKey(name);
  if (!key) return null;
  if (NAME_ALIASES[key]) return NAME_ALIASES[key];
  const dashed = key.replace(/\s+/g, "-");
  if (LOGO_BY_SLUG[dashed]) return dashed;
  return null;
}

export function companyLogoSrc(name: string): string | null {
  const slug = companyLogoSlug(name);
  return slug ? LOGO_BY_SLUG[slug] ?? null : null;
}
