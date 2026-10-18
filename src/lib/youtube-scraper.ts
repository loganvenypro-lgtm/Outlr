/**
 * High-performance, Zero-Quota YouTube Data Scraper
 * Uses YouTube RSS feeds and native InnerTube v1 endpoints.
 * Completely immune to API quotas and capable of retrieving real-time data.
 */

export interface ScrapedRssVideo {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt: string;
  thumbnail: string;
  viewCount: number;
  likeCount?: number;
  channelId: string;
  channelTitle: string;
}

export interface ScrapedInnerTubeChannel {
  id: string;
  title: string;
  customUrl?: string;
  description?: string;
  thumbnail: string;
  subscriberCount?: number;
  subscriberText?: string;
  videoCount?: number;
}

export interface ScrapedInnerTubeVideo {
  id: string;
  title: string;
  viewsText?: string;
  viewCount: number;
  publishedTimeText?: string;
  durationFormatted?: string;
  durationSeconds?: number;
  thumbnail: string;
  channelTitle?: string;
  channelId?: string;
}

const INNERTUBE_CLIENT = {
  client: {
    clientName: "WEB",
    clientVersion: "2.20240401.01.00",
    hl: "fr",
    gl: "FR",
  },
};

const DEFAULT_HEADERS = {
  "Content-Type": "application/json",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept-Language": "fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7",
};

/**
 * 1. RSS FEED SCRAPER (Real-time live video releases & live stats)
 * 100% Free, Zero Quota, Updated in seconds
 */
export async function scrapeChannelRss(channelId: string): Promise<ScrapedRssVideo[]> {
  try {
    const cleanId = channelId.trim();
    const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(cleanId)}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": DEFAULT_HEADERS["User-Agent"],
        "Accept": "application/xml,text/xml,*/*",
      },
      next: { revalidate: 300 }, // 5 minutes cache
    });

    if (!res.ok) {
      return [];
    }

    const xml = await res.text();
    const entries: ScrapedRssVideo[] = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;

    while ((match = entryRegex.exec(xml)) !== null) {
      const block = match[1];

      const videoId =
        block.match(/<yt:videoId>(.*?)<\/yt:videoId>/)?.[1] ||
        block.match(/<id>yt:video:(.*?)<\/id>/)?.[1];
      const title = block.match(/<title>(.*?)<\/title>/)?.[1];
      const publishedAt = block.match(/<published>(.*?)<\/published>/)?.[1] || "";
      const updatedAt = block.match(/<updated>(.*?)<\/updated>/)?.[1] || "";
      const channelTitle = block.match(/<author>[\s\S]*?<name>(.*?)<\/name>/)?.[1] || "";

      // Media group
      const descMatch = block.match(/<media:description>([\s\S]*?)<\/media:description>/);
      const description = descMatch ? descMatch[1] : "";

      const thumbMatch = block.match(/<media:thumbnail[^>]+url="([^"]+)"/);
      const thumbnail = thumbMatch
        ? thumbMatch[1]
        : videoId
        ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
        : "";

      const viewsMatch = block.match(/<media:statistics[^>]+views="(\d+)"/);
      const viewCount = viewsMatch ? parseInt(viewsMatch[1], 10) : 0;

      const starMatch = block.match(/<media:starRating[^>]+count="(\d+)"/);
      const likeCount = starMatch ? parseInt(starMatch[1], 10) : undefined;

      if (videoId && title) {
        entries.push({
          id: videoId.trim(),
          title: decodeXmlEntities(title.trim()),
          description: decodeXmlEntities(description),
          publishedAt,
          updatedAt,
          thumbnail,
          viewCount,
          likeCount,
          channelId: cleanId,
          channelTitle: decodeXmlEntities(channelTitle),
        });
      }
    }

    return entries;
  } catch (err) {
    console.error("Error scraping channel RSS:", err);
    return [];
  }
}

/**
 * 2. INNERTUBE SEARCH SCRAPER (Unlimited free searches for channels and videos)
 */
