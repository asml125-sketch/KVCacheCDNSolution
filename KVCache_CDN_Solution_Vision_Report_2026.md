# 大模型推理基础设施演进：KV Cache CDN 解决方案构想与技术论证报告

**发布时间：** 2026年9月  
**发布机构：** Global AI Infrastructure Research Team

---

## 1. 核心结论

**核心论点：** 大模型推理的瓶颈已从“计算密集型”全面转向“访存与显存密集型”。随着百万级长上下文和 Agentic 场景的普及，KV Cache 已从单机内存管理的局部问题，演变为类似互联网内容分发的全球路由与网络传输问题（KV Cache CDN）。

### 1.1 业界研究热点与技术演进方向
截至 2026 年，大模型推理架构经历了从单机 PagedAttention [cite: P1]、前缀树路由 RadixAttention [cite: P2]，到预填充与解码分离（PD Disaggregation）[cite: P4, P5]，再到集群级多级缓存 Mooncake [cite: P6] 的演进。目前的绝对前沿是跨地域的数据中心协同（Cross-DC Inference）。研究重点已经转向：如何将 KV Cache 压缩为高效的网络流（CacheGen [cite: P7]）、如何实现位置无关的跨模板复用（EPIC [cite: P9], CacheBlend [cite: P8]），以及如何通过广域网建立类似互联网 CDN 的 KV 分发网络（Internet for KV Cache [cite: P14]）。

### 1.2 跨网拉取 vs 本地重算的盈亏平衡点（计算过程）
何时通过广域网（WAN）从远端节点拉取 KV Cache 比在本地重新计算（Prefill）更划算？这取决于网络传输时间与本地计算时间的比对。

* **参数假设：** 假设模型为 LLaMA-3-70B（128层，8192头，头维度128），FP16精度。1 个 Token 的 KV Cache 大小 $S_{	ext{token}}$ 约为 5 MB。对于 $L = 100	ext{K}$ 长度的上下文，总 KV Cache 大小 $S_{	ext{total}} = 500	ext{ GB}$。
* **本地重算时间：** 假设使用 H100 集群，Prefill 吞吐量 $R_{	ext{prefill}}$ 为 10,000 tokens/s。重算时间 $T_{	ext{recompute}} = L / R_{	ext{prefill}} = 10$ 秒。
* **远端拉取时间：** 假设两地数据中心间可用 WAN 带宽 $B = 100	ext{ Gbps}$（实际吞吐约 $10	ext{ GB/s}$）。原始传输时间为 50 秒，劣于重算。
* **结合 CacheGen 压缩：** CacheGen [cite: P7] 及 PrfaaS [cite: P13] 采用混合线性模型，可实现约 $C = 5$ 倍的压缩率。压缩后传输大小降至 100 GB。传输时间 $T_{	ext{fetch}} = 100 / 10 = 10$ 秒。
* **硬件卸载：** 若使用 SmartNIC 进行线速解压（ShadowServe [cite: P15]），解压开销趋近于 0。

**结论：** 当 $S_{	ext{total}} / (B 	imes C) < L / R_{	ext{prefill}}$ 时，跨网拉取占优。在百G跨洋专线和最新压缩算法加持下，100K 以上上下文的跨机房分发在 2026 年已具备极高的技术和商业可行性。

---

## 2. 解决方案构想：KV Cache CDN 架构

基于上述结论，我们构想了下一代“KV Cache CDN”的全球化系统架构。该系统将大模型推理过程解耦为“集中式预填充（Core Prefill DC）”与“边缘式解码（Edge Decode DC）”，通过高速广域网和智能网关实现流转。

