import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { DATA_DIR } from "@/lib/dataDir";

export interface DbChannel {
  id: string;
  youtubeChannelId: string;
  name: string;
  handle?: string;
  thumbnailUrl: string;
  subscriberCount?: number;
  totalViews: number;
  videoCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface DbVideo {
  id: string;
  youtubeVideoId: string;
  channelId: string; // foreign key to DbChannel.id
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
  viewCount: number;
  videoUrl: string;
  durationFormatted?: string;
  analyzedAt: string;
}

export interface DbBrand {
  id: string;
  name: string;
  normalizedName: string;
  website?: string;
  industry?: string;
  contactEmail?: string;
  contactRole?: string;
  logoUrl?: string;
  createdAt: string;
}

export type ConfidenceScore = "high" | "medium" | "low";
export type SponsorshipStatus = 
  | "sponsor_confirmed" 
  | "sponsor_probable" 
  | "unconfirmed_mention" 
  | "affiliate_link";

export interface DbSponsorship {
  id: string;
  brandId: string; // foreign key to DbBrand.id
  channelId: string; // foreign key to DbChannel.id
  videoId: string; // foreign key to DbVideo.id
  detectionMethod: "description_keyword" | "affiliate_url" | "promo_code" | "sponsorblock_timestamp" | "transcript";
  confidenceScore: ConfidenceScore;
  evidence: string;
  timeCode?: string;
  status: SponsorshipStatus;
  detectedAt: string;
}

export interface DbBrandNote {
  id: string;
  brandId: string;
  content: string;
  commercialStatus: "A contacter" | "Contacté" | "En discussion" | "Client" | "Non pertinent";
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DbFolder {
  id: string;
  name: string;
  color?: string;
  description?: string;
  createdAt: string;
}

export interface DbTrackedChannel {
  id: string;
  channelId: string;
  name: string;
  handle: string;
  avatar: string;
  subscribers: number;
  totalViews: number;
  videoCount: number;
  folderId?: string;
  tags: string[];
  notes?: string;
  baselineViews: number;
  lastCheckedAt: string;
  addedAt: string;
}

export interface DbChannelAlert {
  id: string;
  channelId: string;
  channelName: string;
  channelAvatar: string;
  videoId: string;
  videoTitle: string;
  videoThumbnail: string;
  publishedAt: string;
  views: number;
  baselineViews: number;
  outlierMultiplier: number;
  alertType: "breakout_video" | "high_velocity" | "subscriber_milestone" | "new_upload";
  severity: "high" | "medium" | "info";
  message: string;
  createdAt: string;
  isRead: boolean;
}

export interface DatabaseSchema {
  channels: DbChannel[];
  videos: DbVideo[];
  brands: DbBrand[];
  sponsorships: DbSponsorship[];
  brandNotes: DbBrandNote[];
  folders: DbFolder[];
  trackedChannels: DbTrackedChannel[];
  channelAlerts: DbChannelAlert[];
}

const DB_DIR = DATA_DIR;
const DB_FILE = path.join(DB_DIR, "sponsor_database.json");

const DEFAULT_DB: DatabaseSchema = {
  channels: [],
  videos: [],
  brands: [],
  sponsorships: [],
  brandNotes: [],
  folders: [
    { id: "f-tech", name: "Concurrents Tech & AI", color: "blue", createdAt: new Date().toISOString() },
    { id: "f-faceless", name: "Chaînes Faceless / Niche", color: "purple", createdAt: new Date().toISOString() },
    { id: "f-growth", name: "Inspiration Storytelling", color: "emerald", createdAt: new Date().toISOString() },
  ],
  trackedChannels: [],
  channelAlerts: [],
};

// Initialize file if not existing
function ensureDbFile(): void {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_DB, null, 2), "utf-8");
  }
}

export function readDatabase(): DatabaseSchema {
  try {
    ensureDbFile();
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    return {
      channels: parsed.channels || [],
      videos: parsed.videos || [],
      brands: parsed.brands || [],
      sponsorships: parsed.sponsorships || [],
      brandNotes: parsed.brandNotes || [],
      folders: parsed.folders && parsed.folders.length > 0 ? parsed.folders : DEFAULT_DB.folders,
      trackedChannels: parsed.trackedChannels || [],
      channelAlerts: parsed.channelAlerts || [],
    };
  } catch (err) {
    console.error("Error reading database:", err);
    return DEFAULT_DB;
  }
}

export function writeDatabase(data: DatabaseSchema): void {
  try {
    ensureDbFile();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing database:", err);
  }
}

// -------------------------------------------------------------
// Database Helper Methods (Upsert, Index, Relationships)
// -------------------------------------------------------------

