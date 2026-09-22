// KV Cache CDN 立项汇报 PPT 生成脚本（华为浅色风 / 16:9）
const pptxgen = require("pptxgenjs");
const p = new pptxgen();
p.layout = "LAYOUT_16x9"; // 10 x 5.625 in
p.author = "内部汇报";
p.title = "KV Cache CDN 立项汇报";

const F = "Microsoft YaHei";
const C = {
  bg: "F6F7F9", panel: "FFFFFF", line: "E2E6EC", text: "1A1E26", muted: "7A838D",
  red: "C7000B", redBg: "FEF4F4", redFill: "FDF0F1", amber: "E08A00",
  green: "2F9E5F", blue: "1E6FFF", grayBd: "C7CCD4", body: "3C4650",
  headFill: "F0F2F5",
};
const TOTAL = 8;
let pageNo = 0;
const sh = () => ({ type: "outer", color: "1E293B", blur: 5, offset: 1.5, angle: 135, opacity: 0.1 });
const R = (arr) => arr.map(([t, o]) => ({ text: t, options: o || {} }));

function T(s, txt, o) { s.addText(txt, Object.assign({ fontFace: F, margin: 0 }, o)); }
function box(s, x, y, w, h, fill, lineC, lineW) {
  s.addShape(p.shapes.RECTANGLE, { x, y, w, h, fill: { color: fill || C.panel }, line: { color: lineC || C.line, width: lineW == null ? 0.75 : lineW }, shadow: sh() });
}
function newSlide(footTitle) {
  pageNo++;
  const s = p.addSlide();
  s.background = { color: C.bg };
  s.addShape(p.shapes.RECTANGLE, { x: 0, y: 0, w: 10, h: 0.045, fill: { color: C.red } });
  s.addShape(p.shapes.RECTANGLE, { x: 0, y: 5.30, w: 10, h: 0.325, fill: { color: "FFFFFF" } });
  s.addShape(p.shapes.LINE, { x: 0, y: 5.30, w: 10, h: 0, line: { color: C.line, width: 0.75 } });
  T(s, footTitle, { x: 0.5, y: 5.30, w: 5.5, h: 0.325, fontSize: 8.5, color: C.muted, valign: "middle" });
  s.addText(R([["内部汇报", { color: C.red, bold: true }], ["  |  ", { color: C.muted }], [`${pageNo} / ${TOTAL}`, { color: C.red, bold: true }]]),
    { x: 6.4, y: 5.30, w: 3.1, h: 0.325, fontSize: 8.5, align: "right", fontFace: F, valign: "middle", margin: 0 });
  return s;
}
function header(s, no, title, sub) {
  s.addShape(p.shapes.RECTANGLE, { x: 0.5, y: 0.26, w: 0.085, h: 0.46, fill: { color: C.red } });
  T(s, no, { x: 0.68, y: 0.22, w: 0.55, h: 0.5, fontSize: 19, bold: true, color: C.red, valign: "middle" });
  T(s, title, { x: 1.24, y: 0.2, w: 8.2, h: 0.46, fontSize: 20, bold: true, color: C.text, valign: "middle" });
  if (sub) T(s, sub, { x: 1.26, y: 0.68, w: 8.2, h: 0.24, fontSize: 9.5, color: C.muted });
}
function arrow(s, x1, y1, x2, y2, color, width, dash) {
  const x = Math.min(x1, x2), y = Math.min(y1, y2);
  s.addShape(p.shapes.LINE, {
    x, y, w: Math.abs(x2 - x1), h: Math.abs(y2 - y1),
    flipH: x2 < x1, flipV: y2 < y1,
    line: { color, width: width || 1.75, dashType: dash ? "dash" : "solid", endArrowType: "triangle" },
  });
}

