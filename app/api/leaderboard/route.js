import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const LEADERBOARD_KEY = "galaxy-cat:runner:leaderboard:v1";
const MAX_PUBLIC_SCORES = 10;
const MAX_STORED_SCORES = 100;
const MAX_PLAYER_NAME_LENGTH = 18;
const MAX_SCORE = 999999;

function getRedisConfig() {
  const url =
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.REDIS_REST_API_URL ||
    "";
  const token =
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.REDIS_REST_API_TOKEN ||
    "";

  return {
    url: url.replace(/\/$/, ""),
    token,
    configured: Boolean(url && token),
  };
}

function cleanPlayerName(name) {
  const cleaned = String(name || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_PLAYER_NAME_LENGTH);

  return cleaned || "Alien Cat";
}

function cleanDeviceId(deviceId) {
  return String(deviceId || "unknown-device")
    .replace(/[^a-zA-Z0-9:_-]/g, "")
    .slice(0, 96) || "unknown-device";
}

function cleanScore(score) {
  return Math.min(MAX_SCORE, Math.max(0, Math.floor(Number(score) || 0)));
}

async function redisCommand(command) {
  const config = getRedisConfig();

  if (!config.configured) {
    const error = new Error("Redis REST environment variables are not configured.");
    error.code = "REDIS_NOT_CONFIGURED";
    throw error;
  }

  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data?.error) {
    throw new Error(data?.error || `Redis command failed with status ${response.status}`);
  }

  return data?.result;
}

function parseScoreList(result) {
  if (!Array.isArray(result)) return [];

  const scores = [];
  for (let i = 0; i < result.length; i += 2) {
    const member = result[i];
    const redisScore = result[i + 1];

    try {
      const parsed = JSON.parse(member);
      scores.push({
        id: String(parsed.id || `score-${i}`),
        name: cleanPlayerName(parsed.name),
        score: cleanScore(parsed.score ?? redisScore),
        createdAt: parsed.createdAt ? String(parsed.createdAt) : new Date().toISOString(),
      });
    } catch {
      // Ignore malformed entries instead of breaking the scoreboard.
    }
  }

  return scores
    .sort((a, b) => b.score - a.score || new Date(a.createdAt) - new Date(b.createdAt))
    .slice(0, MAX_PUBLIC_SCORES);
}

async function readScores(limit = MAX_PUBLIC_SCORES) {
  const safeLimit = Math.min(MAX_PUBLIC_SCORES, Math.max(1, Math.floor(Number(limit) || MAX_PUBLIC_SCORES)));
  const result = await redisCommand(["ZREVRANGE", LEADERBOARD_KEY, "0", String(safeLimit - 1), "WITHSCORES"]);
  return parseScoreList(result);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get("limit") || MAX_PUBLIC_SCORES;

  if (!getRedisConfig().configured) {
    return NextResponse.json(
      {
        mode: "unconfigured",
        scores: [],
        message: "Add KV_REST_API_URL and KV_REST_API_TOKEN, or Upstash Redis REST env vars, to enable the shared scoreboard.",
      },
      { status: 503 },
    );
  }

  try {
    const scores = await readScores(limit);
    return NextResponse.json({ mode: "global", scores });
  } catch (error) {
    return NextResponse.json(
      {
        mode: "error",
        scores: [],
        message: error?.message || "Could not load the global scoreboard.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  if (!getRedisConfig().configured) {
    return NextResponse.json(
      {
        mode: "unconfigured",
        scores: [],
        message: "Add KV_REST_API_URL and KV_REST_API_TOKEN, or Upstash Redis REST env vars, to enable the shared scoreboard.",
      },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const score = cleanScore(body?.score);

    if (score <= 0) {
      return NextResponse.json(
        { mode: "global", scores: await readScores(), message: "Score must be above 0." },
        { status: 400 },
      );
    }

    const entry = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      name: cleanPlayerName(body?.name),
      score,
      deviceId: cleanDeviceId(body?.deviceId),
      createdAt: new Date().toISOString(),
    };

    await redisCommand(["ZADD", LEADERBOARD_KEY, String(entry.score), JSON.stringify(entry)]);
    await redisCommand(["ZREMRANGEBYRANK", LEADERBOARD_KEY, "0", String(-(MAX_STORED_SCORES + 1))]);

    const scores = await readScores();
    return NextResponse.json({ mode: "global", scores, saved: true });
  } catch (error) {
    return NextResponse.json(
      {
        mode: "error",
        scores: [],
        message: error?.message || "Could not save score.",
      },
      { status: 500 },
    );
  }
}
