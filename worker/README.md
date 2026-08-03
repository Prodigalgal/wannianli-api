# Cloudflare Worker 版本

该 Worker 是从零实现的独立万年历计算服务。天文朔、二十四节气、农历置闰、四柱、传统黄历和宜忌冲突消解都在 Cloudflare Worker 内完成，不访问 Kubernetes 或任何其他源站。

- 自定义域名：`https://wannianli-worker.mnnu.eu.org`
- 完整路径：`https://wannianli-worker.mnnu.eu.org/api/v1/almanac/current`
- 外部请求、Service Binding、源站变量：无
- 存储、中间件和运行时 Secret：无

实现与 Java 服务共享同一套已校勘规则口径，但没有 Java 运行时依赖，也不是 Java 服务的代理。公开结果只有中文键值，所有布尔语义输出为“是/否”；规则来源、命中条件和冲突裁决轨迹只保留在内部审计对象与测试中。

```powershell
npm install
npm test
npx wrangler deploy --dry-run
npx wrangler deploy
```

测试覆盖 2020-2030 春节、2020 闰四月、2026 年节气、2026-08-03 完整定值、宜忌专例和无回源约束。

部署身份通过本机 `CLOUDFLARE_API_TOKEN` 注入，不得写入仓库或 Wrangler 配置。
