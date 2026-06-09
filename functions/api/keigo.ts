// functions/api/keigo.ts
// 敬語変換ツールのAPIエンドポイント（OpenRouter版）
import type { EventContext } from "@cloudflare/workers-types";

interface Env {
  OPENROUTER_API_KEY: string;
  DB: D1Database;
}

const SYSTEM_PROMPT = `あなたは日本語の敬語変換の専門家です。
ユーザーが入力したテキストを、ビジネスシーンで使える適切な敬語に変換してください。

ルール：
- 丁寧語・尊敬語・謙譲語を適切に使い分ける
- 自然で読みやすい文章にする
- 変換後の文章のみを出力する（説明不要）
- 元の意味を変えない

出力形式：変換後のテキストのみ。前置きや説明は不要。`;

// 無料モデル（OpenRouter）。:free サフィックスが無料の印。
const PRIMARY_MODEL = "meta-llama/llama-3.3-70b-instruct:free";
const FALLBACK_MODEL = "deepseek/deepseek-chat-v3.1:free";

export async function onRequestPost(
  ctx: EventContext<Env, string, Record<string, unknown>>
) {
  const { request, env } = ctx;

  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const toolName = "keigo";

  // --- レート制限チェック（1IP/1時間20回）---
  const rateLimitKey = `ratelimit:${ip}:${toolName}`;
  const rateRow = await env.DB.prepare(
    "SELECT count FROM rate_limits WHERE key = ? AND reset_at > unixepoch()"
  ).bind(rateLimitKey).first<{ count: number }>();

  if (rateRow && rateRow.count >= 20) {
    return jsonResponse(
      { error: "リクエスト上限（1時間20回）に達しました。しばらくお待ちください。" },
      429
    );
  }

  // --- 入力チェック ---
  let body: { input?: string };
  try {
    body = await request.json() as { input?: string };
  } catch {
    return jsonResponse({ error: "リクエストの形式が不正です。" }, 400);
  }

  const input = (body.input ?? "").trim().slice(0, 1000);
  if (!input) {
    return jsonResponse({ error: "テキストを入力してください。" }, 400);
  }

  // --- D1キャッシュ確認（無料枠節約の要）---
  const cacheKey = `cache:${toolName}:${simpleHash(input)}`;
  const cached = await env.DB.prepare(
    "SELECT result FROM cache WHERE key = ? AND expires_at > unixepoch()"
  ).bind(cacheKey).first<{ result: string }>();

  if (cached) {
    return jsonResponse({ result: cached.result, cached: true });
  }

  // --- OpenRouter API呼び出し（プライマリ→フォールバック）---
  let result: string;
  try {
    result = await callOpenRouter(env.OPENROUTER_API_KEY, PRIMARY_MODEL, input);
  } catch (e1) {
    console.error("Primary model failed:", e1);
    try {
      result = await callOpenRouter(env.OPENROUTER_API_KEY, FALLBACK_MODEL, input);
    } catch (e2) {
      console.error("Fallback model failed:", e2);
      return jsonResponse(
        { error: "AIサービスが一時的に利用できません。しばらくお待ちください。" },
        503
      );
    }
  }

  // --- D1にキャッシュ保存（7日間。無料枠が少ないので長めに）---
  await env.DB.prepare(
    "INSERT OR REPLACE INTO cache (key, result, expires_at) VALUES (?, ?, unixepoch() + 604800)"
  ).bind(cacheKey, result).run();

  // --- レート制限カウント更新 ---
  await env.DB.prepare(`
    INSERT INTO rate_limits (key, count, reset_at)
    VALUES (?, 1, unixepoch() + 3600)
    ON CONFLICT(key) DO UPDATE SET count = count + 1
  `).bind(rateLimitKey).run();

  return jsonResponse({ result });
}

// OpenRouter APIを呼び出す（OpenAI互換）
async function callOpenRouter(
  apiKey: string,
  model: string,
  userInput: string
): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      // OpenRouterは任意でこれらのヘッダーを推奨（無くても動く）
      "HTTP-Referer": "https://your-site.pages.dev",
      "X-Title": "AI Tool Site",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userInput },
      ],
      max_tokens: 512,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter ${res.status}: ${err}`);
  }

  const data = await res.json() as {
    choices: { message: { content: string } }[];
  };
  return data.choices[0].message.content.trim();
}

// 簡易ハッシュ（キャッシュキー用）
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (Math.imul(31, hash) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

// JSONレスポンスヘルパー
function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
