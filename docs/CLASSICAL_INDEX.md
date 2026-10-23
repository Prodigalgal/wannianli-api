# 全书分页索引与检索进度

本页由 `node tools/index-classical-sources.mjs` 生成；校勘方法与验收条件见[工作流程](CLASSICAL_WORKFLOW.md)。

## 进度分别计数

| 项目 | 数量与口径 |
|---|---|
| 原始影像 | 26册，36卷，3521扫描页；全部原始字节已在本机缓存并按公布SHA-1匹配 |
| 分页记录 | 3521页；每页有稳定ID、册号、扫描序号、尺寸及卷类路由候选 |
| 既有影像核对 | 115页相关规则核对、2页等第表转录；其余3404页未核 |
| 电子转录草稿 | 36文件，含卷首及35卷，3165片段；缺卷14 |
| 转录质量待核 | 415空片段；76个重复叶码影响152片段 |
| 影像/文本链接 | 115条依据既有叶码核对；172条按锚点偏移推测，须回看影像 |
| 图像形态候选 | 24页宽幅或跨页候选；嵌入文本层0页 |

3521是扫描页数，3165是转录标记片段数，两者不是一一对应。没有把转录片段、目录登记或下载完成计入校勘。卷类路由也不表示已逐页辨认正文、表格或留白。

## 已固定的来源与缺口

- [Kanripo转录固定提交](https://github.com/kanripo/KR3g0051/tree/8b5522eb0299afbd575f1cb556e972c71c40c42a)；逐文件URL、卷题、字节数及SHA-256见[文本清单](sources/classical-texts/manifest.json)。
- 文件编号014实际卷题是卷十五，后续编号相应偏移；以卷题而非文件名决定卷号。卷十四影像已缓存，转录缺失需要单独补录。
- 重复叶码的每个出现均保留独立片段ID，不自动择一，也不建立确定的扫描页链接。
- 已核对影像中2页没有唯一对应转录片段：CADAL06056507/110、CADAL06056510/221；不得用邻页补作确定链接。
- 空片段可能是遗漏图表、漏录正文或留白，必须看原图；不能据空文本推断没有规则。
- 原始影像缓存位于忽略目录 `build/sources/classical/facsimiles/`；未提交原始二进制。仓库保存[原始字节与分页结构记录](sources/classical-scan-layout.json)，支持重建核查。

## 分册清单

| 影像册ID | 卷 | 扫描页 | 已登记核对页 |
|---|---|---:|---:|
| CADAL06056502 | 1 | 237 | 0 |
| CADAL06056503 | 2 | 110 | 0 |
| CADAL06056504 | 3 | 144 | 0 |
| CADAL06056505 | 4 | 140 | 0 |
| CADAL06056506 | 5 | 139 | 0 |
| CADAL06056507 | 6 | 154 | 85 |
| CADAL06056508 | 7 | 98 | 0 |
| CADAL06056509 | 8 | 135 | 0 |
| CADAL06056510 | 9、10 | 231 | 32 |
| CADAL06056511 | 11、12 | 112 | 0 |
| CADAL06056512 | 13 | 114 | 0 |
| CADAL06056513 | 14 | 101 | 0 |
| CADAL06056514 | 15 | 104 | 0 |
| CADAL06056515 | 16、17 | 207 | 0 |
| CADAL06056516 | 18 | 104 | 0 |
| CADAL06056517 | 19、20 | 117 | 0 |
| CADAL06056518 | 21、22 | 132 | 0 |
| CADAL06056519 | 23、24 | 135 | 0 |
| CADAL06056520 | 25、26 | 135 | 0 |
| CADAL06056521 | 27、28 | 135 | 0 |
| CADAL06056522 | 29、30 | 135 | 0 |
| CADAL06056523 | 31、32 | 159 | 0 |
| CADAL06056524 | 33 | 98 | 0 |
| CADAL06056525 | 34 | 106 | 0 |
| CADAL06056526 | 35 | 126 | 0 |
| CADAL06056527 | 36 | 113 | 0 |

## 执行与检索

```sh
node tools/prepare-classical-sources.mjs --text --facsimiles
node tools/prepare-classical-sources.mjs --text --facsimiles --offline
node tools/index-classical-sources.mjs --check
node tools/search-classical-sources.mjs "游祸" --volumes 6,10,12,36 --context 1
node tools/search-classical-sources.mjs --family VOLUME06_REMAINDER --limit 20 --json
```

检索返回所在页及相邻转录片段、关键限制标签、原叶码、确定/候选扫描链接和原始文本地址；简繁及异体检索仅采用明确列出的有限字形归并，不宣称通用转换。

[分页JSONL](sources/classical-page-index.jsonl)、[文本片段索引](sources/classical-text-index.jsonl)、[统计JSON](sources/classical-index-summary.json)、[规则族队列](sources/classical-review-queue.json)。

队列先处理卷六余项、等第例外、互注、公规与辨讹；年/月/日表须先核定推算口径，再逐格比对。队列只是检索导航，没有替代底本判断、算法实现或发布验收。