/* ============ 封面 ============ */
(function () {
  const s = newSlide("封面");
  T(s, "内部汇报 · KV CACHE CDN", { x: 0, y: 1.02, w: 10, h: 0.34, align: "center", fontSize: 11, bold: true, color: C.red, charSpacing: 4 });
  s.addText(R([["KV Cache ", { color: C.text }], ["CDN", { color: C.red }]]),
    { x: 0, y: 1.48, w: 10, h: 1.05, align: "center", fontSize: 52, bold: true, fontFace: F, margin: 0 });
  T(s, "把 KV Cache 当作内容资产来运营", { x: 0, y: 2.72, w: 10, h: 0.5, align: "center", fontSize: 20, bold: true, color: C.red });
  T(s, "面向长上下文与多模型 Agent 时代的 LLM 推理基础设施 —— 用调度、数据形态与经济学三件事，把显存墙与地理墙化成一个 CDN 问题来解。",
    { x: 1.35, y: 3.42, w: 7.3, h: 0.75, align: "center", fontSize: 12, color: "4A525C", lineSpacingMultiple: 1.4 });
  T(s, "向公司高层汇报 · 2026", { x: 0, y: 4.55, w: 10, h: 0.3, align: "center", fontSize: 10.5, color: C.muted });
})();

/* ============ 01 为什么推理问题变成了 CDN 问题 ============ */
(function () {
  const s = newSlide("为什么推理问题变成了 CDN 问题");
  header(s, "01", "为什么推理问题变成了 CDN 问题", "四股力量，把 KV Cache 从引擎内存逼成了内容资产");
  const cards = [
    { c: C.amber, t: "经济学驱动 · 成本黑洞",
      b: R([["Prefill 是算力吞噬者：重复算公共前缀浪费 ", {}], ["30–70%", { bold: true, color: C.red }], ["，复用是降 TCO 唯一出路；回源代价是传统 CDN 的 ", {}], ["100–1000×", { bold: true, color: C.red }], ["。", {}]]),
      a: "类比：每个用户都重算一遍「同一个开场白」，就是烧钱。" },
    { c: C.red, t: "性能驱动 · 延迟灾难",
      b: R([["上下文 4K→128K→", {}], ["1M+", { bold: true, color: C.red }], ["，Prefill 从毫秒级跃升到数十秒（100K token ≈ ", {}], ["10s", { bold: true, color: C.red }], ["），摧毁交互式应用体验。唯一解法「空间换时间」。", {}]]),
      a: "类比：每次提问先「发呆」十几秒，产品必被弃用。" },
    { c: C.blue, t: "局部方案失效 · 三堵墙",
      b: R([["单集群前缀缓存：", {}], ["显存容量墙", { bold: true, color: C.text }], ["、", {}], ["冷热驱逐墙", { bold: true, color: C.text }], ["（计算—驱逐—再计算）、", {}], ["数据孤岛墙", { bold: true, color: C.text }], ["（A 算过 B 无法复用）。", {}]]),
      a: "类比：单机显存是「水杯」，KV 是「消防栓」，一开就溢出。" },
    { c: C.green, t: "网络统计学驱动 · 统计复用",
      b: R([["长尾汇聚成全局热点最大化命中率；成本差 ", {}], ["2–5×", { bold: true, color: C.red }], [" + 时区潮汐，夜间源站 Prefill、白天边缘 Decode。", {}]]),
      a: "类比：闲置算力变成「夜间的 Prefill 工厂」。" },
  ];
  const pos = [[0.5, 1.02], [5.1, 1.02], [0.5, 2.7], [5.1, 2.7]];
  cards.forEach((cd, i) => {
    const [x, y] = pos[i];
    box(s, x, y, 4.4, 1.56);
    s.addShape(p.shapes.RECTANGLE, { x: x + 0.16, y: y + 0.15, w: 0.15, h: 0.15, fill: { color: cd.c } });
    T(s, cd.t, { x: x + 0.42, y: y + 0.08, w: 3.9, h: 0.3, fontSize: 11.5, bold: true, color: C.text });
    s.addText(cd.b, { x: x + 0.16, y: y + 0.44, w: 4.08, h: 0.72, fontSize: 9, color: C.body, fontFace: F, margin: 0, lineSpacingMultiple: 1.15 });
    T(s, cd.a, { x: x + 0.16, y: y + 1.24, w: 4.08, h: 0.26, fontSize: 8, italic: true, color: C.muted });
  });
  box(s, 0.5, 4.44, 9.0, 0.68, C.redBg, C.redBg, 0);
  s.addShape(p.shapes.RECTANGLE, { x: 0.5, y: 4.44, w: 0.07, h: 0.68, fill: { color: C.red } });
  s.addText(R([["「问题成立，不等于『用带宽硬传』的解法成立。正确路径是 ", {}], ["范式重构", { bold: true, color: C.red }], [" —— 把 KV Cache 当作内容资产来运营。」", {}]]),
    { x: 0.75, y: 4.44, w: 8.6, h: 0.68, fontSize: 12.5, bold: true, color: "3C1216", fontFace: F, valign: "middle", margin: 0 });
})();

