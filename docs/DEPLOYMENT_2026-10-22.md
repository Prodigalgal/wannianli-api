# 2026-10-22 构建、部署与验收

发布标识：`20261022T121023Z`。本次按用户要求先构建并通过测试，再原地更新两个现有服务；未改DNS、TLS、主机防火墙或其他应用。

## 在线版本

| 项目 | Java | Cloudflare Worker |
|---|---|---|
| 基础地址 | https://wannianli.mnnu.eu.org | https://wannianli-worker.mnnu.eu.org |
| 发布方式 | 现有Oracle主机217.142.229.2，替换JAR并重建原Compose服务 | Wrangler上传并发布至原Worker和自定义域名 |
| 生效版本 | JAR SHA-256 `7ca117c5fe397d62daec3a55bb5074eb4bc11cc4ad7ee67528f1d57cb87d8e97` | `a42e1641-df6e-44e1-9e61-18d0ceed3c12`，流量100% |
| 制品 | `build/libs/wannianli-api-1.0.0.jar`，20225749字节 | 编译JS 122594字节，SHA-256 `c5e125b9bbbd28e752a964125139154cd0a076c5120da8760e1bf308be1afceb` |
| 运行状态 | 新容器运行，重启计数0、无OOM，容器内外包哈希核对 | 已从平台读取部署状态，并验证原生限流绑定可用 |

Java容器ID：`b5eaddae600280a2762b67ddacf5a463b5b144764b74acf80e5fe3cd001a0106`。2026-10-22 20:15:30+08:00启动，JVM就绪约89秒。Worker部署ID：`abfe38e1-cc2a-45f1-9a3a-b747bdeffb87`，20:13:24+08:00发布。

源代码基于提交 `6039fcf7150e95dc4f3f78d5d0125266dc285ae8` 以及本次工作区修改；本次未新建Git提交或推送，不能把基线提交号当作完整发布源码版本。制品哈希与运行时版本才是本轮部署身份。

## 构建与公网验证

- Java执行 `gradlew clean test bootJar --no-daemon`，41项测试通过。
- Worker执行 `npm test`，36项测试通过；Wrangler dry-run通过后才正式部署。
- 每个线上服务运行16组固定计算样例，与本地实现完整比较一致；涵盖1801/2199边界、世纪闰年、2033闰十一月、公历/农历输入及到秒时刻。
- 每个线上服务另完成16项接口验收：根路径与current、Gregorian/lunar到秒、闰月、破日禁忌、无效公历、无效闰月、转义重复字段、注入式数字、超大请求体、错误Content-Type、错误方法、未知查询、未知路径及HEAD。
- 公网确认错误码400/404/405/413/415，以及no-store、nosniff、禁止嵌框响应头。两套服务的2020-02-23破日样例均保留全部60项月破禁忌，没有翻成宜。
- 两个服务的根路径与current共4个当前结果入口，忽略请求时刻后业务JSON完全一致。

固定样例比较可用 `node tools/compare-calculations.mjs <基础地址>` 复查；接口与错误响应可用 `node tools/verify-deployment.mjs <基础地址> --report <报告文件>` 复查。原始验收JSON和发布清单分别保存在 `build/releases/20261022T121023Z/` 与 `deploy/releases/20261022T121023Z.json`。

本次公网检查为有界功能请求和输入拒绝验证；没有压测公共接口来耗尽所有用户的共享配额，也没有进行完整渗透测试。每实例令牌桶与并发保护已通过本地测试，Worker原生限流为按边缘位置的近似共享计数。

## 备份与回滚

Java服务器保留：

- 新包：`/opt/wannianli-api/releases/20261022T121023Z/wannianli-api.jar`
- 旧包：同目录 `previous.jar`，SHA-256 `2660e4e385fad2727d5c1859f31ba22030d24ab26f725998e376beba369f82d9`
- 原配置：同目录 `compose.previous.yaml`；原服务配置本轮未改动

JAR回滚步骤见 [部署说明](../deploy/README.md)。替换文件后必须重建容器，不能只执行一次普通Compose up。

Worker前一版本为 `d051b892-7557-4b2d-9399-f5700fb55aeb`。可在原账户和项目中使用 `wrangler rollback <版本ID> --message <原因>` 回退，之后重新验证current接口；旧版不包含calculate接口。部署凭据仅在子进程环境内注入，未写入项目或发布清单。

算法覆盖范围、未确定日等、历史及远期日期差异继续按 [算法审计](ALGORITHM_AUDIT.md) 披露；部署成功不扩大这些精度与文献结论。
