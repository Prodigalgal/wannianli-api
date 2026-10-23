# Worker边缘客户端兼容性

核实日期：2026-10-23。Java和Worker的2.5.0发布及Node客户端验收已完成；本项边缘配置尚未修改。

Windows Python 3.12默认urllib与生产机Python urllib均收到Worker域名HTTP403，正文为`error code: 1010`；同一生产机Node客户端及Windows完整Node验收成功返回2.5.0。生产机未配置代理，Python直接连接仍复现，排除由环境代理单独导致。它不是应用返回的FORBIDDEN_ORIGIN，也不是古籍算法或日期参数错误。

Cloudflare域名设置的browser_check实测为on；[官方1010说明](https://developers.cloudflare.com/support/troubleshooting/http-status-codes/cloudflare-1xxx-errors/error-1010/)将其归于客户端浏览器签名拦截。[BIC文档](https://developers.cloudflare.com/waf/tools/browser-integrity-check/)允许按匹配条件配置例外。这组证据支持BIC兼容性归因，但在规则生效并复测之前，不把推定修复说成已解决。

已准备[局部配置规则](../deploy/cloudflare-api-bic-rule.json)：仅匹配Worker域名的九条现有API/MCP路径，设置bic=false。按[官方配置规则API](https://developers.cloudflare.com/rules/configuration-rules/create-api/)部署至zone级http_config_settings阶段。该对象是待添加的一条规则，不是完整规则集；应先读取现有规则、保留其顺序和内容，再追加或按ref更新。不要用只含此对象的PUT覆盖现有规则集。

该方案只调整匹配路径的BIC，保留WAF、Cloudflare原生限流及应用日期、请求、配额、并发和Origin校验。没有关闭整个zone的BIC，也没有通过伪装浏览器客户端宣称兼容性已修复。

当前Worker部署令牌可读取域名与browser_check设置，但读取自定义防火墙、配置规则两个阶段的规则集均返回HTTP403、Cloudflare错误10000 Authentication error。尚无权限读取并安全合并既有规则，所以没有发起规则修改。官方文档要求Zone > Config Rules > Edit；权限应只限mnnu.eu.org，或由已有权限的管理员在控制台添加上述规则。无需把令牌值提交到仓库或对话中。

配置后应先复测默认Python urllib、实际Python MCP客户端及原有两代Node SDK，再确认错误输入、Origin、限流和非匹配路径的保护仍有效；若未解除1010，应撤回新增的单条规则并继续归因。Java域名目前可作为独立入口，不能因此把Worker的这项限制标成已完成。

本地证据：`build/releases/20261023T132116Z/bic-read-status.json`、`bic-config-read-status.json`；首次10秒公网探测曾超时，后续31项v2与其余公网验收全部通过，该瞬时超时未混作1010。