/* ============ 02 业界研究热点与技术演进方向 ============ */
(function () {
  const s = newSlide("业界研究热点与技术演进方向");
  header(s, "02", "业界推理研究的热点与技术演进方向", "全球共识：这正是所有头部玩家的共同方向");
  // 时间轴
  s.addShape(p.shapes.LINE, { x: 0.7, y: 1.66, w: 8.6, h: 0, line: { color: "D8DBE2", width: 2.5 } });
  const stops = [
    { x: 1.15, yr: "2023", nm: "本地分页", d: "vLLM · 消除显存碎片" },
    { x: 2.85, yr: "2023", nm: "前缀复用", d: "SGLang · 相同前缀只算一次" },
    { x: 4.55, yr: "2024", nm: "PD 分离", d: "DistServe · Prefill/Decode 分置" },
    { x: 6.25, yr: "2024-25", nm: "集群池化", d: "Mooncake · 三级池 · 吞吐 +525%" },
    { x: 8.5, yr: "2025-26", nm: "全域 CDN", d: "PrfaaS / Internet for KV", hot: true },
  ];
  stops.forEach(t => {
    T(s, t.nm, { x: t.x - 0.85, y: 0.96, w: 1.7, h: 0.26, align: "center", fontSize: 11, bold: true, color: C.text });
    T(s, t.yr, { x: t.x - 0.85, y: 1.24, w: 1.7, h: 0.24, align: "center", fontSize: 10, bold: true, color: C.red });
    s.addShape(p.shapes.OVAL, { x: t.x - (t.hot ? 0.1 : 0.07), y: 1.66 - (t.hot ? 0.1 : 0.07), w: t.hot ? 0.2 : 0.14, h: t.hot ? 0.2 : 0.14, fill: { color: t.hot ? C.red : "C7CCD4" } });
    T(s, t.d, { x: t.x - 0.95, y: 1.82, w: 1.9, h: 0.36, align: "center", fontSize: 8.5, color: C.muted });
    if (t.hot) T(s, "← 本方案所处时代", { x: t.x - 0.95, y: 2.16, w: 1.9, h: 0.22, align: "center", fontSize: 8.5, bold: true, color: C.red });
  });
  // 热点卡片 3×2
  const hs = [
    { t: "PD 分离成为默认架构", d: "Prefill 与 Decode 分池部署已成工业共识。", o: "NVIDIA · UCSD · Microsoft" },
    { t: "集群级 KV 池化进入生产", d: "三级池多处理 115% 请求。", o: "Moonshot · 华为" },
    { t: "KV 网络层成型", d: "压缩 3.5–4.3× · 位置无关 · SmartNIC 卸载。", o: "UChicago · Moonshot" },
    { t: "跨数据中心绝对前沿", d: "吞吐 +54%，P90 TTFT −64%。", o: "PrfaaS · Internet for KV" },
    { t: "模型 × 系统协同设计", d: "Kimi Linear 把 KV 吞吐压低 4–36×。", o: "Moonshot" },
    { t: "窗口期 12–18 个月", d: "全球仅 2–3 个团队在做跨机房 KV 分发，先发即占标准。", o: "战略卡位点", win: true },
  ];
  const xs = [0.5, 3.535, 6.57], ys = [2.56, 3.9];
  hs.forEach((h2, i) => {
    const x = xs[i % 3], y = ys[Math.floor(i / 3)];
    box(s, x, y, 2.93, 1.2, h2.win ? C.redBg : C.panel, h2.win ? C.red : C.line, h2.win ? 1.2 : 0.75);
    T(s, h2.t, { x: x + 0.14, y: y + 0.08, w: 2.68, h: 0.26, fontSize: 10.5, bold: true, color: h2.win ? C.red : C.text });
    s.addText(h2.d, { x: x + 0.14, y: y + 0.38, w: 2.68, h: 0.52, fontSize: 8.5, color: C.body, fontFace: F, margin: 0, lineSpacingMultiple: 1.12 });
    T(s, h2.o, { x: x + 0.14, y: y + 0.92, w: 2.68, h: 0.22, fontSize: 8, color: C.red });
  });
})();

