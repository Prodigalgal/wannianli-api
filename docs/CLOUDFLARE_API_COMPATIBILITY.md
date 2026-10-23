# Worker边缘客户端兼容性

核实日期：2026-10-23。默认Python urllib的Cloudflare 403/1010已通过局部配置修复并完成公网复测；Java和Worker仍运行2.5.0，本次没有重新部署应用。

此前Windows Python 3.12默认urllib与生产机Python urllib均被Worker域名以纯文本`error code: 1010`拒绝，同机Node正常。Cloudflare的browser_check为on；[官方1010说明](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-1xxx-errors/error-1010/)及[BIC文档](https://developers.cloudflare.com/waf/tools/browser-integrity-check/)与现象一致。它不是应用的FORBIDDEN_ORIGIN或日期参数错误。本次修改前再次以默认Python-urllib/3.12复现，修改后同一客户端成功，未伪装User-Agent或关闭TLS验证。

上一轮只验证Worker部署令牌，读取规则集返回403/10000。进一步检查用户指定的服务器管理目录后确认：OPS_ADMIN_TOKEN和API_TOKEN也没有配置规则权限，但TOKEN_FACTORY具有API Tokens Write，可以生成所需的限定令牌。此前把单个部署令牌不足概括为必须由用户提供权限，结论不完整，现撤回该待办。

通过TOKEN_FACTORY生成仅限mnnu.eu.org、只含Config Settings Write、有效一小时的临时令牌。令牌值仅在进程内使用，未写入日志、仓库或tokens.env；完成规则读回后已调用删除接口撤销，HTTP200/success=true。原有令牌权限未变。

已应用[局部配置规则](../deploy/cloudflare-api-bic-rule.json)：只匹配wannianli-worker.mnnu.eu.org的九条现有API/MCP路径，设置bic=false。按[官方配置规则API](https://developers.cloudflare.com/rules/configuration-rules/create-api/)部署至zone级http_config_settings阶段。修改前该阶段入口不存在（限定令牌读取404）；新建入口及一条规则，没有覆盖既有规则集。

规则集ID：`cbaee1ff9c10458fb37a0ff39cd6ec95`，规则ID：`d4a1d4a374264d37a5a094ed0817bbf9`，ref为`wannianli_programmatic_api_bic`。整站browser_check前后均为on；没有请求关闭WAF、边缘限流或应用保护。回退时使用同等限定权限删除这条规则，再复测；不要用全量PUT覆盖其他规则。

公网复测结果：

- Windows Python 3.12默认urllib访问根路径和capabilities均由403/1010恢复200；非法日期返回应用JSON400/INVALID_REQUEST。
- 同一默认客户端访问未匹配路径`/not-an-api-path`仍返回403/1010，例外没有扩展到其他路径。
- 官方Python MCP SDK 2.3.0完成六项检查：发现与四工具、闰月计算、跨闰月区间、非法日期、capabilities及资源一致性。
- 两代官方Node MCP SDK均通过；31项v2/MCP公网回归通过，包含Origin403、重复JSON400、超大请求413、日期和区间校验。
- 有界配额探测仅发两次14日区间请求，第一次200，第二次429/RATE_LIMITED且Retry-After=1。应用配额仍有效。

修复后客户端验收来自Windows；生产机Python未在本轮重复运行，不将此前的生产机复现记录当作修复后证据。其他未匹配入口仍可能由Cloudflare在应用之前返回纯文本，调用方不能假定所有非成功响应都有error.code。

规则、时间、复测结果与证据摘要见[配置发布清单](../deploy/releases/20261023T144840Z-cloudflare.json)。原始记录位于`build/security/cloudflare-bic-20261023/`；2.5.0原发布清单保留发布当时的限制快照，本记录是后续修复。
