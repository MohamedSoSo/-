import { z } from "zod";
import { RoleSchema, AuditActionSchema } from "./enums";

export const StaffMemberSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  role: RoleSchema,
  display_name: z.string().min(1).max(120),
  is_active: z.boolean().default(true),
  hired_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable(),
});
export type StaffMember = z.infer<typeof StaffMemberSchema>;

export const AuditLogSchema = z.object({
  id: z.string().uuid(),
  actor_id: z.string().uuid(),
  actor_role: RoleSchema,
  action: AuditActionSchema,
  target_table: z.string(),
  target_id: z.string(),
  before: z.record(z.unknown()).nullable(),
  after: z.record(z.unknown()).nullable(),
  reason: z.string().max(500).nullable(),
  created_at: z.string().datetime(),
});
export type AuditLog = z.infer<typeof AuditLogSchema>;

// Developer Portal-controlled entities — never hardcoded in the frontend.
export const FeatureFlagSchema = z.object({
  key: z.string().min(1).max(80),
  enabled: z.boolean(),
  description: z.string().max(280).nullable(),
  rollout_percentage: z.number().min(0).max(100).default(100),
  updated_at: z.string().datetime(),
  updated_by: z.string().uuid(),
});
export type FeatureFlag = z.infer<typeof FeatureFlagSchema>;

export const BrandAssetSchema = z.object({
  key: z.string().min(1).max(80), // e.g. "logo_primary", "hero_bg", "favicon"
  storage_path: z.string(), // Supabase Storage object path
  alt_text: z.string().max(200).nullable(),
  updated_at: z.string().datetime(),
  updated_by: z.string().uuid(),
});
export type BrandAsset = z.infer<typeof BrandAssetSchema>;

export const ThemeTokensSchema = z.object({
  key: z.string().min(1).max(80), // e.g. "customer", "pos" — per-app theme override
  tokens: z.record(z.string()), // CSS custom property name -> value
  updated_at: z.string().datetime(),
  updated_by: z.string().uuid(),
});
export type ThemeTokens = z.infer<typeof ThemeTokensSchema>;