/* ============ 03 方案可行性 ============ */
(function () {
  const s = newSlide("方案可行性分析");
  header(s, "03", "方案可行性 —— 关键结论", "四条线测算：可行性成立，瓶颈在工程化与标准");
  const cards = [
    { c: C.blue, t: "时间可行 · 拉取 vs 重算",
      b: R([["100G 专线 + 4× 压缩：拉取 ", {}], ["0.9s", { bold: true, color: C.red }], [" vs 本地重算 ", {}], ["10s", { bold: true, color: C.red }], [" —— ", {}], ["11× 更快", { bold: true, color: C.red }], ["；1G 公网则 80s 灾难。", {}]]),
      a: "结论：「带宽×压缩」须胜过「字节×算力」；模型架构是第一杠杆。" },
    { c: C.green, t: "解码收敛 · 向边缘移动",
      b: R([["流式生成中 RTT 只加一次性偏移、不钳吞吐；多轮 Agent 循环按 ", {}], ["K×RTT", { bold: true, color: C.red }], [" 累积。", {}]]),
      a: "结论：两层拓扑（中心+区域）更优，L0 仅语音/合规/隔离加密。" },
    { c: C.amber, t: "技术可行 · 三条线就位",
      b: R([["模型侧（MLA/混合）、系统侧（池化/压缩/PIC）、硬件侧（CXL/SmartNIC）均已成熟。", {}]]),
      a: "Mooncake +525%/115% · PrfaaS +54%/−64% · LMCache +15×。" },
    { c: C.red, t: "商业可行 · 场景成立",
      b: R([["批发带宽单请求成本降 ", {}], ["64%", { bold: true, color: C.red }], ["、潮汐卸载降 ", {}], ["55%", { bold: true, color: C.red }], ["；混合架构下零售带宽也成立。", {}]]),
      a: "结论：完整形态 TCO −30~45%；边界：长上下文>20%、复用率>30%。" },
  ];
  const pos = [[0.5, 1.02], [5.1, 1.02], [0.5, 2.7], [5.1, 2.7]];
  cards.forEach((cd, i) => {
    const [x, y] = pos[i];
    box(s, x, y, 4.4, 1.56);
    s.addShape(p.shapes.RECTANGLE, { x: x + 0.16, y: y + 0.15, w: 0.15, h: 0.15, fill: { color: cd.c } });
    T(s, cd.t, { x: x + 0.42, y: y + 0.08, w: 3.9, h: 0.3, fontSize: 11.5, bold: true, color: C.text });
    s.addText(cd.b, { x: x + 0.16, y: y + 0.44, w: 4.08, h: 0.68, fontSize: 9, color: C.body, fontFace: F, margin: 0, lineSpacingMultiple: 1.15 });
    T(s, cd.a, { x: x + 0.16, y: y + 1.2, w: 4.08, h: 0.32, fontSize: 8, italic: true, color: C.muted });
  });
  box(s, 0.5, 4.44, 9.0, 0.68, C.redBg, C.redBg, 0);
  s.addShape(p.shapes.RECTANGLE, { x: 0.5, y: 4.44, w: 0.07, h: 0.68, fill: { color: C.red } });
  s.addText(R([["可行性结论：", {}], ["成立", { bold: true, color: C.red }], [" —— 三条技术线就位、无不可逾越障碍；", {}], ["瓶颈在工程化与标准", { bold: true, color: C.red }], ["，正是可卡位的窗口。", {}]]),
    { x: 0.75, y: 4.44, w: 8.6, h: 0.68, fontSize: 12.5, bold: true, color: "3C1216", fontFace: F, valign: "middle", margin: 0 });
})();