### 2.1 架构部件与职责
* **Global Unified Gateway（全局路由网关）：** 系统的核心大脑。负责接收终端请求，基于时区潮汐、各个 DC 的显存空闲率、预计算命中率决定请求转发路由。类似传统 CDN 的 DNS 与全局负载均衡器。
* **Core Prefill DC（核心重计算数据中心）：** 部署在电费低廉、算力极度密集（如万卡 H100/B200 集群）的区域。专门负责处理首字生成（TTFT）的巨量矩阵乘法运算，并生成庞大的 KV Cache。
* **Edge Decode DC（边缘潮汐解码节点）：** 部署在靠近用户、跨越不同时区的边缘机房。算力较弱但分布广，负责接收压缩后的 KV Cache 并在本地完成逐字解码（Decode），通过就近服务降低用户的绝对延迟（网络 RTT）。
* **KV Router & Tiered Storage（KV存储路由）：** 单节点内的分层存储组件。基于 Mooncake [cite: P6] 的架构，在 GPU VRAM、CXL 扩展内存、NVMe SSD 之间进行 KV 页的冷热置换与 P2P 传输。
* **WAN Transport Layer（广域传输加速层）：** 集成 CacheGen 压缩器与 SmartNIC 硬件解压（ShadowServe [cite: P15]）。负责在 Core 和 Edge 之间以最少带宽传输 KV 张量流。

### 2.2 解决方案架构图
```text
┌────────┐        ┌──────────────────────┐        ┌─────────────────────────┐
│  User  │ ------ │ Global Unified Gateway│ ------ │ Core DC (Prefill)       │
└────────┐        └──────────────────────┘        │ - Heavy Compute GPUs    │
    │                 │                           │ - CacheGen Encoder      │
    │                 │ 1. Route Prompt           └─────────────────────────┘
    │                 ▼                                        │
    │     ┌──────────────────────┐                             │ 2. Compressed KV Stream (WAN)
    │     │ Edge DC (Decode)     │ ◄───────────────────────────┘
    │     │ - SmartNIC Decoder   │
    │     │ - Tidal Inference    │
    │     └──────────────────────┘
    │                 │
    └─────────────────┘ 3. Stream Tokens to User
```

---

## 3. 背景：为什么 KV Cache 变成了 CDN 的问题？

大模型推理的成本正在从“计算（FLOPs）”向“内存带宽（Memory Bandwidth）”转移。长上下文时代的到来（如 Kimi 200万、Gemini 1000万 token）使得单次请求的 KV Cache 膨胀至上百 GB。如果采用传统的单体推理架构，每次用户交互都需要全量重算长文本上下文，这不仅带来巨大的 TTFT（首字延迟），更造成了极其高昂的算力浪费。

为了解决这个问题，业界开始了激进的缓存复用。但单一 GPU 显存（80GB/144GB）无法装下大量的长上下文。因此，系统设计被迫将 KV Cache 卸载到 DRAM、SSD 甚至其他机器上。当这些缓存跨越机器、跨越机架、甚至跨越数据中心流转时，其本质特征——一次计算（内容生成）、多次分发（内容消费）、地理隔离，与互联网早期的静态网页和视频分发网络（CDN）如出一辙。“Compute Delivery Network”的概念应运而生 [cite: P14]。

---

## 4. KV Cache 发展的五个时代

技术的演进是一场与硬件物理限制的持续博弈。KV Cache 的管理范式经历了五个清晰的时代：

1. **Era 1: 内存分页化时代 (PagedAttention [cite: P1])** - 引入 OS 的分页机制，打破连续内存分配限制，根治显存碎片，为大规模并发奠定基础。
2. **Era 2: 结构化重用时代 (RadixAttention [cite: P2] & Prompt Cache [cite: P3])** - 发现系统提示（System Prompts）可以复用。利用基数树实现多请求间的共享前缀免重算，极大提高了吞吐量。
3. **Era 3: 相位分离时代 (PD Disaggregation [cite: P4, P5])** - 观察到 Prefill 阶段吃计算，Decode 阶段吃显存带宽，将两种负载剥离到不同架构的 GPU 集群上执行。
4. **Era 4: 集群存储池化时代 (Mooncake [cite: P6] & MemServe [cite: P10])** - PD 节点间面临巨大的 KV 传输墙，通过引入 CPU DRAM 和 NVMe SSD 作为二级/三级缓存，将整个数据中心变为一个巨大的 KV 缓存池。
5. **Era 5: 全球分发网络时代 (Internet for KV Cache [cite: P14] & PrfaaS [cite: P13])** - 打破数据中心的物理边界，将压缩后的 KV 跨地域传输，利用时区“潮汐”闲置算力，实现全球范围的算力套利。

---

## 5. KV Cache 的四轴分类学

为了更清晰地理解现代推理系统，我们将 KV Cache 的特性抽象为四个维度的分类学：

