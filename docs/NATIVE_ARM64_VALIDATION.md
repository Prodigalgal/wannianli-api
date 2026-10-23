# ARM64原生验收记录

日期：2026-10-23。当前记录对应源提交`7b0812b7495278678c34a757c8374e63be643697`，不是此前仅通过旧提交的记录。

- [Native ARM64实际运行](https://github.com/Prodigalgal/wannianli-api/actions/runs/39888421730)：原生编译、架构核验、差分、MCP客户端和原生容器检查全部成功。
- [Worker/JVM跨实现实际运行](https://github.com/Prodigalgal/wannianli-api/actions/runs/39888421598)：64项Worker测试、Java测试与公开契约差分成功。
- [草稿PR](https://github.com/Prodigalgal/wannianli-api/pull/1)保留完整变更供审查，未合并main。

## 原生制品与来源

运行器为Linux aarch64，GraalVM 25。实际可执行文件是ELF64 aarch64，Linux动态链接器为`/lib/ld-linux-aarch64.so.1`，ldd没有缺失依赖。

原生二进制92473464字节，SHA-256为`c71859a826d793494a92f6ad1ee5b2479df94c592805ff3a50b640455ac3cf3c`。已下载二进制，复核哈希及ELF机器类型183（AArch64），不能把x86_64 JAR冒充为ARM64原生制品。

PR流程实际检出合并提交`48f48a7b5384e8322195d5cdbf45ad78d8831bb9`；其tree `4c81d9441217025e6df175a2688b74e38b0e8240`与上述分支源提交的tree完全相同，已通过GitHub API和本地Git双向核对。来源指的是相同源码树，不能把不同提交号直接混为一个。

## 验收范围

Java和Worker各64项测试通过，包含新增的原表独立回归。真实原生HTTP服务完成1827天v1、273例v2、3个区间的跨实现差分及两代官方MCP客户端；仅39处天文时间字段允许同民用日期内1毫秒差，其余严格相等。

原生可执行文件打入distroless容器并实际启动，默认安全配置下31项v2/MCP、16项v1检查通过。CI的请求节奏受限，没有为了方便测试提升容器的默认配额。

## 首次失败与修正

[首次运行39886375459](https://github.com/Prodigalgal/wannianli-api/actions/runs/39886375459)在原生编译和差分成功后，于容器v1脚本检查`/`时失败：应用本身返回404，而生产根路径由Traefik重写为current。新增明确的`--direct-app`测试模式，在直连容器中验证根路径应为404；生产公网仍验证根路径200。没有修改应用路由来迁就测试，也没有删除生产网关检查。失败记录继续保留。

第二次运行[39887277859](https://github.com/Prodigalgal/wannianli-api/actions/runs/39887277859)通过；加入原表回归后的当前运行再次全通过。

## 发布与权限

验证job只有contents读取权限。镜像发布拆为单独job，仅允许main推送，或在main手动显式选择publish；本次PR所有镜像发布job均为skipped，没有更新GHCR latest。

Oracle生产仍是x86_64 Java JAR，Cloudflare仍自行运行JavaScript；ARM64原生是本次实际验收制品，没有将其部署到x86主机。2.2.1生产发布身份和公网结果另见发布记录。

证据归档在`build/validation/native/39888421730/`及`build/releases/20261023T021538Z/`，发布清单记录源代码树、二进制和验证报告哈希。