/* ============ 04 不做什么 · 做什么 · 怎么做 ============ */
(function () {
  const s = newSlide("不做什么 · 做什么 · 怎么做");
  header(s, "04", "不做什么 · 做什么 · 怎么做", "先划边界 → 定动作 → 再讲清凭什么的创新");
  // 不做什么
  T(s, "不做什么（两条红线）", { x: 0.5, y: 0.96, w: 5, h: 0.24, fontSize: 11, bold: true, color: C.red });
  const reds = [
    R([["不做「WAN 上实时硬传几十 GB 完整 KV」——1 Gbps 下 ", {}], ["80s", { bold: true, color: C.red }], ["，灾难（§1.5 测算）。", {}]]),
    R([["不做「把缓存机械放各地」——", {}], ["让请求找数据", { bold: true, color: C.red }], ["（亲和路由）、预分发只在划算时发生（经济博弈）。", {}]]),
  ];
  reds.forEach((txt, i) => {
    const x = 0.5 + i * 4.6;
    box(s, x, 1.22, 4.4, 0.56, C.redBg, C.redBg, 0);
    s.addShape(p.shapes.RECTANGLE, { x, y: 1.22, w: 0.06, h: 0.56, fill: { color: C.red } });
    s.addText(txt, { x: x + 0.18, y: 1.22, w: 4.14, h: 0.56, fontSize: 9, color: "3C1216", fontFace: F, valign: "middle", margin: 0, lineSpacingMultiple: 1.1 });
  });
  // 做什么
  T(s, "做什么（核心五步：把 KV 当内容资产运营）", { x: 0.5, y: 1.94, w: 6.5, h: 0.24, fontSize: 11, bold: true, color: C.green });
  const steps = [
    ["① 生产", "中心 Prefill 算 KV、切段算指纹"],
    ["② 上报", "段+Hash+成本上报网关，累计热度"],
    ["③ 决策", "准入评分+博弈，定段/时/节点"],
    ["④ 预分发", "低谷异步推送高共享段"],
    ["⑤ 消费", "亲和命中，仅算增量、TTFT 秒级"],
  ];
  steps.forEach((st, i) => {
    const x = 0.5 + i * 1.87;
    box(s, x, 2.2, 1.72, 0.86);
    T(s, st[0], { x: x + 0.1, y: 2.26, w: 1.52, h: 0.22, fontSize: 10, bold: true, color: C.red });
    s.addText(st[1], { x: x + 0.1, y: 2.5, w: 1.52, h: 0.5, fontSize: 7.5, color: C.body, fontFace: F, margin: 0, lineSpacingMultiple: 1.1 });
  });
  // 怎么做
  T(s, "怎么做 —— 三大创新点", { x: 0.5, y: 3.24, w: 5, h: 0.24, fontSize: 11, bold: true, color: C.red });
  const invs = [
    { c: C.blue, t: "① 缓存亲和性路由", d: R([["让", {}], ["请求找数据", { bold: true, color: C.red }], ["——按「复用程度 × SLA × 成本」路由到复用最多、最合适的节点（方式 b 直连）。", {}]]) },
    { c: C.green, t: "② 基于不同 KV 段的统计复用与分发", d: R([["按共享度切段、统计复用、差异化", {}], ["预分发", { bold: true, color: C.red }], ["——不同节点持不同段，命中即免重算。", {}]]) },
    { c: C.red, t: "③ 经济与 SLA 博弈后的存算物理分离", d: R([["每次跨域先算账：", {}], ["本节点推理 或 降级中心推理", { bold: true, color: C.red }], ["，博弈结果外显可取证——算存彻底解耦。", {}]]) },
  ];
  invs.forEach((iv, i) => {
    const x = 0.5 + i * 3.035;
    box(s, x, 3.5, 2.93, 1.6);
    s.addShape(p.shapes.RECTANGLE, { x: x + 0.14, y: y0 = 3.62, w: 0.13, h: 0.13, fill: { color: iv.c } });
    T(s, iv.t, { x: x + 0.36, y: 3.56, w: 2.5, h: 0.42, fontSize: 10, bold: true, color: C.text });
    s.addText(iv.d, { x: x + 0.14, y: 4.02, w: 2.66, h: 1.0, fontSize: 8.5, color: C.body, fontFace: F, margin: 0, lineSpacingMultiple: 1.15 });
  });
})();