| 分类维度 | 技术子类 | 对应典型系统 / 论文 |
| :--- | :--- | :--- |
| **1. 存储位置 (Where)** | GPU VRAM (本地)<br>CPU DRAM (宿主机)<br>NVMe SSD (同机持久化)<br>Remote Node (分布式内存) | vLLM [cite: P1]<br>Mooncake [cite: P6]<br>Mooncake [cite: P6]<br>MemServe [cite: P10] |
| **2. 生命周期 (Lifecycle)** | Request-level (单次请求即焚)<br>Session-level (多轮对话持有)<br>Persistent (跨应用永久驻留) | 传统推理框架<br>SGLang [cite: P2]<br>Internet for KV Cache [cite: P14] |
| **3. 所有权共享 (Ownership)** | Tenant-isolated (租户私有)<br>Cross-Tenant (多租户公共模板共享)<br>Cross-Model (跨模型兼容复用) | vLLM 默认<br>RadixAttention [cite: P2]<br>DroidSpeak [cite: P11] |
| **4. 编码与传输 (Format)** | Raw FP16 Tensors (原始高保真)<br>Compressed Stream (网络流压缩)<br>Position-Independent (位置无关) | Splitwise [cite: P5]<br>CacheGen [cite: P7], PrfaaS [cite: P13]<br>EPIC [cite: P9], CacheBlend [cite: P8] |

---

## 6. 关键论文研究图谱

本次报告所依托的 16 篇核心论文，构成了 KV Cache CDN 的理论支撑与工程蓝图：

* **基石层：** [cite: P1] PagedAttention 解决了根本的内存管理问题；[cite: P2] SGLang 与 [cite: P3] Prompt Cache 将“重用”提上日程。
* **架构层：** [cite: P4] DistServe 和 [cite: P5] Splitwise 证明了 PD 分离架构的绝对优势。特别指出，2025年工业界已经将“PD分离”作为默认 playbook。
* **资源池化层：** [cite: P6] Mooncake 提出了极其惊艳的以 KV 为中心的 KVCache-centric 调度，利用三级存储解决集群内 KV 重载；[cite: P10] MemServe 统一了内存池抽象；[cite: P12] Preble 解决了分布式路由调度问题。
* **进阶重用技术：** [cite: P8] CacheBlend 解决了 RAG 场景中非前缀多块缓存的融合难题，而 [cite: P9] EPIC 提出了跨时代的 位置无关缓存 (PIC)，使得复用不再局限于 Prompt 头部，任何语义块均可缓存。更有 [cite: P11] DroidSpeak 打破了模型壁垒，实现跨 LLM 的 KV 共享。
* **CDN 传输与硬件加速网络（2026最新突破）：** [cite: P7] CacheGen 提供定制的张量网络流压缩器；[cite: P13] PrfaaS 在工程上彻底跑通了跨广域网（跨数据中心）的 Prefill 卸载实验；[cite: P15] ShadowServe 利用 SmartNIC 提供零 GPU 干扰的底层硬件网络解压；[cite: P14] An Internet for the KV Cache 与 [cite: P16] LMCache 技术报告勾勒出了类似 Akamai/Cloudflare 的去中心化、服务网格化的全球大模型算力分发体系。

---

## 7. 跨机房与 "潮汐 KV"：从 PrfaaS 到全球算力网络

全球算力网络的核心商业驱动力在于解决时区算力潮汐带来的空置成本。美西时间的夜间闲置算力，完全可以承接亚洲白天的 Decode 压力。

### 7.1 PrfaaS 的核心突破
PrfaaS [cite: P13] 验证了一个极为激进的假设：将高并发的 Prefill 放在超大规模集群（如北美算力中心），将海量轻量级 Decode 节点下发至全球边缘。这背后的底气在于：通过混合线性模型，能耗高、时间长的 Prefill 运算结果（KV Cache），被极致压缩为可通过广域网快速传输的字节流，传输耗时低于本地重算耗时。

