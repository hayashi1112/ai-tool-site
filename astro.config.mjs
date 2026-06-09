import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@astrojs/tailwind";
import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  // Cloudflare Pages + Workers でSSRを使う場合
  output: "hybrid", // 静的ページはSSG、APIページはSSR
  adapter: cloudflare({
    platformProxy: {
      enabled: true, // ローカル開発でD1・KVを使えるようにする
    },
  }),
  integrations: [
    react(),
    tailwind(),
  ],
  // サイトURL（Cloudflare Pagesのデフォルトドメイン）
  // 独自ドメイン取得後に変更する
  site: "https://your-site.pages.dev",
});