/* ============ 05 总体架构与数据流 ============ */
(function () {
  const s = newSlide("总体架构与数据流");
  header(s, "05", "怎么做 —— 总体架构与数据流", "落地路径清晰，各部件都有成熟对标");
  // 节点
  s.addShape(p.shapes.ROUNDED_RECTANGLE, { x: 2.05, y: 1.02, w: 1.9, h: 0.44, rectRadius: 0.06, fill: { color: C.redFill }, line: { color: C.red, width: 1.5 } });
  T(s, "推理客户端 / Agent", { x: 2.05, y: 1.02, w: 1.9, h: 0.44, align: "center", valign: "middle", fontSize: 10.5, bold: true, color: C.red });
  // 网关容器（内置 KV 目录 + 潮汐调度器）
  box(s, 1.65, 1.82, 2.3, 1.1, C.panel, C.red, 1.75);
  T(s, "全局路由网关", { x: 1.65, y: 1.88, w: 2.3, h: 0.24, align: "center", fontSize: 10.5, bold: true, color: C.text });
  s.addShape(p.shapes.RECTANGLE, { x: 1.82, y: 2.16, w: 0.92, h: 0.38, fill: { color: C.bg }, line: { color: C.grayBd, width: 1 } });
  T(s, "KV 目录", { x: 1.82, y: 2.16, w: 0.92, h: 0.38, align: "center", valign: "middle", fontSize: 9.5, bold: true, color: C.text });
  s.addShape(p.shapes.RECTANGLE, { x: 2.84, y: 2.16, w: 1.0, h: 0.38, fill: { color: C.bg }, line: { color: C.grayBd, width: 1 } });
  T(s, "潮汐调度器", { x: 2.84, y: 2.16, w: 1.0, h: 0.38, align: "center", valign: "middle", fontSize: 9.5, bold: true, color: C.text });
  T(s, "亲和路由 · 博弈 · 分发", { x: 1.65, y: 2.6, w: 2.3, h: 0.24, align: "center", fontSize: 7.5, color: C.muted });
  // 中心 / 区域 / 边缘
  box(s, 0.4, 3.8, 1.7, 0.62, C.panel, C.amber, 1.5);
  T(s, "中心 Prefill DC", { x: 0.4, y: 3.88, w: 1.7, h: 0.22, align: "center", fontSize: 10, bold: true, color: C.text });
  T(s, "生产 KV 段（源站）", { x: 0.4, y: 4.12, w: 1.7, h: 0.2, align: "center", fontSize: 7.5, color: C.muted });
  box(s, 4.2, 3.18, 1.75, 0.5, C.panel, C.grayBd, 1);
  T(s, "区域缓存节点", { x: 4.2, y: 3.24, w: 1.75, h: 0.2, align: "center", fontSize: 10, bold: true, color: C.text });
  T(s, "区域驻留（区域 POP）", { x: 4.2, y: 3.45, w: 1.75, h: 0.18, align: "center", fontSize: 7.5, color: C.muted });
  box(s, 4.2, 4.32, 1.75, 0.5, C.panel, C.grayBd, 1);
  T(s, "边缘 Decode 节点", { x: 4.2, y: 4.38, w: 1.75, h: 0.2, align: "center", fontSize: 10, bold: true, color: C.text });
  T(s, "就近命中 + Decode", { x: 4.2, y: 4.59, w: 1.75, h: 0.18, align: "center", fontSize: 7.5, color: C.muted });
  // 箭头
  arrow(s, 2.45, 1.46, 2.45, 1.82, C.red, 1.75);
  T(s, "先查后连", { x: 1.66, y: 1.5, w: 0.72, h: 0.2, fontSize: 8.5, color: C.red, align: "right" });
  arrow(s, 3.35, 1.82, 3.35, 1.46, C.red, 1.75);
  T(s, "RouteGrant", { x: 2.56, y: 1.5, w: 0.72, h: 0.2, fontSize: 8.5, color: C.red, align: "right" });
  arrow(s, 2.2, 2.92, 1.45, 3.8, C.muted, 1.5, true);
  T(s, "调度 / 分发", { x: 0.95, y: 3.14, w: 1.0, h: 0.2, fontSize: 8.5, color: C.muted });
  arrow(s, 2.1, 4.02, 4.2, 3.44, C.amber, 1.75);
  T(s, "预分发 KV 段", { x: 2.45, y: 3.56, w: 1.3, h: 0.2, fontSize: 8.5, color: C.amber });
  arrow(s, 5.05, 3.68, 5.05, 4.32, C.amber, 1.75);
  T(s, "下沉", { x: 5.15, y: 3.9, w: 0.6, h: 0.2, fontSize: 8.5, color: C.amber });
  arrow(s, 4.2, 4.32, 3.97, 1.46, C.red, 2.25);
  T(s, "TokenStream（直连返回）", { x: 4.14, y: 2.74, w: 1.75, h: 0.34, fontSize: 8.5, bold: true, color: C.red });
  // 部件表
  const th = { fill: { color: C.headFill }, bold: true, color: C.text, fontSize: 8.5 };
  const rows = [
    [{ text: "部件", options: th }, { text: "职责", options: th }, { text: "对标 CDN", options: th }],
    ["全局路由网关", "亲和路由·博弈·分发（内置 KV 目录+潮汐调度器）", "智能 DNS"],
    ["中心 Prefill DC", "生产 KV 段+兜底推理", "源站"],
    ["区域缓存节点", "区域驻留（三级缓存）", "区域 POP"],
    ["边缘 Decode 节点", "就近命中+Decode", "边缘节点"],
    ["WAN 传输加速层", "压缩流式传输", "回源链路"],
    ["信任与验证引擎", "防投毒校验", "安全层"],
  ];
  s.addTable(rows, { x: 6.15, y: 1.02, w: 3.45, colW: [1.18, 1.42, 0.85], fontFace: F, fontSize: 8.5, color: C.body, border: { pt: 0.75, color: C.line }, fill: { color: C.panel }, valign: "top", margin: 0.05, rowH: 0.34 });
  T(s, "图中节点与右侧部件一一对应；网关内嵌目录与调度器。", { x: 6.15, y: 4.7, w: 3.45, h: 0.4, fontSize: 8, color: C.muted, lineSpacingMultiple: 1.2 });
})();

