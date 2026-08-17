/**
 * Central asset registry. No component ever hardcodes an image path —
 * everything resolves through here, keyed the same as the `brand_assets`
 * table so the Developer Portal (/admin/developer) can override any of
 * these at runtime without a deploy.
 */

export const BRAND_ASSETS_BUCKET = "brand-assets";

export const ASSET_KEYS = {
  logoPrimary: "logo_primary",
  logoMonochrome: "logo_monochrome",
  favicon: "favicon",
  heroBgCustomer: "hero_bg_customer",
  heroBgPos: "hero_bg_pos",
  loginBg: "login_bg",
  menuPlaceholder: "menu_item_placeholder",
} as const;

export type AssetKey = (typeof ASSET_KEYS)[keyof typeof ASSET_KEYS];

// Local fallbacks bundled in each app's /public — used when a brand_assets
// row hasn't been set yet (fresh install) or the Storage fetch fails.
export const ASSET_FALLBACKS: Record<AssetKey, string> = {
  [ASSET_KEYS.logoPrimary]: "/assets/fallback/logo-primary.svg",
  [ASSET_KEYS.logoMonochrome]: "/assets/fallback/logo-mono.svg",
  [ASSET_KEYS.favicon]: "/favicon.ico",
  [ASSET_KEYS.heroBgCustomer]: "/assets/fallback/hero-customer.jpg",
  [ASSET_KEYS.heroBgPos]: "/assets/fallback/hero-pos.jpg",
  [ASSET_KEYS.loginBg]: "/assets/fallback/login-bg.jpg",
  [ASSET_KEYS.menuPlaceholder]: "/assets/fallback/menu-placeholder.jpg",
};
