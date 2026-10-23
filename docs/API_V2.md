# v2 语义化 API

Java 与 Worker 提供相同接口。基础地址分别为 `https://wannianli.mnnu.eu.org`、`https://wannianli-worker.mnnu.eu.org`。本次保留 v1 的路径、中文键和“是/否”格式；v1 用法仍见 [API.md](API.md)。部署状态与具体版本以发布记录为准。

| 方法与路径 | 用途 |
|---|---|
| GET /api/v2/almanac?date=2026-08-03 | 计算指定日期，默认当天零点 |
| POST /api/v2/almanac | 同一计算，使用 JSON 参数 |
| GET/POST /api/v2/almanac/range | 公历区间，含首尾最多14天 |
| GET /api/v2/almanac/now | 计算服务器此刻 |
| GET /api/v2/almanac/capabilities | 支持范围、默认值、口径与具体缺项 |
| GET /api/v2/almanac/openapi.json | OpenAPI 3.1，自包含请求及完整结果 Schema |

所有 GET 支持 HEAD；OpenAPI 逐项声明对应 HEAD 操作、相同的参数约束和无响应体。POST 不接受查询参数；其他 GET 只接受表中说明的查询参数。根路径继续转发 v1 当前时刻。

## 输入

```json
{"calendar":"lunar","date":"2020-04-01","time":"23:59:59","leapMonth":true}
```

对应公历 `2020-05-23T23:59:59+08:00`。GET 等价写法：

```text
/api/v2/almanac?calendar=lunar&date=2020-04-01&time=23:59:59&leapMonth=true
```

| 参数 | 类型 | 规则 |
|---|---|---|
| date | string，必填 | 所选历法的 YYYY-MM-DD；农历月份也写两位数字 |
| calendar | string | gregorian 或 lunar；默认 gregorian |
| time | string | HH:mm 或 HH:mm:ss；默认 00:00:00 |
| leapMonth | boolean | 默认 false；公历只能为 false |

GET 的 leapMonth 只能为字面 `true` 或 `false`。POST 使用原生布尔值，不接受字符串。未知字段、重复字段、null、非法日期、不存在的闰月均拒绝；日期不自动进位。时间固定 UTC+08:00，不接受 UTC 字符串、其他偏移或闰秒。支持公历1801-01-01至2199-12-31；农历年份1800至2199，转换结果仍必须在公历区间内。

```powershell
Invoke-RestMethod 'https://wannianli.mnnu.eu.org/api/v2/almanac?date=2026-08-03&time=12:30:15'
```

## 结果

dateTime 表示**计算目标时刻**，适用于当前、历史和未来。字段使用稳定的英文程序名，传统名称、干支、宜忌活动仍使用中文。

| 字段 | 内容 |
|---|---|
| schemaVersion、utcOffset、dateTime | 结果结构版本2.0、固定偏移与计算时刻 |
| scope | 本结果的神煞子集和宜忌覆盖提示，以及 capabilitiesPath |
| gregorian、lunar | 公历、农历；lunar.leapMonth 为 boolean |
| fourPillars、xunKong、zodiac | 四柱、旬空和按立春年柱确定的生肖 |
| season、solarTerm、sanFu、shuJiu | 季节、交节、三伏、数九 |
| dayOfficer、dutyGod | 建除十二神、黄黑道十二值神 |
| auspiciousGods、inauspiciousGods | 已校勘核心子集；不能解释为完整清单 |
| pengZuTaboo、clash、fetalGod、mansion | 彭祖、冲煞、胎神、二十八宿 |
| activities | recommended、avoided、caution、dayGrade、dayGradeCode、virtuePresent、allActivitiesAvoided |

caution 表示仍保留双向证据的活动，不是额外的现代数字评分。dayGrade 保留已发布的中文显示值，新增 dayGradeCode 供程序判断；中英映射同时通过 capabilities.dayGrades 返回。不忌不自动生成宜。完整属性和可空字段以 OpenAPI 为准。v2 不输出内部规则审计模型。

| dayGradeCode | dayGrade |
|---|---|
| SUPERIOR | 上 |
| SUPERIOR_SECOND | 上次 |
| MIDDLE | 中 |
| MIDDLE_SECOND | 中次 |
| INFERIOR | 下 |
| LOWEST | 最下 |
| UNDETERMINED | 未定 |

天文时刻输出到毫秒，但不承诺毫秒天文精度。JVM/V8的浮点超越函数可能使临界求根输出相差1毫秒；CI对天文时刻单独容许最多1毫秒且不跨UTC+08:00日期，其余字段严格相等。未来模型的不确定性明显大于该数值差，详见 capabilities。

## 有界区间

```text
/api/v2/almanac/range?startDate=2020-05-22&endDate=2020-05-23&time=23:59:59
```