export function upsertChannel(channel: Omit<DbChannel, "id" | "createdAt" | "updatedAt">): DbChannel {
  const db = readDatabase();
  const now = new Date().toISOString();
  const existingIndex = db.channels.findIndex((c) => c.youtubeChannelId === channel.youtubeChannelId);

  if (existingIndex >= 0) {
    db.channels[existingIndex] = {
      ...db.channels[existingIndex],
      ...channel,
      updatedAt: now,
    };
    writeDatabase(db);
    return db.channels[existingIndex];
  }

  const newChannel: DbChannel = {
    ...channel,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
  };
  db.channels.push(newChannel);
  writeDatabase(db);
  return newChannel;
}

export function upsertVideo(video: Omit<DbVideo, "id" | "analyzedAt">): DbVideo {
  const db = readDatabase();
  const now = new Date().toISOString();
  const existingIndex = db.videos.findIndex((v) => v.youtubeVideoId === video.youtubeVideoId);

  if (existingIndex >= 0) {
    db.videos[existingIndex] = {
      ...db.videos[existingIndex],
      ...video,
      analyzedAt: now,
    };
    writeDatabase(db);
    return db.videos[existingIndex];
  }

  const newVideo: DbVideo = {
    ...video,
    id: uuidv4(),
    analyzedAt: now,
  };
  db.videos.push(newVideo);
  writeDatabase(db);
  return newVideo;
}

export function upsertBrand(brand: {
  name: string;
  website?: string;
  industry?: string;
  contactEmail?: string;
  contactRole?: string;
  logoUrl?: string;
}): DbBrand {
  const db = readDatabase();
  const normalizedName = brand.name.toLowerCase().trim();
  const existing = db.brands.find((b) => b.normalizedName === normalizedName);

  if (existing) {
    let updated = false;
    if (brand.website && !existing.website) { existing.website = brand.website; updated = true; }
    if (brand.industry && !existing.industry) { existing.industry = brand.industry; updated = true; }
    if (brand.contactEmail && !existing.contactEmail) { existing.contactEmail = brand.contactEmail; updated = true; }
    if (brand.contactRole && !existing.contactRole) { existing.contactRole = brand.contactRole; updated = true; }
    if (updated) writeDatabase(db);
    return existing;
  }

  const newBrand: DbBrand = {
    id: uuidv4(),
    name: brand.name.trim(),
    normalizedName,
    website: brand.website,
    industry: brand.industry || "Sponsor Général",
    contactEmail: brand.contactEmail,
    contactRole: brand.contactRole,
    logoUrl: brand.logoUrl,
    createdAt: new Date().toISOString(),
  };

  db.brands.push(newBrand);
  writeDatabase(db);
  return newBrand;
}

export function recordSponsorship(sponsorship: Omit<DbSponsorship, "id" | "detectedAt">): DbSponsorship {
  const db = readDatabase();
  const existing = db.sponsorships.find(
    (s) => s.brandId === sponsorship.brandId && s.videoId === sponsorship.videoId
  );

  if (existing) {
    return existing;
  }

  const newSponsorship: DbSponsorship = {
    ...sponsorship,
    id: uuidv4(),
    detectedAt: new Date().toISOString(),
  };

  db.sponsorships.push(newSponsorship);
  writeDatabase(db);
  return newSponsorship;
}

export function getBrandCommercialNote(brandId: string): DbBrandNote | undefined {
  const db = readDatabase();
  return db.brandNotes.find((n) => n.brandId === brandId);
}

export function saveBrandCommercialNote(brandId: string, note: {
  content?: string;
  commercialStatus?: DbBrandNote["commercialStatus"];
  isFavorite?: boolean;
}): DbBrandNote {
  const db = readDatabase();
  const now = new Date().toISOString();
  const existingIndex = db.brandNotes.findIndex((n) => n.brandId === brandId);

  if (existingIndex >= 0) {
    db.brandNotes[existingIndex] = {
      ...db.brandNotes[existingIndex],
      ...note,
      updatedAt: now,
    };
    writeDatabase(db);
    return db.brandNotes[existingIndex];
  }

  const newNote: DbBrandNote = {
    id: uuidv4(),
    brandId,
    content: note.content || "",
    commercialStatus: note.commercialStatus || "A contacter",
    isFavorite: note.isFavorite || false,
    createdAt: now,
    updatedAt: now,
  };

  db.brandNotes.push(newNote);
  writeDatabase(db);
  return newNote;
}

// ----------------- FOLDERS MANAGEMENT -----------------
export function getFolders(): DbFolder[] {
  const db = readDatabase();
  return db.folders;
}