export async function scrapeInnerTubeSearch(query: string): Promise<{
  channels: ScrapedInnerTubeChannel[];
  videos: ScrapedInnerTubeVideo[];
}> {
  try {
    const res = await fetch("https://www.youtube.com/youtubei/v1/search", {
      method: "POST",
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({
        context: INNERTUBE_CLIENT,
        query,
      }),
      next: { revalidate: 1800 },
    });

    if (!res.ok) {
      return { channels: [], videos: [] };
    }

    const data = await res.json();
    const contents =
      data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

    const channels: ScrapedInnerTubeChannel[] = [];
    const videos: ScrapedInnerTubeVideo[] = [];

    for (const section of contents) {
      const items = section.itemSectionRenderer?.contents || [];
      for (const item of items) {
        // Channel item
        if (item.channelRenderer) {
          const cr = item.channelRenderer;
          const subText =
            cr.videoCountText?.simpleText ||
            cr.subscriberCountText?.simpleText ||
            cr.subscriberCountText?.runs?.map((r: any) => r.text).join("") ||
            "";
          const subCount = parseSubscriberString(subText);
          const thumb = cr.thumbnail?.thumbnails?.slice(-1)[0]?.url || "";

          channels.push({
            id: cr.channelId,
            title: cr.title?.simpleText || cr.title?.runs?.[0]?.text || "Unknown",
            customUrl: cr.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl?.replace(/^\//, ""),
            description: cr.descriptionSnippet?.runs?.map((r: any) => r.text).join("") || "",
            thumbnail: thumb.startsWith("//") ? `https:${thumb}` : thumb,
            subscriberCount: subCount,
            subscriberText: subText,
          });
        }

        // Video item
        if (item.videoRenderer) {
          const vr = item.videoRenderer;
          const viewsText = vr.viewCountText?.simpleText || vr.shortViewCountText?.simpleText || "";
          const viewCount = parseViewCountString(viewsText);
          const thumb = vr.thumbnail?.thumbnails?.slice(-1)[0]?.url || "";
          const durText = vr.lengthText?.simpleText || "";

          videos.push({
            id: vr.videoId,
            title: vr.title?.runs?.map((r: any) => r.text).join("") || vr.title?.simpleText || "",
            viewsText,
            viewCount,
            publishedTimeText: vr.publishedTimeText?.simpleText,
            durationFormatted: durText,
            durationSeconds: parseFormattedDurationToSeconds(durText),
            thumbnail: thumb.startsWith("//") ? `https:${thumb}` : thumb,
            channelTitle: vr.ownerText?.runs?.[0]?.text,
            channelId: vr.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.browseId,
          });
        }
      }
    }

    return { channels, videos };
  } catch (err) {
    console.error("Error in scrapeInnerTubeSearch:", err);
    return { channels: [], videos: [] };
  }
}

/**
 * Parses numeric subscribers from strings like "522M subscribers", "1.2K abonnés"
 */
function parseSubscriberString(text: string): number | undefined {
  if (!text) return undefined;
  const clean = text.replace(/,/g, ".").replace(/\s/g, "");
  const match = clean.match(/([\d\.]+)([kKmMbB]?)/);
  if (!match) return undefined;
  const num = parseFloat(match[1]);
  const mult = match[2]?.toUpperCase();
  if (mult === "K") return Math.round(num * 1000);
  if (mult === "M") return Math.round(num * 1000000);
  if (mult === "B") return Math.round(num * 1000000000);
  return Math.round(num);
}

/**
 * Parses numeric views from strings like "129,590,298 views", "45 k vues"
 */
function parseViewCountString(text: string): number {
  if (!text) return 0;
  // If exact number "129,590,298 views"
  const digitsOnly = text.replace(/[^\d]/g, "");
  if (digitsOnly && digitsOnly.length > 5) {
    return parseInt(digitsOnly, 10);
  }
  return parseSubscriberString(text) || 0;
}

function parseFormattedDurationToSeconds(dur: string): number {
  if (!dur) return 0;
  const parts = dur.split(":").map((p) => parseInt(p, 10));
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return 0;
}

function decodeXmlEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

/**
 * 3. INNERTUBE CHANNEL VIDEO CRAWLER (Zero quota, scroll through all videos from the beginning)
 */
export async function scrapeChannelAllVideosInnerTube(
  channelId: string,
  maxLimit: number = 1000
): Promise<ScrapedInnerTubeVideo[]> {
  try {
    const cleanId = channelId.trim();
    const allVideos: ScrapedInnerTubeVideo[] = [];
    const seenIds = new Set<string>();

    let body: any = {
      context: INNERTUBE_CLIENT,
      browseId: cleanId,
      params: "EgZ2aWRlb3PyBgQKAjoA", // Videos tab
    };

    let continuationToken: string | null = null;
    let pages = 0;
    const maxPages = Math.ceil(maxLimit / 30);

    while (allVideos.length < maxLimit && pages < maxPages) {
      pages++;
      const res = await fetch("https://www.youtube.com/youtubei/v1/browse", {
        method: "POST",
        headers: DEFAULT_HEADERS,
        body: JSON.stringify(body),
      });

      if (!res.ok) break;
      const data = await res.json();

      let items: any[] = [];
      continuationToken = null;

      if (pages === 1) {
        const tabs = data.contents?.twoColumnBrowseResultsRenderer?.tabs || [];
        const videoTab = tabs.find(
          (t: any) =>
            t.tabRenderer?.title === "Vidéos" ||
            t.tabRenderer?.title === "Videos" ||
            t.tabRenderer?.selected
        );
        const richGrid = videoTab?.tabRenderer?.content?.richGridRenderer?.contents || [];

        for (const rg of richGrid) {
          if (rg.richItemRenderer?.content?.videoRenderer) {
            items.push(rg.richItemRenderer.content.videoRenderer);
          } else if (rg.continuationItemRenderer) {
            continuationToken =
              rg.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token;
          }
        }
      } else {
        const actions = data.onResponseReceivedActions || [];
        for (const action of actions) {
          const continuationItems =
            action.appendContinuationItemsAction?.continuationItems || [];
          for (const ci of continuationItems) {
            if (ci.richItemRenderer?.content?.videoRenderer) {
              items.push(ci.richItemRenderer.content.videoRenderer);
            } else if (ci.continuationItemRenderer) {
              continuationToken =
                ci.continuationItemRenderer?.continuationEndpoint?.continuationCommand?.token;
            }
          }
        }
      }

      if (items.length === 0) break;

      for (const vr of items) {
        if (!vr.videoId || seenIds.has(vr.videoId)) continue;
        seenIds.add(vr.videoId);

        const viewsText = vr.viewCountText?.simpleText || vr.shortViewCountText?.simpleText || "";
        const viewCount = parseViewCountString(viewsText);
        const thumb = vr.thumbnail?.thumbnails?.slice(-1)[0]?.url || "";
        const durText = vr.lengthText?.simpleText || "";

        allVideos.push({
          id: vr.videoId,
          title: vr.title?.runs?.map((r: any) => r.text).join("") || vr.title?.simpleText || "",
          viewsText,
          viewCount,
          publishedTimeText: vr.publishedTimeText?.simpleText,
          durationFormatted: durText,
          durationSeconds: parseFormattedDurationToSeconds(durText),
          thumbnail: thumb.startsWith("//") ? `https:${thumb}` : thumb,
          channelTitle: vr.ownerText?.runs?.[0]?.text,
          channelId: cleanId,
        });
      }

      if (!continuationToken) break;

      body = {
        context: INNERTUBE_CLIENT,
        continuation: continuationToken,
      };
    }

    return allVideos;
  } catch (err) {
    console.error("Error in scrapeChannelAllVideosInnerTube:", err);
    return [];
  }
}