### 7.2 硬件层的刚性配套
实现这一切不仅依赖软件调度，底层的硬件基建在 2026 年也已就位：
* **NVMe SSD（分层底座）：** 提供单机 TB 级、廉价且高速的持久化缓存。
* **CXL (Compute Express Link)：** 实现机架维度的内存池化，使得 CPU 能够透明、低延迟地访问远端内存，化解 GPU 显存墙。
* **SmartNIC (智能网卡 DPU)：** 如 ShadowServe [cite: P15] 所述，通过网卡直接进行 KV Cache 的解压与反量化，将 GPU PCIe 通信带宽占用降到最低，实现“零干扰”。
* **Rubin CPX (NVIDIA 互连技术)：** 下一代高带宽互连架构，为单节点内的 KV 急速搬迁提供了物理基础。

---

## 8. 关键挑战与解决方案全景图

| 核心挑战 | 解决方案构想 | 成熟度 (2026) |
| :--- | :--- | :--- |
| **跨地域广域网带宽受限** | 使用自适应网络带宽的张量压缩引擎 (CacheGen [cite: P7])，结合非线性量化。 | 高 (已在 PrfaaS 中得到产业验证) |
| **非前缀文本无法复用** | 位置无关缓存 (PIC) 与 融合重算机制 (CacheBlend [cite: P8], EPIC [cite: P9])。 | 中 (LMCache [cite: P16] 开始集成) |
| **KV 传输挤占 GPU PCIe 带宽** | 硬件卸载：使用 SmartNIC/DPU 进行带外解压缩 (ShadowServe [cite: P15])。 | 中高 (硬件就位，驱动适配中) |
| **跨租户与跨模型壁垒** | 跨微调模型共享关键层 KV (DroidSpeak [cite: P11])；安全区域加密隔离。 | 低 (研究前沿，安全问题突出) |

---

## 9. 当前主流推理框架的支持程度

截至报告撰写（2026年9月），业界的主流框架对“CDN化”支持进展不一：
* **vLLM：** 仍然是生态基石。原生集成 PagedAttention，实验性分支已接入外部 KV Storage API，与 LMCache [cite: P16] 的结合最高提升了 15 倍吞吐量。
* **SGLang：** 其 RadixAttention 架构对局部集群内的多模态、多轮对话前缀复用支持最好，是实现节点内“微型CDN”的首选。
* **TensorRT-LLM (NVIDIA)：** 强绑定硬件生态，目前主要发力点在单机多卡的 NVLink 层面的 KV 공유，对广域网传输的官方支持较弱。
* **LMCache：** 原生为 KV Cache CDN 而生。作为独立中间件，已实现与多种后端解耦的全局内存池与传输控制，是目前最接近“Internet for KV Cache”愿景的开源实践 [cite: P14, P16]。

---

## 10. 仍然需要克服的关键难题（开放问题）

尽管技术栈已初步成型，但要建立真正的全球性大模型公用事业网络，仍面临以下瓶颈：
1. **极端网络抖动与数据一致性：** 跨洋专线偶尔出现微秒级甚至毫秒级抖动，如何设计无锁或弱一致性的容灾回退机制（Fallback to local recompute）？
2. **零知识隐私计算 (ZKP) 与 KV 加密：** 多租户架构下，客户极其敏感的 Prompt 经预填充后变成 KV Cache 流转到不受信任的边缘节点，如何在不解密张量的情况下进行高效 Decode 是当前的学术真空。
3. **多芯片架构的算力等价映射：** 核心重算 DC 如果是 NVIDIA B200，而边缘 Decode DC 是 AMD MI300 或华为昇腾，不同精度、不同张量排布的硬件之间如何实现 KV Cache 的无缝“漂移”与对齐？

---

## 11. 总结

计算的历史始终在“集中”与“分布”之间震荡摇摆。正如 Web 时代的发展轨迹一样——从所有的动态页面由单台服务器生成，演变为由 Akamai 等 CDN 网络在全球边缘节点分发静态资源；大模型推理也正在走上同样的演进道路。KV Cache 就是大模型时代的“静态网页和视频流”。从 PagedAttention 到 PrfaaS，再到未来宏大的 An Internet for the KV Cache 愿景，一张跨越软硬件、跨越数据中心甚至跨越大洋的“AI算力共享网络”正在 2026 年的今天破茧而出。谁能率先定义并建成这张“大模型时代的通信网”，谁就将掌握下一个十年的 AI 基础设施话语权。

---
© 2026 Global AI Infrastructure Research Team. Generated on September 2, 2026.  
This report relies on architectural frameworks proposed in [cite: P1] through [cite: P16].
