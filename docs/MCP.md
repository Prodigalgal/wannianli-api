# 万年历 MCP

远程 Streamable HTTP 端点：

- Java：`https://wannianli.mnnu.eu.org/mcp`
- 独立Worker：`https://wannianli-worker.mnnu.eu.org/mcp`

在支持远程 HTTP MCP 的客户端中填入任一URL即可；无需安装本项目或配置本地命令。客户端配置格式各有不同，下列是采用 `mcpServers` 和 `type: http` 客户端的示例：

```json
{"mcpServers":{"wannianli":{"type":"http","url":"https://wannianli.mnnu.eu.org/mcp"}}}
```

这是公开、无账号数据的只读服务，不要求API密钥。工具只在本进程计算或读取固定历法能力说明，没有文件系统、数据库、命令执行、动态URL或网络回源能力。客户端不能靠工具名称或输入参数扩展权限。

| 工具 | 参数 | 结果 |
|---|---|---|
| get_current_almanac | {} | 当前时刻的v2结果 |
| calculate_almanac | 与v2的calendar/date/time/leapMonth一致 | 指定日期时间的v2结果 |
| calculate_almanac_range | startDate、endDate、可选time | 含首尾最多14个公历日的完整结果 |
| get_calendar_capabilities | {} | 日期边界、默认值、计算口径和具体未实现范围 |

例如请求 calculate_almanac，参数为 `{"calendar":"lunar","date":"2020-04-01","leapMonth":true,"time":"23:59:59"}`。结果同时提供结构化 structuredContent 和JSON文本 content，工具声明 inputSchema、outputSchema 以及只读/非破坏性注解。无效历法日期返回工具 isError，协议错误使用 JSON-RPC error。不存在任意资源读取：唯一资源是 `almanac://capabilities`。

服务版本2.1.0与HTTP接口同步增加 activities.dayGradeCode 和 capabilities.dayGrades，保留原中文dayGrade；MCP工具的outputSchema同步声明新增字段。服务软件版本与所协商的MCP协议日期相互独立。

2.2.0新增calculate_almanac_range，参数如`{"startDate":"2020-05-22","endDate":"2020-05-23","time":"23:59:59"}`。每一天消耗一个与HTTP接口共享的配额，最多14天；计算结果限262144字节，完整RPC响应另限786432字节。无效范围返回工具isError，配额不足使用HTTP429和Retry-After。不能用MCP实现无限批量。scope说明文案不再在outputSchema中锁为常量，机器应使用结构字段和dayGradeCode。

## 协议与安全

按[2026-07-28 Streamable HTTP](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http)支持 server/discover、请求元信息和MCP元数据头校验；另兼容2025-11-25、2025-06-18、2025-03-26的 initialize 握手。两个版本的官方TypeScript客户端都纳入回归验证。服务器无会话，无SSE长连接；POST单条JSON-RPC，通知202空体，GET/DELETE返回405，不提供旧版HTTP+SSE双端点。

每次POST必须声明 application/json，并在Accept同时包含 application/json 与 text/event-stream。2026版还须带 MCP-Protocol-Version、Mcp-Method；tools/call 和 resources/read 须带匹配的 Mcp-Name，并在params._meta中声明协议版本和客户端能力。客户端SDK自动处理这些字段；不要给旧版请求硬加2026版头。头体不符返回400/-32020，版本不支持返回400/-32022。

Origin如存在，必须是三个明确的生产域名之一，或本地开发时与请求地址一致的loopback origin；其他Origin为403。没有开放任意CORS。普通服务端MCP客户端可以不发送Origin。公共匿名模型调用仍受与HTTP API共享的配额限制，不将“公开只读”解释为无限请求许可。

MCP请求体最多16384字节，读取预算5秒，JSON嵌套最多12层，节点最多1024、属性总数最多256、名称最多128字符、字符串最多4096字符；拒绝重复键、危险对象属性、非法UTF-8、批量RPC及无效ID。v1/v2的1024字节限制保持不变。应用保护及Worker共享限流均覆盖MCP，未知工具、资源、方法不能触发任意操作。

## 本地验证

```powershell
.\gradlew.bat test bootJar --no-daemon
npm --prefix worker ci
node tools/compare-implementations.mjs
```

最后一条命令启动仅绑定loopback的Java测试实例：v1比较1827天全部业务字段，v2在同一五年内每7天采样共261例，另保留11个边界案例，合计272例；再用两代官方MCP客户端检查真实HTTP发现、工具Schema、农历闰月计算、错误和固定资源读取。ARM64工作流还对实际原生可执行文件执行同样验证。工作流文件已接线；GitHub的远程执行状态取决于提交并触发工作流。
