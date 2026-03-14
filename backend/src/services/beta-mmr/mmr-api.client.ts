/**
 * BETA_MMR: Temporary. Remove this file and the beta-mmr folder when replacing with
 * Apple/Samsung Health or per-user MMR OAuth. Search codebase for BETA_MMR to find all related code.
 */

import { env } from '../../config/env';

const MMR_BASE = 'https://mapmyride.api.ua.com/v7.2/workout';
const PAGE_SIZE = 40;

export type MMRWorkoutDto = {
  mmrWorkoutId: string;
  loggedAt: string; // ISO
  activityTypeIdOrName: string;
  durationMinutes: number;
  distanceKm: number | null;
  caloriesKcal: number | null;
  name?: string;
};

type MMRWorkoutRaw = {
  id?: string;
  name?: string;
  start_datetime?: string;
  _links?: {
    self?: { href?: string };
    activity_type?: { href?: string } | Record<string, unknown>;
  };
  aggregates?: {
    active_time_total?: number;
    elapsed_time_total?: number;
    distance_total?: number;
    metabolic_energy_total?: number;
  };
};

type MMRResponse = {
  _embedded?: {
    workouts?: Record<string, MMRWorkoutRaw> | MMRWorkoutRaw[];
  };
};

function getOptions(): RequestInit {
  const token = env.mmrBearerToken;
  const apiKey = env.mmrApiKey;
  if (!token || !apiKey) {
    throw new Error('MMR credentials not configured (MMR_API_KEY, MMR_BEARER_TOKEN).');
  }
  return {
    method: 'GET',
    headers: {
      accept: 'application/json, text/plain, */*',
      'api-key': apiKey,
      Authorization: `Bearer ${token}`,
      'user-agent': 'FitClub-Beta/1.0',
      origin: 'https://www.mapmyride.com',
      referer: 'https://www.mapmyride.com/',
    },
    redirect: 'follow',
  };
}

function extractWorkoutId(w: MMRWorkoutRaw): string {
  if (w.id) return String(w.id);
  const href = w._links?.self?.href;
  if (href) {
    const match = href.match(/\/([^/]+)\/?$/);
    if (match) return match[1];
  }
  return `mmr-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function extractActivityTypeIdOrName(w: MMRWorkoutRaw): string {
  const links = w._links?.activity_type;
  if (!links) return 'Unknown';
  const href = typeof links === 'object' && links !== null && 'href' in links ? (links as { href?: string }).href : undefined;
  if (href) {
    const match = href.match(/\/([^/]+)\/?$/);
    if (match) return match[1];
  }
  return 'Unknown';
}

function parseWorkout(w: MMRWorkoutRaw): MMRWorkoutDto | null {
  const agg = w.aggregates ?? {};
  const activeSec = agg.active_time_total ?? agg.elapsed_time_total ?? 0;
  const durationMinutes = Math.round((activeSec / 60) * 10) / 10;
  if (durationMinutes <= 0) return null;
  const distanceM = agg.distance_total ?? 0;
  const distanceKm = distanceM > 0 ? Math.round((distanceM / 1000) * 1000) / 1000 : null;
  const joules = agg.metabolic_energy_total ?? 0;
  const caloriesKcal = joules > 0 ? Math.round(joules * 0.0002388458966275 * 10) / 10 : null;
  const loggedAt = w.start_datetime ?? new Date().toISOString();
  return {
    mmrWorkoutId: extractWorkoutId(w),
    loggedAt,
    activityTypeIdOrName: extractActivityTypeIdOrName(w),
    durationMinutes,
    distanceKm,
    caloriesKcal,
    name: w.name,
  };
}

function getWorkoutsFromResponse(body: MMRResponse): MMRWorkoutRaw[] {
  const embedded = body._embedded?.workouts;
  if (!embedded) return [];
  if (Array.isArray(embedded)) return embedded;
  return Object.values(embedded);
}

/**
 * Fetch all workouts for one MMR user, in chunks of PAGE_SIZE.
 */
export async function fetchMMRWorkoutsForUser(mmrUserId: string): Promise<MMRWorkoutDto[]> {
  const out: MMRWorkoutDto[] = [];
  const options = getOptions();
  let offset = 0;
  let hasMore = true;
  while (hasMore) {
    const url = `${MMR_BASE}/?user=${encodeURIComponent(mmrUserId)}&limit=${PAGE_SIZE}&offset=${offset}&order_by=-start_datetime`;
    const res = await fetch(url, options);
    if (!res.ok) {
      throw new Error(`MMR API error ${res.status}: ${await res.text().catch(() => '')}`);
    }
    const data = (await res.json()) as MMRResponse;
    const rawList = getWorkoutsFromResponse(data);
    for (const w of rawList) {
      const dto = parseWorkout(w);
      if (dto) out.push(dto);
    }
    hasMore = rawList.length >= PAGE_SIZE;
    offset += PAGE_SIZE;
  }
  return out;
}
