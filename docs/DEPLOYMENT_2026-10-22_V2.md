# 2026-10-22 v2、MCP及审计修复发布

发布标识：`20261022T145115Z`。新增语义化v2接口与只读MCP，保留v1；本次同时发布卷十首批逐月规则、互注凡例和第三轮契约改进。源代码和构建制品已验证后再部署，公网验收通过后记录以下版本。

## 在线版本

| 项目 | Java | Cloudflare Worker |
|---|---|---|
| 基础地址 | https://wannianli.mnnu.eu.org | https://wannianli-worker.mnnu.eu.org |
| 指定日期 | GET/POST /api/v2/almanac | 相同 |
| MCP | /mcp | /mcp |
| 生效身份 | JAR SHA-256 `a8e10a178a185e4f98646f8467eeb936f37653004f6e2f77c428ee1322c7d5ec` | `7196a7d1-6a35-4c03-936a-4698f4a0cb34`，流量100% |
| 制品 | 20281596字节，Java25 JAR | 252105字节，SHA-256 `8ea846c169289d01b3689ed294e5da2c44e77e2e8e5c0e948a232524882fb075` |
| 运行证据 | 容器内挂载包哈希一致、实际计算成功，重启0、无OOM | 平台读取部署ID `458738b6-d6cb-4f10-8aab-4a4edfe0e87b`，原生限流绑定有效 |

Java容器ID：`1ed3d653f92fff136fbe1903c1c787b97e1c311cad8284025fb8aa3759bf6fb0`，启动时刻`2026-10-22T14:53:29.06098934Z`。MCP服务与OpenAPI软件版本为2.1.0，结果schemaVersion保持2.0。v2保留中文dayGrade，新增dayGradeCode及capabilities.dayGrades对照；四个GET路径均在OpenAPI声明HEAD。Worker构建依赖仓库共享JSON，部署产物自行计算，不访问Java源站。

Java在原Compose服务替换JAR并强制重建；Traefik放行v1/v2路径前缀和精确/mcp，根路径继续转发v1 current。未改DNS、TLS、主机防火墙或其他应用。

## 构建与验收

- Java执行gradlew test bootJar --no-daemon，51项测试通过；Worker执行npm test，50项通过，并完成Wrangler dry-run。
- 跨实现v1逐日比较2020—2024共1827天；v2每7天采样261例，另11个边界案例，合计272例。全部业务字段严格一致；110处天文时刻引用相差1毫秒，均未跨UTC+08:00日期，同一事件可能在多个响应重复出现。这不是110个独立天文误差事件。
- 两端契约回归校验公开v1递归76个字段名、4个布尔映射、日等英文码与中文对照，以及HEAD文档和空响应体。
- 每个公网入口分别通过24项v2/MCP检查与16项v1兼容检查：公历/农历、闰月、到秒、默认时刻、作用范围、OpenAPI、HEAD、字段/日期/编码错误、重复输入、请求体边界、方法、Origin、MCP版本和元信息校验。
- 两代官方MCP客户端分别在Java及Worker真实HTTP入口完成发现、Schema校验、闰月计算、工具错误和固定资源读取。原始协议边界另有本地测试。
- 两个服务的根路径与current共4个入口，忽略请求自身时刻后业务JSON完全一致。2020-02-23仍保留60项月破忌目；2024-01-18不再注宜遣使；2020-02-02不注安葬/启攒，但破土保留其他专忌。

扩展后的差分脚本已被两个工作流引用；本次在本地实际运行，未创建Git提交或触发远程CI，也未在本机完成ARM64原生编译。公网验收为有界功能和拒绝测试，不等同完整渗透测试或压力攻击。

## 源码与证据

源码基于`6039fcf7150e95dc4f3f78d5d0125266dc285ae8`及工作区未提交修改。运行源码63个文件的SHA-256和聚合指纹`4b08396f5e9cd5a7e2b411d94ab410a45e2022aaeb15d1e3c89f5d43d921bded`记录在[发布清单](../deploy/releases/20261022T145115Z.json)，不能把基线提交号当作完整发布源码身份。验收结束时已逐个复核运行源文件与制品哈希。

原始检查报告、SDK日志、当前结果对照与差分输出位于`build/releases/20261022T145115Z/`；清单记录这些证据文件及验证脚本的哈希。后续两项补审仅修改验证脚本和文档，因此扩充差分后无需重新部署相同运行制品。

## 备份与回滚

Java发布目录：`/opt/wannianli-api/releases/20261022T145115Z/`，保存新包、previous.jar及compose.previous.yaml。前一JAR SHA-256为`cb7c7d0c906db55208d90cb39505cd981ca4514920abbe010ed98f9886e75c87`；替换包与配置后须force-recreate，并重新等待真实计算就绪，步骤见[部署说明](../deploy/README.md)。

前一Worker版本：`aec50371-a9fd-4d81-b68d-a69ade969383`。可在原账户执行`wrangler versions deploy aec50371-a9fd-4d81-b68d-a69ade969383@100 --yes`恢复并独立验收；两端回滚相互独立。凭据仅在部署子进程环境中注入，没有写入源码、产物或发布清单。

## 规则覆盖边界

卷十完整逐月条件仍未重建，未核定组合继续输出未定；不忌不自动生成宜，开日也不无条件解除其他禁忌。具体采纳和驳回理由见[第二轮](SECOND_AUDIT.md)、[第三轮](THIRD_AUDIT.md)与[算法范围](ALGORITHM_AUDIT.md)。远期Delta T和午夜敏感事件的不确定性继续披露，不因部署扩大精度结论。