/* ============ 06 差异化对比 ============ */
(function () {
  const s = newSlide("差异化对比");
  header(s, "06", "差异化对比 —— 我们与传统方案的本质区别", "回答「为什么不用现有方案」");
  const th = (t) => ({ text: t, options: { fill: { color: C.headFill }, bold: true, color: C.text, fontSize: 9 } });
  const usp = (t) => ({ text: t, options: { color: C.red, bold: true } });
  const t1 = [
    [th("维度"), th("传统内容 CDN"), th("KV Cache CDN"), th("差异含义")],
    ["缓存对象", "静态文件（图片/视频）", "模型绑定张量（须匹配版本/LoRA）", "需版本化一致性管理"],
    ["回源代价", "仅带宽（拉文件）", "昂贵算力 + 数十秒时间", "命中价值高 100×"],
    ["匹配粒度", "URL 完整匹配", "前缀/语义块部分匹配", "部分命中也有收益"],
    ["增长特性", "完整文件", "增量追加（前缀复用+后缀生成）", "需流式拼接"],
    ["错误影响", "404 / 文件损坏", "静默的生成质量劣化", "需校验与回退机制"],
  ];
  s.addTable(t1, { x: 0.5, y: 1.0, w: 9.0, colW: [1.0, 2.1, 3.0, 2.85], fontFace: F, fontSize: 9, color: C.body, border: { pt: 0.75, color: C.line }, fill: { color: C.panel }, valign: "top", margin: 0.05, rowH: 0.32 });
  const t2 = [
    [th("维度"), th("现有推理框架 (vLLM/SGLang)"), th("现有分离方案 (Mooncake/DistServe)"), th("我们的 KV Cache CDN")],
    ["缓存范围", "单节点/单集群", "单数据中心集群", usp("跨地域全局三级缓存")],
    ["复用粒度", "线性前缀", "线性前缀", usp("位置无关 + 跨模型")],
    ["调度维度", "本地排队", "集群内负载均衡", usp("全局成本×延迟×潮汐×信任")],
    ["算力来源", "自有集群", "自有集群", usp("DC 骨干 + P2P 长尾双模")],
    ["生命周期", "请求/会话级", "请求级", usp("请求→会话→跨会话→持久 四级")],
  ];
  s.addTable(t2, { x: 0.5, y: 3.14, w: 9.0, colW: [1.15, 2.35, 2.5, 3.0], fontFace: F, fontSize: 9, color: C.body, border: { pt: 0.75, color: C.line }, fill: { color: C.panel }, valign: "top", margin: 0.05, rowH: 0.32 });
})();

