# セットアップ手順書

## 必要なもの（すべて無料）
- [x] OpenRouterアカウント（✅ 取得済み・APIキー発行済み）
- [ ] GitHubアカウント
- [ ] Cloudflareアカウント（無料）→ https://dash.cloudflare.com/sign-up
- [ ] Node.js 18以上（ローカル開発用）

---

## ✅ Step 1: OpenRouter APIキー（完了済み）

すでに `sk-or-` から始まるキーを取得済み。
メモ帳等に保存しておくこと。後のStep 5で使う。

---

## Step 2: GitHubリポジトリを作成

```bash
# このフォルダをGitHubにpushする
git init
git add .
git commit -m "初回コミット"
git remote add origin https://github.com/あなたのユーザー名/ai-tool-site.git
git push -u origin main
```

---

## Step 3: Cloudflare PagesにGitHubを接続

1. https://dash.cloudflare.com にログイン
2. 左メニュー「Workers & Pages」→「Create」→「Pages」→「Connect to Git」
3. GitHubを連携してリポジトリを選択
4. ビルド設定：
   - Framework preset: `Astro`
   - Build command: `npm run build`
   - Build output directory: `dist`
5. 「Save and Deploy」

---

## Step 4: Cloudflare D1データベースを作成

```bash
# D1データベース作成
npx wrangler d1 create ai-tool-site-db

# 出力された database_id を wrangler.toml の該当行に記入

# スキーマを適用
npx wrangler d1 execute ai-tool-site-db --file=./schema.sql
```

---

## Step 5: 環境変数（OpenRouter APIキー）を設定

**Cloudflare Dashboard で設定する（ローカルファイルには書かない）：**

1. Workers & Pages → あなたのPages → 「Settings」→「Environment Variables」
2. 「Add variable」:
   - Variable name: `OPENROUTER_API_KEY`
   - Value: Step 1でコピーしたキー（sk-or-...）
   - 「Encrypt」にチェック（重要）
3. 「Save」

**ローカル開発用（`.env`ファイル）：**
```bash
# .env ファイルを作成（.gitignoreに追加済み）
echo "OPENROUTER_API_KEY=sk-or-xxxxxxxxxxxx" > .env
```

---

## Step 6: ローカル開発環境の確認

```bash
npm install
npm run dev
# ブラウザで http://localhost:4321 を開く
```

---

## Step 7: Claude Codeでの開発開始

```bash
claude

# 最初のコマンド例
# 「敬語変換ツールのページとUIを実装して」
# 「次に作るべきツールを提案して」
```

---

## デプロイの流れ（自動）

```
コードをmainブランチにpush
    ↓
Cloudflare Pagesが自動ビルド・デプロイ
    ↓
https://your-site.pages.dev に反映
```

---

## トラブルシューティング

### OpenRouter APIが動かない
- APIキーが正しく設定されているか確認（sk-or-で始まる）
- OpenRouterダッシュボードで残りリクエスト数を確認（無料枠1日50回）
- 50回を超えたら翌日リセットまで待つ（キャッシュがあれば継続動作）

### D1のエラー
- `wrangler.toml`の`database_id`が正しいか確認
- スキーマが適用されているか確認（Step 4を再実行）

### 無料枠（1日50回）が足りなくなったら
- D1キャッシュが効いているか確認（同じ入力は消費しない）
- どうしても足りなければOpenRouterに$10チャージで1日1,000回に増加