export function createFolder(name: string, color = "blue", description?: string): DbFolder {
  const db = readDatabase();
  const folder: DbFolder = {
    id: `f-${uuidv4().slice(0, 8)}`,
    name: name.trim(),
    color,
    description,
    createdAt: new Date().toISOString(),
  };
  db.folders.push(folder);
  writeDatabase(db);
  return folder;
}

export function deleteFolder(folderId: string): boolean {
  const db = readDatabase();
  const initialLength = db.folders.length;
  db.folders = db.folders.filter((f) => f.id !== folderId);
  // Reassign channels in deleted folder to undefined
  db.trackedChannels = db.trackedChannels.map((c) => (c.folderId === folderId ? { ...c, folderId: undefined } : c));
  writeDatabase(db);
  return db.folders.length < initialLength;
}

// ----------------- TRACKED CHANNELS MANAGEMENT -----------------
export function getTrackedChannels(folderId?: string): DbTrackedChannel[] {
  const db = readDatabase();
  if (folderId && folderId !== "all") {
    return db.trackedChannels.filter((c) => c.folderId === folderId);
  }
  return db.trackedChannels;
}

export function trackChannel(channelData: {
  channelId: string;
  name: string;
  handle: string;
  avatar: string;
  subscribers: number;
  totalViews: number;
  videoCount: number;
  folderId?: string;
  tags?: string[];
  notes?: string;
  baselineViews?: number;
}): DbTrackedChannel {
  const db = readDatabase();
  const existing = db.trackedChannels.find((c) => c.channelId === channelData.channelId);

  const now = new Date().toISOString();
  if (existing) {
    existing.folderId = channelData.folderId !== undefined ? channelData.folderId : existing.folderId;
    existing.notes = channelData.notes !== undefined ? channelData.notes : existing.notes;
    existing.tags = channelData.tags || existing.tags;
    existing.lastCheckedAt = now;
    writeDatabase(db);
    return existing;
  }

  const baseline = channelData.baselineViews || (channelData.videoCount > 0 ? Math.round(channelData.totalViews / channelData.videoCount) : 1000);

  const tracked: DbTrackedChannel = {
    id: uuidv4(),
    channelId: channelData.channelId,
    name: channelData.name,
    handle: channelData.handle,
    avatar: channelData.avatar,
    subscribers: channelData.subscribers,
    totalViews: channelData.totalViews,
    videoCount: channelData.videoCount,
    folderId: channelData.folderId,
    tags: channelData.tags || ["Concurrent"],
    notes: channelData.notes || "",
    baselineViews: baseline,
    lastCheckedAt: now,
    addedAt: now,
  };

  db.trackedChannels.push(tracked);
  writeDatabase(db);
  return tracked;
}

export function updateTrackedChannel(id: string, updates: Partial<DbTrackedChannel>): DbTrackedChannel | null {
  const db = readDatabase();
  const idx = db.trackedChannels.findIndex((c) => c.id === id || c.channelId === id);
  if (idx === -1) return null;

  db.trackedChannels[idx] = { ...db.trackedChannels[idx], ...updates };
  writeDatabase(db);
  return db.trackedChannels[idx];
}

export function untrackChannel(channelIdOrId: string): boolean {
  const db = readDatabase();
  const initialLength = db.trackedChannels.length;
  db.trackedChannels = db.trackedChannels.filter((c) => c.id !== channelIdOrId && c.channelId !== channelIdOrId);
  writeDatabase(db);
  return db.trackedChannels.length < initialLength;
}

// ----------------- CHANNEL ALERTS MANAGEMENT -----------------
export function getChannelAlerts(onlyUnread = false): DbChannelAlert[] {
  const db = readDatabase();
  const list = onlyUnread ? db.channelAlerts.filter((a) => !a.isRead) : db.channelAlerts;
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function createChannelAlert(alertData: Omit<DbChannelAlert, "id" | "createdAt" | "isRead">): DbChannelAlert {
  const db = readDatabase();
  // Prevent duplicate alert for the same video
  const existing = db.channelAlerts.find((a) => a.videoId === alertData.videoId && a.alertType === alertData.alertType);
  if (existing) return existing;

  const alert: DbChannelAlert = {
    ...alertData,
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    isRead: false,
  };

  db.channelAlerts.unshift(alert);
  if (db.channelAlerts.length > 100) {
    db.channelAlerts = db.channelAlerts.slice(0, 100);
  }
  writeDatabase(db);
  return alert;
}

export function markAlertAsRead(alertId: string): void {
  const db = readDatabase();
  const alert = db.channelAlerts.find((a) => a.id === alertId);
  if (alert) {
    alert.isRead = true;
    writeDatabase(db);
  }
}

export function markAllAlertsAsRead(): void {
  const db = readDatabase();
  db.channelAlerts.forEach((a) => {
    a.isRead = true;
  });
  writeDatabase(db);
}