/* ============ 07 总结 ============ */
(function () {
  const s = newSlide("总结——创新点与价值");
  header(s, "07", "总结 —— 创新点与价值", "三创新 · 两维价值论证");
  const invs = [
    { c: C.blue, t: "① 缓存亲和性路由",
      w: R([["是什么：", { bold: true, color: C.red }], ["全局网关像智能 DNS，按「复用程度 × SLA × 成本」把请求调度到“已算过这份上下文”的节点，客户端直连、不经网关转发。", {}]]),
      g: R([["带来什么：", { bold: true, color: C.red }], ["KB 级路由决策替代 GB 级 KV 传输，跨域硬传清零；命中节点只算增量，首字延迟 10s → 1–2s。", {}]]) },
    { c: C.green, t: "② 基于不同 KV 段的统计复用与分发",
      w: R([["是什么：", { bold: true, color: C.red }], ["把上下文按“多少人共用”切成独立寻址的段；统计每段命中、共享度与区域热度，高共享段低谷期提前分发到位。", {}]]),
      g: R([["带来什么：", { bold: true, color: C.red }], ["一次 Prefill 多次消费，重复计算浪费降 30–70%；预分发成本不到单次硬传的 1/13。", {}]]) },
    { c: C.red, t: "③ 经济与 SLA 博弈后的存算物理分离",
      w: R([["是什么：", { bold: true, color: C.red }], ["每次推理前实时估算“本地重算 / 跨域拉取 / 降级中心”三条路的耗时与价格，对照 SLA 择优——本节点推理，或上移中心完成。", {}]]),
      g: R([["带来什么：", { bold: true, color: C.red }], ["宁可重算绝不死等，恶劣网络下 SLA 仍可承诺；算存解耦，边缘可用更便宜的专用硬件。", {}]]) },
  ];
  invs.forEach((iv, i) => {
    const x = 0.5 + i * 3.035;
    box(s, x, 0.98, 2.93, 2.0);
    s.addShape(p.shapes.RECTANGLE, { x: x + 0.14, y: 1.1, w: 0.13, h: 0.13, fill: { color: iv.c } });
    T(s, iv.t, { x: x + 0.36, y: 1.04, w: 2.5, h: 0.44, fontSize: 10, bold: true, color: C.text });
    s.addText(iv.w, { x: x + 0.14, y: 1.52, w: 2.66, h: 0.72, fontSize: 8, color: C.body, fontFace: F, margin: 0, lineSpacingMultiple: 1.12 });
    s.addText(iv.g, { x: x + 0.14, y: 2.26, w: 2.66, h: 0.62, fontSize: 8, color: C.body, fontFace: F, margin: 0, lineSpacingMultiple: 1.12 });
  });
  // 价值两行
  function valRow(y, emoji, label, body) {
    box(s, 0.5, y, 9.0, 1.0);
    s.addShape(p.shapes.OVAL, { x: 0.72, y: y + 0.28, w: 0.44, h: 0.44, fill: { color: C.redFill }, line: { color: C.red, width: 1 } });
    T(s, emoji, { x: 0.72, y: y + 0.28, w: 0.44, h: 0.44, align: "center", valign: "middle", fontSize: 13, bold: true, color: C.red });
    T(s, label, { x: 1.32, y: y + 0.1, w: 1.75, h: 0.8, fontSize: 11.5, bold: true, color: C.text, valign: "middle", lineSpacingMultiple: 1.15 });
    s.addText(body, { x: 3.15, y: y + 0.08, w: 6.2, h: 0.86, fontSize: 9.5, color: C.body, fontFace: F, margin: 0, valign: "middle", lineSpacingMultiple: 1.18 });
  }
  valRow(3.12, "用", "最终用户（ToC）",
    R([["体验", { bold: true, color: C.red }], ["：首字延迟 10s 级 → ", {}], ["1s 内（11×）", { bold: true, color: C.red }], ["，长上下文、多轮 Agent 问答不再「等待思考」，接近本地应用的流畅度；", {}], ["成本", { bold: true, color: C.red }], ["：推理成本下降传导为普惠定价，长上下文场景单次成本降 ", {}], ["64%", { bold: true, color: C.red }], ["，让用户「用得起」长上下文。", {}]]));
  valRow(4.22, "商", "服务提供商（运营商）",
    R([["成本", { bold: true, color: C.red }], ["：推理 TCO ", {}], ["−30~45%", { bold: true, color: C.red }], ["——免每地域堆高配 GPU、边缘仅需低成本 Decode 硬件、低谷闲置算力变「夜间 Prefill 工厂」；", {}], ["业务", { bold: true, color: C.red }], ["：复用现有 CDN 机房与骨干专线，升级为「推理 CDN」新基础设施、开展 MaaS 服务；", {}], ["质量", { bold: true, color: C.red }], ["：博弈降级保障恶劣网络下 SLA 可承诺。", {}]]));
})();

p.writeFile({ fileName: "KV Cache CDN 立项汇报.pptx" }).then(() => console.log("PPTX written OK, slides:", pageNo));