POST同路径接受`{"startDate":"2020-05-22","endDate":"2020-05-23","time":"23:59:59"}`。起止均为公历日期且必填，含首尾1—14天；time默认00:00:00。每一天返回与单日接口相同的完整结果，可跨年、跨农历月及闰月。暂不接受农历起止或任意日期数组；月份/年份应由调用方拆为不超过14天的连续段。

结果包含schemaVersion、utcOffset、range和results。range给出startDate、endDate、规范到秒的time、days和quotaUnits。每一天扣除一个与v1/v2/MCP共用的配额单位，先预约配额再计算；失败不退已消耗单位。一次区间仍只占一个并发槽。Worker原生限流同样按天计数，MCP不能绕过。

计算结果上限262144字节；MCP因同时包含结构化和文本表示，完整RPC响应另限786432字节。HTTP请求体仍为1024字节，MCP仍为16384字节。超过14天、倒序、无效日期、未知/重复字段返回400；响应超限413，配额不足429并带Retry-After。HEAD校验相同输入但不生成日结果，因此只消耗入口的一个请求单位。

无禄日按卷十“止注”条文仅铺注指定十二类活动，其余从三个列表省略，后台原始证据保留；省略不表示宜。具体活动可读取capabilities.annotationPolicies.noSalary。scope中的中文说明会随校勘更新，不作为封闭枚举；日等程序判断使用dayGradeCode。

2.5.0另补月忌日的十二类止注和分至日指定活动不注，分别见capabilities.annotationPolicies.monthlyTaboo与equinoxSolstice。前者按农历初五、十四、廿三，闰月独立计日；后者按交节所在UTC+08:00民用日全天。指定省略同时作用于recommended、avoided、caution，原始证据仍在审计模型。凶煞中的分至及月忌是铺注标签，不能用名称个数推算吉凶强度。

## 错误与资源限制

```json
{"error":{"code":"INVALID_REQUEST","message":"公历日期不存在"}}
```

错误状态包括400、404、405、408、413、415、429、431、500、503。稳定机器码包括 INVALID_REQUEST、NOT_FOUND、METHOD_NOT_ALLOWED、REQUEST_TIMEOUT、PAYLOAD_TOO_LARGE、UNSUPPORTED_MEDIA_TYPE、RATE_LIMITED、HEADERS_TOO_LARGE、INTERNAL_ERROR、SERVICE_UNAVAILABLE。协议层拒绝格式由Tomcat/Cloudflare决定。

Worker默认Python urllib已复现Cloudflare 403/1010，属于到达应用前的BIC拒绝，可能是纯文本，不能归类为FORBIDDEN_ORIGIN或假定总有error.code。局部配置仍受规则集权限限制，见[当前边界与方案](CLOUDFLARE_API_COMPATIBILITY.md)。

单次计算请求体上限1024字节，重复JSON键在解析时即拒绝。GET查询字符串上限1024字符。与v1/MCP共用突发20、每分钟补充120、计算并发4的应用保护；Worker另有原生边缘限流。429/503带Retry-After；其他安全限制与v1一致。OpenAPI可公开读取，服务不执行模型指令、命令或外部URL请求。

## 兼容性记录

- 2026-10-23版本2.5.0已双端发布：核定气往亡、反支、分至和月忌；新增公开铺注政策及结果scope说明。活动数组成员会因专忌或不注而增删，详见[v1兼容性记录](API.md)与[历日核定](CALENDAR_DAY_RULES.md)。字段结构、类型和schemaVersion不变。
- v2为新增版本，v1不切换字段语言或布尔类型。
- 2026-10-22 API描述版本2.1.0新增 activities.dayGradeCode、capabilities.dayGrades 及OpenAPI的HEAD操作。结果schemaVersion仍为2.0，原dayGrade中文值和v1结构保持兼容；调用方应允许可选扩展字段。
- 2026-10-23太阳模型精修，1979大寒改归01-20，交节时刻及衍生属性随之调整；神煞、宜忌与无禄铺注的行为变化见[v1兼容性记录](API.md)和[第四轮记录](FOURTH_AUDIT.md)。
- 2026-10-22此前审计修复将十二值神“天德”改为原书区分名“宝光”。这是**值枚举的破坏性变更**，旧调用方若按“天德”匹配，应将同位置值神映射为“宝光”；它与天德吉神不同。没有增加v1字段。
- 本轮补入卷五月空、天愿、解神、五合、五离/除神及首批逐月条件，神煞列表和宜忌结果会随文献修订变化；不能将旧数组成员当成封闭枚举。
- 2026-10-23版本2.2.0增加最多14天的range和同名MCP工具，按天扣配额。补卷五缺项、第二批逐月条件、阴阳专日及铺注；v1/v2活动成员可能随校勘增删，无禄的“止注”会使部分原有宜/忌消失，不可据此推为宜。结果字段语言与类型未改变。

- 2026-10-23版本2.2.1补原表影像核验及覆盖说明，两端各64项回归和远程ARM64验收通过；计算裁决未改变，见[原表核验](SOURCE_GRADE_TABLE.md)。
