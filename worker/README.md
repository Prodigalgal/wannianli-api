# Cloudflare Worker 版本

该 Worker 是万年历 API 的无缓存边缘入口，不复制 Java 历法与择吉算法。它只从 DNS-only 源站取得当前结果，递归把所有布尔值规范化为“是/否”，并返回相同的中文 JSON。

- 自定义域名：`https://wannianli-worker.mnnu.eu.org`
- 完整路径：`https://wannianli-worker.mnnu.eu.org/api/v1/almanac/current`
- 源站：`https://wannianli-direct.mnnu.eu.org/api/v1/almanac/current`
- 存储、中间件和运行时 Secret：无

```powershell
npm install
npm test
npx wrangler deploy --dry-run
npx wrangler deploy
```

部署身份通过本机 `CLOUDFLARE_API_TOKEN` 注入，不得写入仓库或 Wrangler 配置。
