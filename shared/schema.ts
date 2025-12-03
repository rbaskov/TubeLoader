import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for authentication
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: varchar("username").unique(),
  passwordHash: varchar("password_hash"),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  isAdmin: integer("is_admin").default(0),
  language: varchar("language").default("en"),
  theme: varchar("theme").default("light"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User settings for external integrations
export const userSettings = pgTable("user_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  synologyEndpoint: varchar("synology_endpoint"),
  synologyUsername: varchar("synology_username"),
  synologyPassword: varchar("synology_password"),
  autoUploadToNas: integer("auto_upload_to_nas").default(1),
  youtubeCookies: text("youtube_cookies"),
  // Proxy settings for YouTube downloads
  proxyEnabled: integer("proxy_enabled").default(0),
  proxyType: varchar("proxy_type").default("http"), // http, https, socks4, socks5
  proxyHost: varchar("proxy_host"),
  proxyPort: integer("proxy_port"),
  proxyUsername: varchar("proxy_username"),
  proxyPassword: varchar("proxy_password"),
  telegramBotToken: varchar("telegram_bot_token"),
  telegramChatId: varchar("telegram_chat_id"),
  jellyfinServerUrl: varchar("jellyfin_server_url"),
  jellyfinApiKey: varchar("jellyfin_api_key"),
  jellyfinLibraryId: varchar("jellyfin_library_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Download jobs
export const downloadJobs = pgTable("download_jobs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  youtubeUrl: varchar("youtube_url").notNull(),
  videoTitle: varchar("video_title"),
  videoThumbnail: varchar("video_thumbnail"),
  format: varchar("format").notNull(), // 'audio' or 'video'
  quality: varchar("quality"), // '360p', '720p', '1080p', etc.
  status: varchar("status").notNull().default("queued"), // 'queued', 'downloading', 'converting', 'uploading', 'completed', 'failed'
  progress: integer("progress").default(0),
  errorMessage: text("error_message"),
  filePath: varchar("file_path"),
  fileSize: integer("file_size"),
  uploadedToNas: integer("uploaded_to_nas").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertUserSettingsSchema = createInsertSchema(userSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDownloadJobSchema = createInsertSchema(downloadJobs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type InsertUserSettings = z.infer<typeof insertUserSettingsSchema>;
export type UserSettings = typeof userSettings.$inferSelect;

export type InsertDownloadJob = z.infer<typeof insertDownloadJobSchema>;
export type DownloadJob = typeof downloadJobs.$inferSelect;

// API validation schemas
export const downloadRequestSchema = z.object({
  url: z.string().url().refine((url) => {
    return url.includes("youtube.com") || url.includes("youtu.be");
  }, "Must be a valid YouTube URL"),
  format: z.enum(["audio", "video"]),
  quality: z.string().optional(),
});

export const updateSettingsSchema = z.object({
  synologyEndpoint: z.string().url().optional().or(z.literal("")),
  synologyUsername: z.string().optional(),
  synologyPassword: z.string().optional(),
  autoUploadToNas: z.boolean().optional(),
  youtubeCookies: z.string().optional(),
  telegramBotToken: z.string().optional(),
  telegramChatId: z.string().optional(),
  jellyfinServerUrl: z.string().url().optional().or(z.literal("")),
  jellyfinApiKey: z.string().optional(),
  jellyfinLibraryId: z.string().optional(),
});

export const updatePreferencesSchema = z.object({
  language: z.enum(["en", "ru"]),
  theme: z.enum(["light", "dark"]),
});

export const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export type DownloadRequest = z.infer<typeof downloadRequestSchema>;
export type UpdateSettings = z.infer<typeof updateSettingsSchema>;
export type UpdatePreferences = z.infer<typeof updatePreferencesSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
export type RegisterRequest = z.infer<typeof registerSchema>;
