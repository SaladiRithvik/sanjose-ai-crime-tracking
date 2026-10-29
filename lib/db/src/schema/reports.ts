import { pgTable, text, boolean, doublePrecision, integer, timestamp, pgEnum, index, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const reportStatus = pgEnum("safemap_report_status", ["pending", "approved", "denied", "removed"]);
export const reportsTable = pgTable("reports", {
  id: text("id").primaryKey(),
  description: text("description").notNull(),
  incidentCategory: text("incident_category").notNull(),
  latitude: doublePrecision("latitude").notNull(),
  longitude: doublePrecision("longitude").notNull(),
  locationLabel: text("location_label").notNull(),
  locationSource: text("location_source").notNull(),
  locationAddress: text("location_address"),
  locationConfirmed: boolean("location_confirmed").notNull(),
  incidentDate: text("incident_date").notNull().default(""),
  incidentTime: text("incident_time").notNull().default(""),
  imageUrl: text("image_url"),
  anonymous: boolean("anonymous").notNull().default(true),
  reporterDisplayName: text("reporter_display_name"),
  reporterRole: text("reporter_role").notNull(),
  status: reportStatus("status").notNull().default("pending"),
  isDemo: boolean("is_demo").notNull().default(false),
  source: text("source").notNull().default("user"),
  priority: text("priority").notNull().default("Normal"),
  analystNotes: text("analyst_notes").notNull().default(""),
  analystComment: text("analyst_comment").notNull().default(""),
  reviewedBy: text("reviewed_by").notNull().default(""),
  ownerKey: text("owner_key"),
  urgent: boolean("urgent").notNull().default(false),
  triage: jsonb("triage"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  moderatedAt: timestamp("moderated_at", { withTimezone: true }),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  resolvedBy: text("resolved_by").notNull().default(""),
  resolutionNote: text("resolution_note").notNull().default(""),
}, table => [index("reports_status_idx").on(table.status)]);

export const prototypeSessionsTable = pgTable("safemap_prototype_sessions", {
  tokenHash: text("token_hash").primaryKey(),
  role: text("role").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const reportUploadsTable = pgTable("safemap_report_uploads", {
  imageUrl: text("image_url").primaryKey(),
  objectPath: text("object_path").notNull(),
  ownerHash: text("owner_hash").notNull(),
  contentType: text("content_type").notNull(),
  size: integer("size").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertReportSchema = createInsertSchema(reportsTable).omit({ createdAt: true, updatedAt: true });
export type StoredReport = typeof reportsTable.$inferSelect;