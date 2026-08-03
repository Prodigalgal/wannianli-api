package cn.wannianli.api;

import java.util.List;

import cn.wannianli.api.AlmanacResponse.Reference;

public final class ReferenceCatalog {

    private ReferenceCatalog() {
    }

    public static List<Reference> all() {
        return List.of(
                reference("GB_T_33661_2017", "GB/T 33661-2017《农历的编算和颁行》", "国家标准", "2017-05-12发布，现行",
                        "全国标准信息公共服务平台", "https://openstd.samr.gov.cn/bzgk/std/newGbInfo?hcno=E107EA4DE9725EDF819F33C60A44B296",
                        "A_NORMATIVE_STANDARD", "朔日、节气、月序、闰月及中国标准时间的规范依据",
                        "不规定择吉、神煞、胎神或宜忌。"),
                reference("HKO_2026", "2026（丙午—肖马）年公历与农历日期对照表", "政府天文机构年历", "2026",
                        "香港天文台一页年历", "https://www.hko.gov.hk/tc/gts/time/calendar/pdf/files/2026.pdf",
                        "A_OFFICIAL_VALIDATION", "公历农历转换、春节、节气日期的外部回归基准",
                        "不提供四柱、神煞或择吉规则。"),
                reference("MEEUS_ASTRONOMICAL_ALGORITHMS", "Astronomical Algorithms", "现代天文算法文献", "Jean Meeus, 2nd ed., 1998",
                        "Ch. 25 Solar Coordinates; Ch. 49 Phases of the Moon", "https://search.worldcat.org/title/40521322",
                        "A_TECHNICAL_METHOD", "太阳视黄经求根与朔时刻数值算法",
                        "本实现为适合当前时代的截断公式；节气时刻不是官方历书发布值。"),
                reference("NASA_DELTA_T", "Polynomial Expressions for Delta T", "天文时间尺度资料", "NASA/GSFC",
                        "Espenak-Meeus piecewise polynomials", "https://eclipse.gsfc.nasa.gov/SEhelp/deltatpoly2004.html",
                        "A_TECHNICAL_METHOD", "TT与UT换算", "未来ΔT只能估算。"),
                reference("WUXING_DAYI_VOLUME_1", "《五行大义》卷一", "隋代术数古籍", "隋萧吉",
                        "第四论纳音数", "https://zh.wikisource.org/zh-hans/五行大義/1",
                        "B_EARLY_TEXT_TRANSMISSION", "六十甲子纳音五行的推算法", "不直接列出海中金等全部取象名称。"),
                reference("SANMING_TONGHUI_VOLUME_1", "《三命通会》卷一", "明代命理古籍", "明万民英",
                        "论纳音取象", "https://zh.wikisource.org/zh-hant/三命通會/卷一",
                        "B_PRIMARY_TEXT_TRANSCRIPTION", "海中金等三十组纳音取象名称", "属于传统术数体系。"),
                reference("SANMING_TONGHUI_VOLUME_2", "《三命通会》卷二", "明代命理古籍", "四库全书本转录",
                        "论每月节与中气", "https://zh.wikisource.org/wiki/三命通會_(四庫全書本)/卷02",
                        "B_PRIMARY_TEXT_TRANSCRIPTION", "月柱按立春、惊蛰等十二节交接", "用于传统四柱口径，不属于农历日期国家标准。"),
                reference("LI_XUZHONG_MINGSHU_VOLUME_3", "《李虚中命书》卷下", "古代命理文献", "四库全书本转录",
                        "岁月各计于气交、以交气为定", "https://zh.wikisource.org/zh-hans/李虛中命書_(四庫全書本)/卷下",
                        "B_PRIMARY_TEXT_TRANSCRIPTION", "年、月柱以交气为边界的传统依据",
                        "不同术数流派仍可能采用正月初一或晚子时换日等异说，本API明确固定自身口径。"),
                reference("XIEJI_BIANFANGSHU", "《钦定协纪辨方书》", "清代敕修古籍", "乾隆六年（1741）四库全书本转录",
                        "御序、奏议、全书目录", "https://zh.wikisource.org/wiki/欽定協紀辨方書_(四庫全書本)",
                        "A_IMPERIAL_CANON", "官修择吉体系的主文献", "电子转录仍应以影印本逐页复核。"),
                reference("XIEJI_BIANFANGSHU_VOLUME_1", "《钦定协纪辨方书》卷一", "清代敕修古籍", "四库全书本转录",
                        "本原一·二十八宿配日", "https://zh.wikisource.org/zh-hans/欽定協紀辨方書_(四庫全書本)/卷01",
                        "B_PRIMARY_TEXT_TRANSCRIPTION", "二十八宿420日七元结构",
                        "原书明言绝对起元年月不可考，现代值宿必须另设公开锚点。"),
                reference("XIEJI_BIANFANGSHU_VOLUME_4", "《钦定协纪辨方书》卷四", "清代敕修古籍", "四库全书本转录",
                        "义例二·建除十二神", "https://zh.wikisource.org/zh-hans/欽定協紀辨方書_(四庫全書本)/卷04",
                        "B_PRIMARY_TEXT_TRANSCRIPTION", "建除起例、通常吉凶与不可执一而论的原则", "活动宜忌以卷十为准。"),
                reference("XIEJI_BIANFANGSHU_VOLUME_5", "《钦定协纪辨方书》卷五", "清代敕修古籍", "四库全书本转录",
                        "义例三·天德、月德、天赦、母仓等", "https://zh.wikisource.org/zh-hans/欽定協紀辨方書_(四庫全書本)/卷05",
                        "B_PRIMARY_TEXT_TRANSCRIPTION", "主要吉神起例", "仅实现已逐条校勘并在响应中命中的规则集。"),
                reference("XIEJI_BIANFANGSHU_VOLUME_6", "《钦定协纪辨方书》卷六", "清代敕修古籍", "四库全书本转录",
                        "义例四·三煞、月害、六合等", "https://zh.wikisource.org/zh-hans/欽定協紀辨方書_(四庫全書本)/卷06",
                        "B_PRIMARY_TEXT_TRANSCRIPTION", "主要吉神凶煞起例", "神煞不是天文学事实。"),
                reference("XIEJI_BIANFANGSHU_VOLUME_7", "《钦定协纪辨方书》卷七", "清代敕修古籍", "四库全书本转录",
                        "义例五·黄道黑道", "https://zh.wikisource.org/zh-hans/欽定協紀辨方書_(四庫全書本)/卷07",
                        "B_PRIMARY_TEXT_TRANSCRIPTION", "黄黑道十二值神的次序、起例与分类", "不与建除十二神机械合并。"),
                reference("XIEJI_BIANFANGSHU_VOLUME_10", "《钦定协纪辨方书》卷十", "清代敕修古籍", "四库全书本转录",
                        "用事·宜忌及六等消解", "https://zh.wikisource.org/zh-hans/欽定協紀辨方書_(四庫全書本)/卷10",
                        "B_PRIMARY_TEXT_TRANSCRIPTION", "逐神逐活动宜忌、制化专例和六等级冲突消解",
                        "古代活动名按简体规范化，原始含义不等同现代法律或医学建议。"),
                reference("YUDING_XINGLI_KAOYUAN_VOLUME_5", "《御定星历考原》卷五", "清代敕修古籍", "康熙五十二年（1713）四库全书本转录",
                        "三伏", "https://zh.wikisource.org/zh-hant/御定星厯考原_(四庫全書本)/卷5",
                        "B_PRIMARY_TEXT_TRANSCRIPTION", "夏至后第三庚初伏、第四庚中伏、立秋后首庚末伏，交节日逢庚计入",
                        "民俗节候规则，不是气象预测。"),
                reference("SUISHI_GUANGJI_VOLUME_10", "《岁时广记》卷十", "南宋岁时古籍", "南宋陈元靓编",
                        "引《岁时杂记》冬至次日起数九", "https://ctext.org/wiki.pl?chapter=312022&if=gb",
                        "B_EARLY_TEXT_TRANSMISSION", "数九主口径：冬至次日起九九八十一日", "电子文本需与影印本继续校勘。"),
                reference("QINGJIALU_VOLUME_4", "《清嘉录》卷四", "清代岁时古籍", "清顾禄",
                        "冬至大如年·吴俗从冬至日起数", "https://ctext.org/wiki.pl?chapter=916733&if=gb",
                        "C_REGIONAL_TRADITION", "数九并列口径：冬至日起数", "明确属于吴地习俗，不代表古今唯一口径。"),
                reference("YUXIAJI_TRADITION", "《玉匣记》通书系统", "明清民间通书古籍", "维基文库转录",
                        "彭祖百忌、六甲胎神日占方", "https://zh.wikisource.org/zh-hant/玉匣記",
                        "C_TRADITIONAL_TRANSMISSION", "彭祖百忌与胎神占方的附加来源",
                        "未证实属于《协纪辨方书》正文，优先级低于官修主规则。"));
    }

    private static Reference reference(String id, String title, String type, String edition, String locator,
                                       String url, String evidence, String usedFor, String limitation) {
        return new Reference(id, title, type, edition, locator, url, evidence, usedFor, limitation);
    }
}
