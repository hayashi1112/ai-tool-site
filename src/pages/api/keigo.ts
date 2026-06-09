// src/pages/api/keigo.ts
// Astroエンドポイント形式のAPI（@astrojs/cloudflare対応）
import type { APIRoute } from "astro";

export const prerender = false; // SSR（動的処理）として扱う

const SYSTEM_PROMPT = `あなたは日本語の敬語変換の専門家です。
ユーザーが入力したテキストを、ビジネスシーンで使える適切な敬語に変換してください。

ルール：
- 丁寧語・尊敬語・謙譲語を適切に使い分ける
- 自然で読みやすい文章にする
- 変換後の文章のみを出力する（説明不要）
- 元の意味を変えない

出力形式：変換後のテキストのみ。前置きや説明は不要。`;

const PRIMARY_MODEL = "meta-llama/llama-3.3-70b-instruct:free";
const FALLBACK_MODEL = "mistralai/mistral-7b-instruct:free";

export const POST: APIRoute = async ({ request, locals }) => {
  // @astrojs/cloudflareではlocals.runtime.envからCloudflare環境変数にアクセス
  const runtime = (locals as { runtime?: { env?: Record<string, string> } }).runtime;
  const apiKey = runtime?.env?.OPENROUTER_API_KEY
    ?? (import.meta.env.OPENROUTER_API_KEY as string | undefined)
    ?? "";

  // 入力チェック
  let body: { input?: string };
  try {
    body = await request.json() as { input?: string };
  } catch {
    return json({ error: "リクエストの形式が不正です。" }, 400);
  }

  const input = (body.input ?? "").trim().slice(0, 1000);
  if (!input) {
    return json({ error: "テキストを入力してください。" }, 400);
  }

  if (!apiKey) {
    return json({ error: "APIキーが設定されていません。" }, 500);
  }

  // OpenRouter API呼び出し（プライマリ→フォールバック）
  let result: string;
  try {
    result = await callOpenRouter(apiKey, PRIMARY_MODEL, input);
  } catch (e1) {
    console.error("Primary model failed:", e1);
    try {
      result = await callOpenRouter(apiKey, FALLBACK_MODEL, input);
    } catch (e2) {
      console.error("Fallback model failed:", e2);
      return json({ error: "AIサービスが一時的に利用できません。しばらくお待ちください。" }, 503);
    }
  }

  return json({ result });
};

async function callOpenRouter(apiKey: string, model: string, userInput: string): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://ai-tool-site.pages.dev",
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

  const data = await res.json() as { choices: { message: { content: string } }[] };
  return data.choices[0].message.content.trim();
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
