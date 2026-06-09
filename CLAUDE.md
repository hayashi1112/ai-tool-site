# AIツールサイト - Claude Code グローバル設定

## プロジェクト概要
日本語AIライティング補助ツール集サイト。
OpenRouter API（無料）+ Cloudflare Pages + Astroで構築。
目標：AdSense広告収入を得るコンテンツサイト。

## 基本ルール
- **回答は必ず日本語**で行うこと
- コード内コメントも日本語を優先
- エラーが出たら原因を日本語で説明してから修正する
- 不明な点は作業を止めて確認を求める
- 1タスク完了ごとに「✅ 完了：〇〇しました」と報告する

## 技術スタック
- フレームワーク: Astro（静的生成 + Cloudflare Workers連携）
- ホスティング: Cloudflare Pages（無料・商用OK）
- AIエンジン: OpenRouter API（無料・カード不要・日本からアクセス可）
  - メインモデル: meta-llama/llama-3.3-70b-instruct:free
  - フォールバック: deepseek/deepseek-chat-v3.1:free
  - エンドポイント: https://openrouter.ai/api/v1/chat/completions（OpenAI互換）
- DB/KV: Cloudflare D1（キャッシュ用）
- スタイル: Tailwind CSS
- 言語: TypeScript

## ディレクトリ構成
```
/
├── CLAUDE.md              ← このファイル
├── .claude/
│   └── agents/
│       ├── strategist.md  ← Agent A（戦略・SEO）
│       ├── developer.md   ← Agent B（実装）
│       └── content.md     ← Agent C（コンテンツ）
├── src/
│   ├── pages/             ← 各ツールページ
│   ├── components/        ← 共通コンポーネント
│   └── lib/               ← OpenRouter API連携・ユーティリティ
├── functions/             ← Cloudflare Workers関数
│   └── api/               ← APIエンドポイント
├── public/                ← 静的ファイル
├── astro.config.mjs
├── package.json
└── wrangler.toml          ← Cloudflare設定
```

## エージェント使い分けルール
タスクを受け取ったら、内容に応じて適切なサブエージェントに委譲する：

| タスク種別 | 担当エージェント |
|-----------|----------------|
| 新ツールの企画・キーワード選定 | strategist |
| コード実装・バグ修正・デプロイ | developer |
| ページ文章・SEO記事・説明文 | content |
| 複合タスク（新ツール追加等） | strategist → developer → content の順で連鎖 |

## OpenRouter APIのキー管理
- ローカル開発: `.env`ファイルの`OPENROUTER_API_KEY`
- 本番: Cloudflare Dashboard の Environment Variables
- **絶対にコードにAPIキーをハードコードしない**

## コスト管理ルール
- OpenRouter無料枠：1日50リクエスト（$10チャージで1,000回に増加するが今回は不要）
- **D1キャッシュは7日間保持**（無料枠が少ないため長めに設定）
- 同一入力は必ずキャッシュから返す
- 1IP/1時間あたり最大20リクエストに制限
- メインモデル枯渇時はフォールバックモデルへ自動切替
