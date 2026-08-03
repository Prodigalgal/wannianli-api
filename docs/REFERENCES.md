# 文献依据与采用边界

## 证据层级

| 层级 | 含义 | 项目中的用途 |
|---|---|---|
| A | 现行标准、政府天文机构资料、敕修原典的书目事实 | 历算规范、官方回归基准、主文献身份 |
| B | 一手古籍的可靠电子转录或早期文献传承 | 神煞起例、逐项宜忌、纳音、三伏、数九 |
| C | 明清民间通书或地域传统 | 彭祖百忌、胎神、数九并列口径 |
| D | 古籍已承认历元不可考后的现代通行锚点 | 二十八宿现代日期映射 |

API 中每个规则通过 `sourceId` 指向响应末尾的 `references`，并返回 `evidenceLevel`。证据层级参与冲突消解：C/D 级规则不能推翻 A/B 级规则。

## 历法与天文

### GB/T 33661-2017《农历的编算和颁行》

- 发布：2017-05-12；实施：2017-09-01；状态：现行
- 主管：中国科学院
- 链接：https://openstd.samr.gov.cn/bzgk/std/newGbInfo?hcno=E107EA4DE9725EDF819F33C60A44B296
- 采用：朔日、节气、冬至月、无中气置闰、月序和中国标准时间
- 不采用：该标准不规定神煞、择吉、胎神、彭祖百忌

### 数值算法

- Jean Meeus, *Astronomical Algorithms*, 2nd ed., 1998，第 25 章与第 49 章
- NASA/GSFC, Espenak-Meeus `Delta T` 分段多项式：https://eclipse.gsfc.nasa.gov/SEhelp/deltatpoly2004.html
- 采用：太阳视黄经、朔时刻、TT/UT 换算
- 限制：节气精确分钟为本实现估算值，不冒充官方历书发布时刻

### 官方回归基准

香港天文台公历与农历日期对照表：

- 2020：https://www.hko.gov.hk/tc/gts/time/calendar/pdf/files/2020.pdf
- 2024：https://www.hko.gov.hk/tc/gts/time/calendar/pdf/files/2024.pdf
- 2026：https://www.hko.gov.hk/tc/gts/time/calendar/pdf/files/2026.pdf
- 2027：https://www.hko.gov.hk/tc/gts/time/calendar/pdf/files/2027.pdf
- 2030：https://www.hko.gov.hk/tc/gts/time/calendar/pdf/files/2030.pdf

这些表只验证公历农历日期、干支年生肖和节气日期，不为神煞或择吉背书。

## 官修择吉主干

### 《钦定协纪辨方书》

- 清廷敕修，乾隆六年（1741）序，武英殿刊刻
- 全书：https://zh.wikisource.org/wiki/欽定協紀辨方書_(四庫全書本)
- 卷一：https://zh.wikisource.org/zh-hans/欽定協紀辨方書_(四庫全書本)/卷01
- 卷四：https://zh.wikisource.org/zh-hans/欽定協紀辨方書_(四庫全書本)/卷04
- 卷五：https://zh.wikisource.org/zh-hans/欽定協紀辨方書_(四庫全書本)/卷05
- 卷六：https://zh.wikisource.org/zh-hans/欽定協紀辨方書_(四庫全書本)/卷06
- 卷七：https://zh.wikisource.org/zh-hans/欽定協紀辨方書_(四庫全書本)/卷07
- 卷十：https://zh.wikisource.org/zh-hans/欽定協紀辨方書_(四庫全書本)/卷10

采用关系：

| 卷 | 用途 |
|---|---|
| 卷一 | 二十八宿 420 日七元结构，以及绝对起元年月不可考的限制 |
| 卷四 | 建除十二神起例、通常吉凶、不得仅凭建除一项决断 |
| 卷五 | 天德、月德、天赦、母仓等吉神起例 |
| 卷六 | 三煞、月害、六合等起例 |
| 卷七 | 黄黑道十二值神次序、起例及分类 |
| 卷十 | 各神各活动宜忌、逐月制化专例、六等冲突消解 |

卷四明确指出应统计当日全部吉凶神，并按具体活动分别判断。卷七的黄黑道值神和卷四的建除十二神运行方式不同，项目以两个独立字段返回。卷十还指出六黄道、六黑道没有可机械套用的专宜专忌，因此值神只作为背景规则，不能凭“黄道”自动把所有活动列为宜。

## 四柱与纳音

- 隋萧吉《五行大义》卷一“第四论纳音数”：https://zh.wikisource.org/zh-hans/五行大義/1
- 明万民英《三命通会》卷一“论纳音取象”：https://zh.wikisource.org/zh-hant/三命通會/卷一
- 《三命通会》四库本卷二“节与中”：https://zh.wikisource.org/wiki/三命通會_(四庫全書本)/卷02
- 《李虚中命书》卷下“岁月各计于气交”：https://zh.wikisource.org/zh-hans/李虛中命書_(四庫全書本)/卷下

《五行大义》提供纳音五行推算法，《三命通会》提供“海中金”等三十组取象。《三命通会》区分每月的“节”与“中”，本项目据此在立春、惊蛰、清明等十二节切换月柱。年柱采用以立春交气切换的项目固定口径；不同流派异说在响应中明示。

## 三伏与数九

### 三伏

《御定星历考原》卷五：https://zh.wikisource.org/zh-hant/御定星厯考原_(四庫全書本)/卷5

采用规则：夏至日起（含当天）数第三个庚日为初伏、第四个庚日为中伏；立秋日起（含当天）首个庚日为末伏。

### 数九

- 《岁时广记》卷十引旧俗，冬至次日起数：https://ctext.org/wiki.pl?chapter=312022&if=gb
- 清《清嘉录》卷四记吴俗，冬至日起数：https://ctext.org/wiki.pl?chapter=916733&if=gb

两种古籍口径并存。API 以较早的“冬至次日”口径作为 `primary`，同时在 `variants` 返回冬至日起数的结果。

## 较低层级传统

### 彭祖百忌与胎神

《玉匣记》通书系统：https://zh.wikisource.org/zh-hant/玉匣記

已经核对的《钦定协纪辨方书》电子正文未稳定发现六十甲子胎神占方表，因此不能把胎神伪称为该书规则。项目把彭祖百忌与胎神标为 `C_TRADITIONAL_TRANSMISSION`；彭祖活动只补充官修规则的空白。

### 二十八宿绝对锚点

《钦定协纪辨方书》卷一保存七元结构：“日有六十，宿有二十八，四百二十日而一周”，同时明言一元起于何年月日“不可得而考”。因此仅靠星期、日支或六十甲子不能唯一恢复现代日期的值宿。

API 仍按现代通行七元锚点返回值宿，以满足字段需求，但同时返回：

- `evidenceLevel = D_CONVENTIONAL_ANCHOR`
- 明确锚点日期与宿名
- 古籍绝对历元不可考的限制

该字段不能与有明确起例的建除、十二值神等同看待。
