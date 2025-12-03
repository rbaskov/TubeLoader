import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for authentication
export const sessions = sqliteTable(
  "sessions",
  {
    sid: text("sid").primaryKey(),
    sess: text("sess").notNull(),
    expire: text("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for authentication
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  username: text("username").unique(),
  passwordHash: text("password_hash"),
  email: text("email").unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  isAdmin: integer("is_admin").default(0),
  language: text("language").default("en"),
  theme: text("theme").default("light"),
  createdAt: text("created_at"),
  updatedAt: text("updated_at"),
});

// User settings for external integrations
export const userSettings = sqliteTable("user_settings", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  synologyEndpoint: text("synology_endpoint"),
  synologyUsername: text("synology_username"),
  synologyPassword: text("synology_password"),
  autoUploadToNas: integer("auto_upload_to_nas").default(1),
  youtubeCookies: text("youtube_cookies"),
  proxyEnabled: integer("proxy_enabled").default(0),
  proxyType: text("proxy_type").default("http"),
  proxyHost: text("proxy_host"),
  proxyPort: integer("proxy_port"),
  proxyUsername: text("proxy_username"),
  proxyPassword: text("proxy_password"),
  telegramBotToken: text("telegram_bot_token"),
  telegramChatId: text("telegram_chat_id"),
  jellyfinServerUrl: text("jellyfin_server_url"),
  jellyfinApiKey: text("jellyfin_api_key"),
  jellyfinLibraryId: text("jellyfin_library_id"),
  createdAt: text("created_at"),
  updatedAt: text("updated_at"),
});

// Download jobs
export const downloadJobs = sqliteTable("download_jobs", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  youtubeUrl: text("youtube_url").notNull(),
  videoTitle: text("video_title"),
  videoThumbnail: text("video_thumbnail"),
  format: text("format").notNull(),
  quality: text("quality"),
  status: text("status").notNull().default("queued"),
  progress: integer("progress").default(0),
  errorMessage: text("error_message"),
  filePath: text("file_path"),
  fileSize: integer("file_size"),
  uploadedToNas: integer("uploaded_to_nas").default(0),
  createdAt: text("created_at"),
  updatedAt: text("updated_at"),
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
