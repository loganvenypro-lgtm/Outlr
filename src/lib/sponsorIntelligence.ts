import { RecentVideo, SponsorDetection, VideoSponsorReport } from "@/types/youtube";
import { extractEmails } from "./utils";

export function formatSecondsToTime(seconds: number): string {
  const s = Math.round(seconds);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * MeetSponsors-grade Brand Intelligence Directory
 */
export const KNOWN_SPONSORS: Record<string, { 
  name: string; 
  email?: string; 
  category: string;
  website: string;
  contactRole?: string;
}> = {
  "nordvpn.com": { name: "NordVPN", email: "affiliate@nordvpnmedia.com", category: "Cybersecurity & VPN", website: "https://nordvpn.com", contactRole: "Influencer Marketing Manager" },
  "surfshark.deals": { name: "Surfshark", email: "affiliate@surfshark.com", category: "Cybersecurity & VPN", website: "https://surfshark.com", contactRole: "Partnership Lead" },
  "expressvpn.com": { name: "ExpressVPN", email: "affiliates@expressvpn.com", category: "Cybersecurity & VPN", website: "https://expressvpn.com", contactRole: "Media Buy Director" },
  "cyberghostvpn.com": { name: "CyberGhost", email: "affiliates@cyberghost.ro", category: "Cybersecurity & VPN", website: "https://cyberghostvpn.com", contactRole: "Affiliate Manager" },
  "betterhelp.com": { name: "BetterHelp", email: "influencers@betterhelp.com", category: "Health & Therapy", website: "https://betterhelp.com", contactRole: "Head of Creator Partnerships" },
  "functionhealth.com": { name: "Function Health", email: "partnerships@functionhealth.com", category: "Health & Biotech", website: "https://functionhealth.com", contactRole: "Growth & Collabs" },
  "athleticgreens.com": { name: "AG1 (Athletic Greens)", email: "partnerships@drinkag1.com", category: "Supplements", website: "https://drinkag1.com", contactRole: "Influencer Director" },
  "drinkag1.com": { name: "AG1 (Athletic Greens)", email: "partnerships@drinkag1.com", category: "Supplements", website: "https://drinkag1.com", contactRole: "Influencer Director" },
  "hellofresh.com": { name: "HelloFresh", email: "influencers@hellofresh.com", category: "Food & Meal Kits", website: "https://hellofresh.com", contactRole: "Talent Partnership Manager" },
  "factor75.com": { name: "Factor Meals", email: "partnerships@factor75.com", category: "Food & Meal Kits", website: "https://factor75.com", contactRole: "Brand Partnerships" },
  "step.com": { name: "Step Banking", email: "partners@step.com", category: "Fintech & Banking", website: "https://step.com", contactRole: "Creator Acquisition Lead" },
  "revolut.com": { name: "Revolut", email: "affiliates@revolut.com", category: "Fintech & Banking", website: "https://revolut.com", contactRole: "Growth & Affiliates" },
  "trade-republic.com": { name: "Trade Republic", email: "press@traderepublic.com", category: "Fintech & Investing", website: "https://traderepublic.com", contactRole: "Marketing Partnerships" },
  "casetify.com": { name: "CASETiFY", email: "collabs@casetify.com", category: "Tech Accessories", website: "https://casetify.com", contactRole: "Talent Relations" },
  "ridge.com": { name: "The Ridge Wallet", email: "partnerships@ridge.com", category: "Accessories & EDC", website: "https://ridge.com", contactRole: "Influencer Director" },
  "manscaped.com": { name: "Manscaped", email: "press@manscaped.com", category: "Grooming & Men's Care", website: "https://manscaped.com", contactRole: "VP of Influencer Marketing" },
  "dbrand.com": { name: "dbrand", email: "robots@dbrand.com", category: "Tech Skins & Cases", website: "https://dbrand.com", contactRole: "Sponsorship Unit" },
  "rayconglobal.com": { name: "Raycon", email: "affiliate@rayconglobal.com", category: "Audio & Electronics", website: "https://rayconglobal.com", contactRole: "Affiliate Manager" },
  "anker.com": { name: "Anker", email: "affiliate@anker.com", category: "Electronics", website: "https://anker.com", contactRole: "Global Influencer Lead" },
  "skillshare.com": { name: "Skillshare", email: "affiliates@skillshare.com", category: "Online Education", website: "https://skillshare.com", contactRole: "Head of Creator Partnerships" },
  "coursera.org": { name: "Coursera", email: "affiliates@coursera.org", category: "Online Education", website: "https://coursera.org", contactRole: "Brand Partnerships" },
  "audible.com": { name: "Audible", email: "influencers@audible.com", category: "Audiobooks & Media", website: "https://audible.com", contactRole: "Influencer Relations" },
  "squarespace.com": { name: "Squarespace", email: "partnerships@squarespace.com", category: "Web & Hosting", website: "https://squarespace.com", contactRole: "Creator Media Lead" },
  "hostinger.com": { name: "Hostinger", email: "affiliate@hostinger.com", category: "Web & Hosting", website: "https://hostinger.com", contactRole: "Affiliates & Sponsorships" },
  "wix.com": { name: "Wix", email: "affiliates@wix.com", category: "Web & Hosting", website: "https://wix.com", contactRole: "Influencer Relations" },
  "shopify.com": { name: "Shopify", email: "affiliates@shopify.com", category: "E-Commerce", website: "https://shopify.com", contactRole: "Creator Marketing" },
  "displate.com": { name: "Displate", email: "collab@displate.com", category: "Gaming & Art", website: "https://displate.com", contactRole: "Partnerships Manager" },
  "opera.com": { name: "Opera GX", email: "influencers@opera.com", category: "Gaming & Software", website: "https://opera.com", contactRole: "Gaming Partnerships Lead" },
  "honey.com": { name: "PayPal Honey", email: "partnerships@joinhoney.com", category: "Fintech & Coupons", website: "https://joinhoney.com", contactRole: "Influencer Director" },
  "joinhoney.com": { name: "PayPal Honey", email: "partnerships@joinhoney.com", category: "Fintech & Coupons", website: "https://joinhoney.com", contactRole: "Influencer Director" },
  "goodranchers.com": { name: "Good Ranchers", email: "support@goodranchers.com", category: "Food & Meat Delivery", website: "https://goodranchers.com", contactRole: "Partnership Team" },
  "ifit.com": { name: "iFIT", email: "support@ifit.com", category: "Fitness & Workouts", website: "https://ifit.com", contactRole: "Collabs & Sponsorships" },
  "airalo.com": { name: "Airalo", email: "partnerships@airalo.com", category: "Travel & eSIM", website: "https://airalo.com", contactRole: "Affiliate Specialist" },
  "incogni.com": { name: "Incogni", email: "affiliate@incogni.com", category: "Cybersecurity & Privacy", website: "https://incogni.com", contactRole: "Growth Team" },
  "babbel.com": { name: "Babbel", email: "influencers@babbel.com", category: "Online Education", website: "https://babbel.com", contactRole: "Influencer Lead" },
  "duolingo.com": { name: "Duolingo", email: "press@duolingo.com", category: "Online Education", website: "https://duolingo.com", contactRole: "Global Marketing" },
  "rhinoshield.com": { name: "RhinoShield", email: "sponsorship@rhinoshield.com", category: "Tech Accessories", website: "https://rhinoshield.com", contactRole: "Collabs Manager" },
  "notion.so": { name: "Notion", email: "community@makenotion.com", category: "Software & Productivity", website: "https://notion.so", contactRole: "Creator Programs Lead" },
  "grammarly.com": { name: "Grammarly", email: "affiliates@grammarly.com", category: "Software & Productivity", website: "https://grammarly.com", contactRole: "Growth & Collabs" },
};

/**
 * Query SponsorBlock API for exact sponsor segments & timecodes
 */
export async function getSponsorBlockTimestamps(videoId: string): Promise<{ start: number; end: number; duration: number }[]> {
  try {
    const url = `https://sponsor.ajay.app/api/skipSegments?videoID=${videoId}&categories=%5B%22sponsor%22%5D`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.map((item: any) => {
      const start = item.segment[0] || 0;
      const end = item.segment[1] || 0;
      return {
        start,
        end,
        duration: Math.max(0, end - start),
      };
    });
  } catch {
    return [];
  }
}

/**
 * Parse video description for sponsor links, promo codes & thank you notes
 */
export function extractSponsorsFromDescription(description: string): SponsorDetection[] {
  if (!description) return [];

  const detections: SponsorDetection[] = [];
  const lines = description.split("\n");
  const seenBrands = new Set<string>();

  // 1. Check known sponsor domains
  const urlMatches = Array.from(description.matchAll(/(https?:\/\/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})[^\s]*)/gi));

  for (const match of urlMatches) {
    const fullUrl = match[1];
    const domain = match[2]?.toLowerCase().replace(/^www\./, "");

    for (const [knownDomain, meta] of Object.entries(KNOWN_SPONSORS)) {
      if (domain === knownDomain || domain.endsWith("." + knownDomain)) {
        if (!seenBrands.has(meta.name)) {
          seenBrands.add(meta.name);
          detections.push({
            sponsorName: meta.name,
            sponsorUrl: fullUrl,
            sponsorEmail: meta.email,
            confidence: "high",
            contextSnippet: `Lien sponsorisé : ${fullUrl}`,
            category: meta.category,
          });
        }
      }
    }
  }

  // 2. Scan text lines for explicit patterns
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.length < 5) continue;

    const sponsorMatch = trimmed.match(/(?:thanks to|special thanks to|sponsored by|powered by|partner|brought to you by)\s+([A-Z][a-zA-Z0-9\s&'-]{2,30})/i);
    if (sponsorMatch) {
      const candidate = sponsorMatch[1]?.trim();
      if (candidate && !seenBrands.has(candidate) && !candidate.toLowerCase().includes("subscribe") && candidate.length > 2) {
        seenBrands.add(candidate);
        const lineUrl = trimmed.match(/(https?:\/\/[^\s]+)/i)?.[1];
        detections.push({
          sponsorName: candidate,
          sponsorUrl: lineUrl,
          confidence: "medium",
          contextSnippet: trimmed.slice(0, 160),
          category: "Marque Partenaire",
        });
      }
    }

    // Code promo matching
    const codeMatch = trimmed.match(/(?:use code|code|promo)\s+([A-Z0-9_-]{3,20})/i);
    if (codeMatch && detections.length > 0) {
      const last = detections[detections.length - 1];
      if (!last.contextSnippet.includes("Code Promo")) {
        last.contextSnippet += ` • Code Promo: ${codeMatch[1]}`;
      }
    }
  }

  return detections;
}

export async function auditChannelSponsors(videos: RecentVideo[]): Promise<VideoSponsorReport[]> {
  const reports: VideoSponsorReport[] = [];

  for (const video of videos) {
    const detected = extractSponsorsFromDescription(video.description);
    const emails = extractEmails(video.description);
    const timestamps = await getSponsorBlockTimestamps(video.id);

    if (timestamps.length > 0) {
      timestamps.forEach((ts, idx) => {
        const timeCodeStr = `${formatSecondsToTime(ts.start)} - ${formatSecondsToTime(ts.end)} (${Math.round(ts.duration)}s)`;

        if (detected[idx]) {
          detected[idx].timeCode = timeCodeStr;
          detected[idx].startSeconds = ts.start;
          detected[idx].endSeconds = ts.end;
          detected[idx].durationSeconds = ts.duration;
        } else {
          detected.push({
            sponsorName: `Sponsor Intégré #${idx + 1}`,
            timeCode: timeCodeStr,
            startSeconds: ts.start,
            endSeconds: ts.end,
            durationSeconds: ts.duration,
            confidence: "high",
            contextSnippet: `Segment publicitaire intégré repéré à ${timeCodeStr}`,
            category: "Segment Intégré (SponsorBlock)",
          });
        }
      });
    }

    reports.push({
      videoId: video.id,
      videoTitle: video.title,
      videoThumbnail: video.thumbnail,
      publishedAt: video.publishedAt,
      viewCount: video.viewCount,
      durationFormatted: video.durationFormatted,
      sponsors: detected,
      extractedEmails: emails,
    });
  }

  return reports;
}
