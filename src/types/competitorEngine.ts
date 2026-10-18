export type NicheEditorialArchetype =
  | "video_essay_documentary"
  | "investigation_true_crime_mystery"
  | "finance_business_economics"
  | "tech_ai_software_reviews"
  | "gaming_challenges_entertainment"
  | "educational_science_engineering"
  | "fitness_health_lifestyle"
  | "storytelling_commentary"
  | "general_creator";

export interface ChannelEditorialProfile {
  id: string;
  title: string;
  handle: string;
  avatar: string;
  banner?: string;
  description: string;
  publishedAt: string;
  country?: string;
  subscriberCount: number;
  totalViews: number;
  videoCount: number;
  
  // Editorial Signature
  archetype: NicheEditorialArchetype;
  archetypeLabel: string;
  editorialTags: string[];
  titleFormulaStyle: string[];
  
  // Content & Audience metrics
  typicalViews: number;
  avgDurationSeconds: number;
  avgDurationFormatted: string;
  uploadFrequencyDays: number;
  longformRatio: number; // 0 to 1
  
  recentVideos: {
    id: string;
    title: string;
    thumbnail: string;
    publishedAt: string;
    views: number;
    durationFormatted: string;
    durationSeconds: number;
  }[];
}

export interface CompetitorSimilarityBreakdown {
  editorialArchetypeScore: number; // 35% weight: same content type & storytelling nature
  semanticTopicScore: number;       // 25% weight: topics covered in depth
  titleFormulaScore: number;        // 15% weight: framing & hook formula
  formatPacingScore: number;        // 15% weight: duration, long-form depth
  audienceScaleScore: number;       // 10% weight: scale & tier alignment
  
  sharedTopics: string[];
  comparableExplanations: string;
}

export interface AudienceDemographicsProfile {
  primaryAgeBracket: "13-17" | "18-24" | "25-34" | "35-44" | "45+";
  estimatedGenderSplit: { male: number; female: number }; // percentage e.g. 72 / 28
  intentArchetype: "High Adrenaline Spectacle" | "Deep Intellectual Curiosity" | "Casual Escapism" | "Skill & Practical Value";
  estimatedPacingRPM: "$3.50 - $7.00" | "$8.00 - $14.00" | "$1.50 - $3.20";
  geographicCore: string[]; // e.g. ["US", "UK", "CA", "DE"]
  retentionSignature: "High Spike & Fast Cuts" | "Slow Burn Longform" | "Narrative Cliffhangers";
}

export interface CompetitorChannel {
  channel: {
    id: string;
    title: string;
    handle: string;
    avatar: string;
    description: string;
    country?: string;
    subscriberCount: number;
    totalViews: number;
    videoCount: number;
    typicalViews: number;
    archetype: NicheEditorialArchetype;
    archetypeLabel: string;
  };
  similarityScore: number; // 0 - 100
  breakdown: CompetitorSimilarityBreakdown;
  coOccurrenceCount: number;
  
  // High-Barrier Proprietary Data Moats
  audienceDemographics: AudienceDemographicsProfile;
  audienceOverlapRatio: number; // Estimated 0 - 100% shared audience intersection
  packagingSimilarity: number; // Face vs Object focus, typography, bright saturated vs cinematic dark
  
  topSimilarVideos: {
    id: string;
    title: string;
    thumbnail: string;
    views: number;
    durationFormatted: string;
    publishedAt: string;
  }[];
  discoverySource: "editorial_graph" | "co_occurrence" | "semantic_niche" | "audience_overlap";
}

export interface SimilarChannelsEngineResponse {
  reference: ChannelEditorialProfile & {
    demographics?: AudienceDemographicsProfile;
  };
  competitors: CompetitorChannel[];
  totalCandidatesEvaluated: number;
  editorialSignature: {
    archetype: string;
    keyThemes: string[];
    titlePatterns: string[];
    avgDuration: string;
  };
  executionTimeMs: number;
}
