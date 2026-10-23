# Cloudflare Worker 版本

该Worker与Java服务共享数据、运行独立。天文朔、二十四节气、农历置闰、四柱、六旬旬空、传统黄历和宜忌冲突消解都在Cloudflare Worker内完成，运行时不访问Java服务或其他源站。

构建依赖完整仓库中的 `src/main/resources/rules/volume10.json`、`src/main/resources/rules/core-gods.json`及`src/main/resources/api/contract.json`，分别作为逐月/铺注、神煞起例及v2契约的单一数据源。它们由打包器内联进入Worker，部署后不依赖这些源文件或Java运行时。请检出完整仓库后进入worker目录执行构建；只有worker目录的副本不能构建。

- 自定义域名：`https://wannianli-worker.mnnu.eu.org`
- 完整路径：`https://wannianli-worker.mnnu.eu.org/api/v1/almanac/current`
- 指定时刻：`POST /api/v1/almanac/calculate`，字段和示例见 [接口文档](../docs/API.md)。
- 新版语义接口：`GET/POST /api/v2/almanac`，见 [v2文档](../docs/API_V2.md)；远程只读 MCP：`/mcp`，见 [接入文档](../docs/MCP.md)。
- Worker 独立提供服务，同时保留 `workers_dev` 入口。
- 外部请求、Service Binding、源站变量：无
- 存储和运行时 Secret：无；新增 Cloudflare 原生 `ALMANAC_RATE_LIMITER` 绑定（见 `wrangler.jsonc`）。

实现与 Java 服务共享已校勘规则口径、版本化逐月数据和接口Schema，但没有 Java 运行时依赖，也不是 Java 服务的代理。v1结果为中文键、布尔语义“是/否”；v2及MCP使用英文程序字段、原生布尔值及核心子集scope。规则来源、命中条件和冲突裁决轨迹保留在内部审计对象与测试中。

当前API/MCP 2.2.0、区间及太阳模型修正的版本与验收见[发布记录](../docs/DEPLOYMENT_2026-10-23.md)，具体取舍见[第四轮记录](../docs/FOURTH_AUDIT.md)。神煞为明确裁剪的核心子集，部分日等返回“未定”；采用范围与文献裁决见[算法审计](../docs/ALGORITHM_AUDIT.md)。

所有入口共用本地令牌桶，突发20次、每分钟补充120次、并发4个；Cloudflare绑定另作每个边缘位置约120次/分钟的共享限流，绑定缺失则503。它不是全球严格配额；详见 [Cloudflare原生限流说明](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)。单次HTTP计算请求体上限1024字节，MCP上限16384字节且另限深度、字段数及字符串；流读取超时5秒，不接受压缩请求体。

```powershell
npm install
npm test
npx wrangler deploy --dry-run
npx wrangler deploy
```

测试覆盖香港天文台2026全年365日、2020-2030春节、2014冬至同日朔、2020闰四月、2199上界、2026节气与朔的分钟值、六十甲子旬空、古籍组合专例、无禄太阳填实、区间配额和无回源约束。Java与Worker的太阳系数由同一带SHA-256校验的VSOP87D生成器产生，106项章动由固定ERFA源机械生成并保留许可；独立JPL样本包含1979大寒跨日。

部署身份通过本机 `CLOUDFLARE_API_TOKEN` 注入，不得写入仓库或 Wrangler 配置。
