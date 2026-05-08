/**
 * Stub hook — returns hardcoded saved segments.
 *
 * ⚠️  No backend API for saved segments yet.
 * When the segments API is ready, replace this with a real fetch.
 * Flagged for backend follow-up.
 */
import type { SavedSegment } from "@/types";

const MOCK_SEGMENTS: SavedSegment[] = [
  { id: "s1", name: "High-value VIPs (Last 30 days)", count: 412 },
  { id: "s2", name: "Cart abandoners – this week",    count: 1284 },
  { id: "s3", name: "Trial ending in 3 days",         count: 96 },
  { id: "s4", name: "Manila metro – Active",          count: 3120 },
];

export function useSegments(): { segments: SavedSegment[]; loading: false } {
  return { segments: MOCK_SEGMENTS, loading: false };
}
