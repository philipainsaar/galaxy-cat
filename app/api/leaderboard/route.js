import net from "node:net";
import tls from "node:tls";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const LEADERBOARD_KEY = "galaxy-cat:runner:leaderboard:v1";
const MAX_PUBLIC_SCORES = 10;
const MAX_STORED_SCORES = 100;
const MAX_PLAYER_NAME_LENGTH = 18;
const MAX_SCORE = 999999;
const REDIS_COMMAND_TIMEOUT_MS = 8000;

class RespIncompleteError extends Error {
  constructor() {
    super("RESP response is incomplete.");
    this.name = "RespIncompleteError";
  }
}

function getRedisConfig() {
  const redisUrl =
    process.env.REDIS_URL ||
    process.env.REDIS_TLS_URL ||
    process.env.REDISCLOUD_URL ||
    "";

  if (redisUrl) {
    return {
      mode: "url",
      redisUrl,
      configured: true,
    };
  }

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
    mode: "rest",
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

function encodeRedisCommand(command) {
  const parts = command.map((part) => Buffer.from(String(part)));
  const chunks = [Buffer.from(`*${parts.length}\r\n`)];

  for (const part of parts) {
    chunks.push(Buffer.from(`$${part.length}\r\n`), part, Buffer.from("\r\n"));
  }

  return Buffer.concat(chunks);
}

function readRespLine(buffer, index) {
  const lineEnd = buffer.indexOf("\r\n", index, "utf8");
  if (lineEnd === -1) throw new RespIncompleteError();
  return {
    line: buffer.toString("utf8", index, lineEnd),
    nextIndex: lineEnd + 2,
  };
}

function parseRespValue(buffer, index = 0) {
  if (index >= buffer.length) throw new RespIncompleteError();

  const prefix = String.fromCharCode(buffer[index]);
  const start = index + 1;

  if (prefix === "+") {
    const { line, nextIndex } = readRespLine(buffer, start);
    return { value: line, nextIndex };
  }

  if (prefix === "-") {
    const { line } = readRespLine(buffer, start);
    throw new Error(line || "Redis returned an error.");
  }

  if (prefix === ":") {
    const { line, nextIndex } = readRespLine(buffer, start);
    return { value: Number(line), nextIndex };
  }

  if (prefix === "$") {
    const { line, nextIndex } = readRespLine(buffer, start);
    const length = Number(line);
    if (length === -1) return { value: null, nextIndex };
    if (!Number.isFinite(length) || length < 0) throw new Error("Invalid Redis bulk string length.");

    const valueStart = nextIndex;
    const valueEnd = valueStart + length;
    const afterValue = valueEnd + 2;
    if (afterValue > buffer.length) throw new RespIncompleteError();

    return {
      value: buffer.toString("utf8", valueStart, valueEnd),
      nextIndex: afterValue,
    };
  }

  if (prefix === "*") {
    const { line, nextIndex } = readRespLine(buffer, start);
    const length = Number(line);
    if (length === -1) return { value: null, nextIndex };
    if (!Number.isFinite(length) || length < 0) throw new Error("Invalid Redis array length.");

    const value = [];
    let currentIndex = nextIndex;
    for (let i = 0; i < length; i += 1) {
      const parsed = parseRespValue(buffer, currentIndex);
      value.push(parsed.value);
      currentIndex = parsed.nextIndex;
    }

    return { value, nextIndex: currentIndex };
  }

  throw new Error(`Unsupported Redis response type: ${prefix}`);
}

function getRedisUrlCommands(redisUrlString, command) {
  let parsed;
  try {
    parsed = new URL(redisUrlString);
  } catch {
    const error = new Error("REDIS_URL is not a valid Redis connection URL.");
    error.code = "REDIS_BAD_URL";
    throw error;
  }

  const useTls = parsed.protocol === "rediss:";
  if (parsed.protocol !== "redis:" && parsed.protocol !== "rediss:") {
    const error = new Error("REDIS_URL must start with redis:// or rediss://.");
    error.code = "REDIS_BAD_URL";
    throw error;
  }

  const username = decodeURIComponent(parsed.username || "");
  const password = decodeURIComponent(parsed.password || "");
  const database = parsed.pathname.replace(/^\//, "");
  const port = Number(parsed.port || (useTls ? 6380 : 6379));

  const setupCommands = [];
  if (password) {
    setupCommands.push(username ? ["AUTH", username, password] : ["AUTH", password]);
  }
  if (database) {
    setupCommands.push(["SELECT", database]);
  }

  return {
    useTls,
    host: parsed.hostname,
    port,
    commands: [...setupCommands, command],
  };
}

async function redisUrlCommand(redisUrlString, command) {
  const { useTls, host, port, commands } = getRedisUrlCommands(redisUrlString, command);
  const payload = Buffer.concat(commands.map(encodeRedisCommand));

  return new Promise((resolve, reject) => {
    let settled = false;
    let responseBuffer = Buffer.alloc(0);
    let socket;

    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (socket) socket.destroy();
      if (error) reject(error);
      else resolve(value);
    };

    const timeout = setTimeout(() => {
      finish(new Error("Redis Cloud request timed out."));
    }, REDIS_COMMAND_TIMEOUT_MS);

    const onConnect = () => {
      socket.write(payload);
    };

    socket = useTls
      ? tls.connect({ host, port, servername: host }, onConnect)
      : net.connect({ host, port }, onConnect);

    socket.on("data", (chunk) => {
      responseBuffer = Buffer.concat([responseBuffer, chunk]);

      try {
        let index = 0;
        let lastValue;
        for (let i = 0; i < commands.length; i += 1) {
          const parsed = parseRespValue(responseBuffer, index);
          lastValue = parsed.value;
          index = parsed.nextIndex;
        }
        finish(null, lastValue);
      } catch (error) {
        if (error instanceof RespIncompleteError) return;
        finish(error);
      }
    });

    socket.on("error", (error) => {
      finish(error);
    });
  });
}

async function redisRestCommand(config, command) {
  if (!config.url || !config.token) {
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

async function redisCommand(command) {
  const config = getRedisConfig();

  if (!config.configured) {
    const error = new Error("Redis environment variables are not configured.");
    error.code = "REDIS_NOT_CONFIGURED";
    throw error;
  }

  if (config.mode === "url") {
    return redisUrlCommand(config.redisUrl, command);
  }

  return redisRestCommand(config, command);
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

function getMissingRedisMessage() {
  return "Add REDIS_URL from Redis Cloud in Vercel Environment Variables to enable the shared scoreboard.";
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get("limit") || MAX_PUBLIC_SCORES;

  if (!getRedisConfig().configured) {
    return NextResponse.json(
      {
        mode: "unconfigured",
        scores: [],
        message: getMissingRedisMessage(),
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
        message: getMissingRedisMessage(),
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
