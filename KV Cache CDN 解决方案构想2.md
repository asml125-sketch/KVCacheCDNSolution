# KV Cache CDN 构想报告（2026更新版）

> 本次更新基于领域最新16篇核心论文重构技术脉络，补充位置无关缓存、跨模型共享、SmartNIC卸载等前沿方向，更新产业落地进展与性能数据。

---

## 背景：为什么 KV Cache 变成了"CDN 问题"

### 1. KV 缓存的地位跃迁

KV 缓存已经从 LLM 推理的「临时附属张量」升级为**第一等系统资源**：

- 容量维度：70B 级模型 128K 上下文单请求 KV 约 40GiB，百并发场景轻松突破 TB 级，远超单卡 HBM 上限；
- 成本维度：长上下文推理中，KV 相关的内存开销、传输开销、重计算成本已经占到推理总成本的 50% 以上；
- 业务维度：多轮对话、RAG、系统提示词等场景存在大量重复前缀，重复计算 Prefill 造成的算力浪费可达 30%~70%。

当 KV 缓存的价值、体量、影响范围突破了单集群边界，它就不再是一个引擎内部的内存管理问题，而变成了一个**跨地域、跨集群、跨层级、跨模型的内容分发问题**——也就是 KV Cache CDN 问题。

### 2. 三大核心驱动力

#### （1）上下文窗口爆炸

从 4K → 128K → 1M+ token，KV 体积线性增长，单集群显存无法承载全量热数据，必须分层、跨地域存放。

#### （2）算力异构与分布不均

- Prefill 是计算密集型，适合高算力芯片（如 NVIDIA Rubin CPX）；Decode 是带宽密集型，适合高显存带宽芯片（如 Groq LPU）。两类芯片往往不在同一个机房、同一个区域。
- 不同地域电价、算力成本差异可达 2~5 倍，将长上下文 Prefill 卸载到低成本算力区可显著降低 TCO。

#### （3）跨区域就近服务

全球/全国化部署要求用户就近接入，但每个区域都重复计算相同的系统提示词、通用 RAG 上下文、热门问题前缀，会造成巨量算力冗余。

### 3. KV Cache CDN 与传统内容 CDN 的本质区别

| 维度   | 传统静态内容 CDN   | KV Cache CDN                            |
| ---- | ------------ | --------------------------------------- |
| 内容属性 | 静态独立文件       | 模型绑定张量，必须匹配模型版本、tokenizer、位置编码、LoRA 适配器 |
| 增长特性 | 完整文件分发       | 增量追加，前缀可复用、后缀持续生成                       |
| 错误影响 | 文件损坏、加载失败    | 生成质量下降、逻辑错乱、输出不可控                       |
| 回源代价 | 仅带宽成本，拉取文件即可 | 算力+时间成本极高，需要完整重跑 Prefill                |
| 匹配粒度 | URL 完整匹配     | 前缀部分匹配，公共前缀越长复用收益越大                     |

---

## KV Cache 演进的五个时代

KV 缓存管理经历了五代演进，每一代都在突破上一代的部署边界与资源边界，最终走向全域分发的 CDN 形态。16篇核心论文完整覆盖了整条演进路径。

| 时代              | 阶段定位                           | 核心特征                         | 代表论文/系统                                                                                           | 解决的核心问题                        | 核心局限                 |
| --------------- | ------------------------------ | ---------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------ | -------------------- |
| **时代1：本地张量时代**  | 单请求内的临时缓冲区                     | 连续张量分配，请求结束即释放               | 早期 Transformers、HuggingFace 原生推理                                                                  | 最基础的注意力状态存储                    | 内存碎片严重、无法复用、利用率极低    |
| **时代2：本地分页时代**  | 单实例内的块级管理                      | PagedAttention 块分配、连续批处理     | [P1] vLLM / PagedAttention                                                                        | 内存碎片、批处理效率，把batch从数十扩展到数千      | 仅单 GPU/单节点，跨节点无法共享   |
| **时代3：集群内共享时代** | 单集群内的分布式共享                     | 前缀缓存、跨请求复用、内存池化              | [P2] SGLang、[P3] Prompt Cache、[P10] MemServe、[P12] Preble                                         | 跨请求重复计算、集群内 KV 池化              | 严格限定在单 RDMA 域内，无法跨集群 |
| **时代4：跨集群解耦时代** | 跨集群的 Prefill-Decode 分离 + 网络层优化 | PD 分离架构、KV 传输压缩、位置无关缓存、跨模型共享 | [P4] DistServe、[P5] Splitwise、[P6] Mooncake、[P7] CacheGen、[P8] CacheBlend、[P9] EPIC、[P16] LMCache | 异构算力不共址、单集群算力瓶颈、传输带宽瓶颈         | 单向卸载为主，缺少多级缓存与全域分发   |
| **时代5：全域分发时代**  | 跨地域的 KV 内容分发网络                 | 多级缓存、智能路由、主动预分发、硬件卸载、跨模型协同   | [P13] PrfaaS、[P14] An Internet for the KV Cache、[P15] ShadowServe、[P11] DroidSpeak                | 跨区域就近服务、全局算力套利、容灾弹性、多模型Agent场景 | 架构标准、一致性语义、成本模型尚未成熟  |

> 核心演进规律：**KV 的活动范围不断扩大，生命周期不断变长，所有权从分散走向集中再走向分布式，载体从片上内存延伸到广域网**，每一代都在上一代的基础上扩展一层边界。

---

## KV Cache CDN 的四轴分类学

沿用 KV 缓存管理领域经典的**四轴分类框架**（ locality / lifetime / ownership / substrate），针对 CDN 场景重新定义取值与边界，可对所有 KV Cache CDN 架构进行精准定位。

### 轴一：局部性（Locality）——KV 在哪里被访问

描述消费者从哪一层级获取 KV 块，对应 CDN 的层级结构。

- **L0 边缘节点**：部署在接入点/边缘机房，存储极高频短前缀，微秒级命中；
- **L1 区域集群**：区域级数据中心，存储本区域热前缀，毫秒级访问；
- **L2 核心中心**：核心数据中心，全量前缀库与 Prefill 算力池，十毫秒级访问；
- **L3 冷存储层**：SSD/对象存储，存储冷历史 KV，百毫秒级召回。

### 轴二：生命周期（Lifetime）——KV 保留多久

描述 KV 块的保留范围与策略，对应 CDN 的缓存时效。

- **B0 请求级**：仅单次请求使用，传输完成即释放；
- **B1 会话级**：单用户会话内跨轮次保留；
- **B2 跨会话级**：跨用户、跨请求共享热门前缀；
- **B3 全局持久级**：长期保留可复用前缀，主动分发到各级节点。

### 轴三：所有权（Ownership）——谁管理 KV 的放置与驱逐

描述 KV 缓存的控制平面模式，对应 CDN 的调度架构。

- **C0 节点自治**：每个节点独立管理本地缓存，LRU 等本地策略驱逐；
- **C1 中心化调度**：全局调度器统一决定放置、路由、驱逐、预分发；
- **C2 分布式目录**：通过分布式哈希表或目录服务定位 KV，节点对等协作；
- **C3 内容寻址**：按内容哈希寻址，支持对等网络分发与跨模型复用。

### 轴四：载体（Substrate）——KV 通过什么传输与存储

描述数据通路与存储介质，对应 CDN 的基础设施层。

- **D0 HBM/显存**：活跃热数据，最高带宽最低延迟；
- **D1 主机 DRAM**：温数据层，容量大成本低；
- **D2 RDMA/InfiniBand**：集群内高速传输；
- **D3 数据中心以太网**：跨集群传输，百 Gbps 级；
- **D4 广域网/互联网**：跨地域传输，成本高延迟波动大；
- **D5 NVMe/对象存储**：冷存储层，TB~PB 级容量；
- **D6 SmartNIC/DPU**：传输硬件卸载，零干扰推理算力。

> **典型 KV Cache CDN 四轴坐标**：(L0/L1/L2 多级局部性, B2/B3 跨会话+全局持久, C1+C2 中心化调度+分布式目录, D0/D1/D3/D4/D5/D6 多层载体)

---

## 主流论文（16 篇必读）

按照技术演进路径分为五大类，完整覆盖从本地分页到全域CDN的全链条技术。

### 4.1 单机 & 前缀复用：奠基之作

#### [P1] PagedAttention / vLLM

- **发表**：SOSP 2023
- **机构**：UC Berkeley Kwon 等
- **核心贡献**：把操作系统分页思想引入 KV Cache，用块表管理离散内存块，彻底解决内存碎片问题，将推理最大批大小从数十扩展到数千，是所有后续系统的地基。
- **论文链接**：[arXiv:2309.06180](https://arxiv.org/abs/2309.06180)

#### [P2] SGLang / RadixAttention

- **发表**：2023
- **机构**：Zheng 等（CMU / 清华 / 微软）
- **核心贡献**：用基数树（Radix Tree）组织 KV Cache，实现自动、跨请求的前缀重用，是「prefix cache」这个抽象第一次在生产级系统中真正落地。
- **论文链接**：[arXiv:2312.07104](https://arxiv.org/abs/2312.07104)

#### [P3] Prompt Cache

- **发表**：MLSys 2024
- **机构**：Yale Gim 等
- **核心贡献**：首次提出「模块化重用注意力状态」思路，通过 Prompt Markup Language (PML) 显式声明可重用片段，是**位置无关缓存（PIC）** 的思想起点，打破了前缀必须从起始位置匹配的限制。
- **论文链接**：[arXiv:2311.04934](https://arxiv.org/abs/2311.04934)

---

### 4.2 分离式推理：产业化引爆点

#### [P4] DistServe

- **发表**：OSDI 2024
- **机构**：UCSD Hao AI Lab Zhong 等
- **核心贡献**：正式提出 Prefill-Decode 分离架构，Prefill 与 Decode 使用独立 GPU 池，可分别扩缩容。是 NVIDIA Dynamo、llm-d、Ray Serve LLM 等一切生产系统的架构原型。作者在 2025-11 回顾《Disaggregated Inference: 18 Months Later》中公开承认：「disaggregation 已成默认 playbook」。
- **论文链接**：[arXiv:2401.09670](https://arxiv.org/abs/2401.09670)

#### [P5] Splitwise

- **发表**：ISCA 2024
- **机构**：Microsoft Patel 等
- **核心贡献**：独立并行的 PD 分离研究，重点使用异构硬件（H100 做 Prefill / A100 做 Decode）做相位分离以优化能效与成本，证明异构拆分可显著降低总拥有成本。
- **论文链接**：[arXiv:2403.08511](https://arxiv.org/abs/2403.08511)

#### [P6] Mooncake

- **发表**：FAST 2025 **Best Paper**
- **机构**：Moonshot AI + 清华大学 Qin 等
- **核心贡献**：把 PD 分离扩展到整个集群级 KV 缓存池，实现 VRAM/DRAM/SSD 三级分层存储，通过 KVCache-centric 调度器提升整体 goodput。模拟场景吞吐提升 525%，在 A800/H800 上生产实测可多处理 115% / 107% 请求。
- **论文链接**：[arXiv:2407.00079](https://arxiv.org/abs/2407.00079)

---

### 4.3 KV Cache 的"网络层"：压缩与传输

#### [P7] CacheGen

- **发表**：SIGCOMM 2024
- **机构**：UChicago Liu 等
- **核心贡献**：第一次把 KV Cache 当作网络流来优化，设计专用张量编码器把 KV 压缩为紧凑比特流，可根据实时带宽自适应调整压缩等级，KV 大小减少 3.5~4.3 倍，是跨集群/跨地域传输的核心减重技术。
- **论文链接**：[arXiv:2310.07240](https://arxiv.org/abs/2310.07240)

#### [P8] CacheBlend

- **发表**：EuroSys 2025 **Best Paper**
- **机构**：UChicago Yao 等
- **核心贡献**：解决「非前缀 KV Cache 复用」难题，在 RAG 场景中实现多个 chunk 缓存的融合，仅选择性重算少量 token 保证精度，TTFT 降低 2.2~~3.3 倍，吞吐提升 2.8~~5 倍，实现 100% KV 命中率。已内置于 LMCache 中。
- **论文链接**：[arXiv:2405.16444](https://arxiv.org/abs/2405.16444)

#### [P9] EPIC — Efficient Position-Independent Caching

- **发表**：ICML 2025
- **机构**：Sea AI Lab / NUS Hu 等
- **核心贡献**：正式化**位置无关缓存（Position-Independent Caching, PIC）** 概念，把 KV 从「位置绑定」中解放出来，支持跨提示模板复用任意语义 chunk，大幅扩展了可复用 KV 的范围。
- **论文链接**：[arXiv:2410.15332](https://arxiv.org/abs/2410.15332)

---

### 4.4 分布式与跨模型

#### [P10] MemServe

- **发表**：2024
- **机构**：华为诺亚 Hu 等
- **核心贡献**：提出 MemPool 弹性内存池抽象，统一管理跨实例的 KV Cache，支持请求内 / 请求间联合优化，是集群内内存池化的代表。
- **论文链接**：[arXiv:2406.17565](https://arxiv.org/abs/2406.17565)

#### [P11] DroidSpeak

- **发表**：NSDI 2026
- **机构**：Microsoft Liu 等
- **核心贡献**：首次实现**跨 LLM 的 KV Cache 共享**，不同微调后模型之间通过识别「critical layers」关键层部分复用 KV，为 multi-LLM agentic 场景铺平了道路，是 KV Cache CDN 从单模型走向多模型的关键技术。
- **论文链接**：[arXiv:2411.02820](https://arxiv.org/abs/2411.02820)

#### [P12] Preble

- **发表**：ICLR 2024
- **机构**：UVA / GMU Srivatsa 等
- **核心贡献**：提出联合优化 KV 复用和计算负载均衡的分布式调度器，已被工业界 AIBrix 采用，是分布式缓存调度的标杆。
- **论文链接**：OpenReview 可查

---

### 4.5 跨机房与"CDN 化"：最新突破

#### [P13] Prefill-as-a-Service (PrfaaS)

- **发表**：arXiv 2026.04
- **机构**：Moonshot AI Qin 等（Mooncake 团队下一代工作）
- **核心贡献**：把 Prefill 卸载到另一个数据中心，是「KV Cache CDN」的第一份产业级 PoC。核心创新：使用 Kimi Linear 混合模型将 KV 压缩到可跨广域网传输的规模；在 20× 扩容拓扑上完成工程验证，吞吐量较同构部署提升 54%，P90 TTFT 降低 64%。
- **论文链接**：[arXiv:2604.15039](https://arxiv.org/abs/2604.15039)

#### [P14] An Internet for the KV Cache

- **发表**：arXiv 2026.08
- **机构**：UChicago / LMCache / TensorMesh Cheng, Liu, Yao 等
- **核心贡献**：本报告的标题灵感来源，系统性提出「把 KV Cache 当作互联网规模的内容分发对象，用 CDN 领域的方法论重构 LLM 推理架构」，是 KV Cache CDN 方向的纲领性愿景论文。
- **论文链接**：[arXiv:2608.01526](https://arxiv.org/abs/2608.01526)

#### [P15] ShadowServe

- **发表**：arXiv 2025.09
- **机构**：Xiang 等
- **核心贡献**：用 SmartNIC 卸载 KV Cache 解压，实现「零干扰」的分布式前缀缓存获取，解决了「传输 KV 时挤占推理 GPU 通信带宽」的核心问题，是 CDN 传输层硬件加速的标杆方案。
- **论文链接**：[arXiv:2509.16857](https://arxiv.org/abs/2509.16857)

#### [P16] LMCache 技术报告

- **发表**：arXiv 2025.10
- **机构**：Cheng, Liu, Yao 等
- **核心贡献**：LMCache 官方技术报告，整套开源栈的架构与工程实现说明。结合 vLLM 后吞吐提升最高 15 倍，延迟至少降低 2 倍，是分布式 KV 缓存领域最成熟的开源方案。
- **论文链接**：[arXiv:2510.09665](https://arxiv.org/abs/2510.09665)

---

## 开源与工业系统全景

### 1. 开源框架（按 CDN 相关能力排序）

| 项目        | 官方仓库                                                                   | 核心定位       | CDN 相关能力                               |
| --------- | ---------------------------------------------------------------------- | ---------- | -------------------------------------- |
| vLLM      | [github.com/vllm-project/vllm](https://github.com/vllm-project/vllm)   | 推理引擎事实标准   | PagedAttention 基础、前缀缓存、多节点支持、混合模型支持    |
| SGLang    | [github.com/sgl-project/sglang](https://github.com/sgl-project/sglang) | 高吞吐推理框架    | RadixAttention 前缀缓存、HiCache 跨实例缓存、传输优化 |
| LMCache   | [github.com/LMCache/LMCache](https://github.com/LMCache/LMCache)       | 分布式 KV 缓存层 | 内容寻址、跨节点共享、CacheBlend 融合、分布式存储         |
| DistServe | [github.com/LLMServe/DistServe](https://github.com/LLMServe/DistServe) | PD 解耦推理系统  | 单集群 PD 解耦、RDMA 传输、goodput 优化           |
| CacheGen  | 随 SIGCOMM 2024 论文发布                                                    | 传输专用 KV 压缩 | 流式压缩、增量解压、传输带宽优化                       |

### 2. 工业界落地动态

- **Moonshot AI**：落地 PrfaaS 跨数据中心 Prefill 卸载架构，内部验证 54% 吞吐量提升，是目前公开最接近 CDN 形态的生产实践；
- **字节跳动、阿里通义**：内部部署区域级前缀缓存池，支持同区域多集群共享热门前缀；
- **微软 Azure**：内部探索跨区域 KV 缓存路由，DroidSpeak 为其多模型 Agent 场景的研究产出；
- **NVIDIA**：Dynamo 推理框架原生采用 PD 解耦架构，已成为工业部署标准；
- **Anyscale / Ray Serve LLM**：主流服务框架全面拥抱 PD 分离模式；
- **AIBrix**：采用 Preble 分布式调度算法，实现缓存与负载联合优化；
- **Groq**：基于 LPU 芯片的全球部署天然倾向于就近 Decode + 远端 Prefill 的解耦形态；
- **头部云厂商**：普遍在规划「区域 KV 缓存层」，作为推理加速服务的增值能力。

> 产业现状：**单集群前缀缓存已普及，跨集群解耦开始落地，跨区域 CDN 处于试点与构想阶段**，整体处于时代 3 向时代 4 过渡、时代 5 萌芽的节点。

---

## 跨机房与"潮汐 KV"：从 PrfaaS 到 Internet for KV Cache

### 1. 起点：PrfaaS 的跨机房单向卸载

PrfaaS 模式是 KV Cache CDN 的最小可行形态：

- 架构：本地 PD 集群 + 远端 PrfaaS 计算集群，通过以太网连接；
- 策略：选择性卸载——仅长上下文未缓存请求发送到远端计算，KV 生成后传回本地解码；
- 本质：**算力单向流动，KV 单向传输**，用远端富余算力补充本地不足。

这解决了「算力不够」的问题，但还不是完整的 CDN——没有多级缓存、没有双向分发、没有就近服务。

### 2. 进阶：多区域缓存路由

以 Preble、GORGO 为代表的多区域架构，引入了**缓存路由**维度：

- 每个区域维护本地前缀缓存；
- 请求到达时，联合评估「本地缓存长度、跨区域传输延迟、目标节点排队」三个要素，选择端到端延迟最优的路径；
- 本质：**KV 就近访问，算力按需调度**，比单纯命中率优先策略端到端延迟降低 18%。

### 3. 终极形态：潮汐 KV 与 Internet for KV Cache

当跨区域调度与多级缓存结合，就形成了「潮汐 KV」的全域 CDN 形态，对应 [P14] 提出的愿景：

- **算力潮汐**：业务高峰时，调用低成本区域的 Prefill 算力池补充本区域；业务低峰时，反向调度；
- **缓存潮汐**：热点 KV 按访问热度逐级下沉到边缘，冷 KV 回收到中心与冷存储；
- **多模型共享**：通过 DroidSpeak 式的跨模型关键层复用，支持多模型 Agent 场景的 KV 共享；
- **成本套利**：利用不同地域的电价、算力价差，动态调整 Prefill 位置与缓存分布，在保证延迟的前提下最小化成本。

> 核心洞察：KV Cache CDN 不是简单的「把缓存放各地」，而是**算力、缓存、带宽三者的全局动态调度**——KV 跟着请求走，算力跟着 KV 走，成本跟着调度优化。

---

## 硬件层配套：NVMe、CXL、SmartNIC、Rubin CPX

KV Cache CDN 的落地高度依赖硬件层的支撑，四类硬件分别承担不同层级的关键角色。

### 1. NVMe / SSD：冷存储层

- **角色**：CDN 三级冷存储，保存低频历史 KV、长上下文冷前缀；
- **价值**：用 1/10 的成本存储冷数据，需要时通过预取召回 DRAM；
- **关键技术**：块级对齐存储、增量写入、预读流水线；
- **代表**：企业级 NVMe SSD、对象存储网关。

### 2. CXL 共享内存：区域级缓存池

- **角色**：机架级/区域级的共享内存池，承载区域热 KV；
- **价值**：打破单节点显存壁垒，机架内所有 GPU 共享访问同一 KV 池，无需 RDMA 协议栈；
- **对 CDN 的意义**：区域节点可以用更低成本构建大容量 KV 缓存池，提升命中率减少回源；
- **代表**：CXL 3.0 交换机、TraCT / Beluga 架构。

### 3. SmartNIC / DPU：传输卸载层

- **角色**：KV 传输的硬件加速，卸载传输、解压、校验、元数据处理；
- **核心能力**：
  - 零拷贝直接从显存收发 KV，绕开 CPU 内存拷贝；
  - 板载硬件解压 CacheGen 格式流；
  - KV 块校验、版本校验、流量整形；
- **标杆方案**：[P15] ShadowServe，用 SmartNIC 卸载 KV 解压，实现零干扰推理 GPU 通信，解决传输挤占推理带宽的核心问题；
- **价值**：释放 GPU 与 CPU 算力，传输延迟降低 20%~40%，CPU 占用降低 50% 以上。

### 4. Rubin CPX 类 Prefill 专用芯片：中心计算层

- **角色**：核心中心层的 Prefill 算力引擎，专门负责长上下文预填充；
- **价值**：Prefill 吞吐量是通用 GPU 的 2~4 倍，单位算力成本更低；
- **对 CDN 的意义**：让中心回源节点的 Prefill 成本大幅下降，回源计算比拉取远端 KV 更划算的阈值显著降低，CDN 的成本模型更优。

---

## 性能数据速览与经济学

### 1. 关键性能数据速览

| 架构/技术                   | 性能指标                             | 对比基准     | 数据来源                    |
| ----------------------- | -------------------------------- | -------- | ----------------------- |
| PagedAttention          | 批大小提升 10~100 倍                   | 原生连续张量分配 | vLLM SOSP 2023          |
| SGLang 前缀缓存             | Prefill 算力节省 30%~70%             | 无前缀缓存    | SGLang 官方基准             |
| DistServe PD 解耦         | goodput 提升 2~4.8 倍               | 同构部署     | DistServe OSDI 2024     |
| Mooncake 集群 KV 池        | 吞吐提升 5.25 倍（模拟）；生产多处理 115% 请求    | 单节点部署    | Mooncake FAST 2025      |
| CacheGen 传输压缩           | KV 体积减少 3.5~4.3 倍                | 原生 KV 传输 | CacheGen SIGCOMM 2024   |
| CacheBlend RAG 复用       | TTFT 降低 2.2~~3.3 倍，吞吐提升 2.8~~5 倍 | 无缓存 RAG  | CacheBlend EuroSys 2025 |
| LMCache 分布式缓存           | 结合 vLLM 吞吐提升最高 15 倍，延迟降低 ≥2 倍    | 单实例 vLLM | LMCache 2025 技术报告       |
| PrfaaS 跨数据中心            | 吞吐量 +54%，P90 TTFT -64%           | 同构 PD 集群 | PrfaaS 2026，1T 混合模型     |
| ShadowServe SmartNIC 卸载 | GPU 通信干扰降低 90%+，传输延迟降低 30%       | CPU 转发传输 | ShadowServe 2025        |
| DroidSpeak 跨模型共享        | 多模型场景 Prefill 算力节省 20%~40%       | 各模型独立计算  | DroidSpeak NSDI 2026    |

### 2. 经济学分析

#### （1）成本构成

KV Cache CDN 的总成本由三部分组成：

1. **算力成本**：Prefill 计算、Decode 计算；
2. **带宽成本**：跨集群/跨区域 KV 传输；
3. **存储成本**：各级缓存的 HBM、DRAM、SSD 成本。

#### （2）TCO 测算（典型场景）

对于**多区域部署、长上下文占比 30%+、前缀复用率 40%+、多模型 Agent 场景**的业务：

- 单集群同构部署：基准成本 1.0；
- 跨集群 PrfaaS 模式：TCO 降低约 15%~25%（算力节省 > 带宽与新增硬件成本）；
- 完整 KV Cache CDN（三级缓存+智能路由+跨模型复用）：TCO 降低约 30%~45%；
  - 算力节省：前缀复用 + 低成本算力套利 + 跨模型共享，贡献约 65% 的成本下降；
  - 资源效率提升：异构硬件专业化 + 动态调度 + 硬件卸载，贡献约 35% 的成本下降。

#### （3）适用边界

KV Cache CDN 不是所有场景都划算，**正向收益条件**：

- 长上下文请求占比 > 20%；
- 前缀可复用率 > 30%（系统提示词、RAG、热门问题）；
- 多区域部署，单区域算力成本差异大；
- 单集群显存瓶颈明显，扩容成本高；
- 多模型 Agent 场景占比高，跨模型复用收益显著。

---

## 当前开放问题与研究前沿

### 1. 缓存一致性语义缺失

跨数据中心多副本 KV 的一致性模型没有明确定义：是强一致、最终一致还是写时复制？并发扩展同一个前缀时的语义、失效通知的延迟边界，都缺乏系统研究与工程化方案。KV 错误会直接导致生成质量下降，一致性问题比传统 CDN 严重得多。

### 2. 故障容错机制空白

跨数据中心场景下节点故障、链路中断、分区是常态，但现有方案几乎都没有定义：

- KV 副本损坏/丢失时的恢复策略（重计算 / 副本拉取 / 降级）；
- 链路中断时的降级路径与熔断机制；
- 数据级故障的快速校验与修复机制。

### 3. 多租户与安全隔离

共享 KV Cache CDN 存在**时序侧信道风险**：缓存命中/未命中的延迟差异可泄露其他租户的前缀内容。现有方案完全没有针对多租户隔离的设计，包括命名空间隔离、访问控制、延迟混淆防御。在企业级与公有云场景中，这是落地的硬性障碍。

### 4. 新模型架构适配不足

- **MoE 模型**：专家路由的 all-to-all 流量与 KV 传输竞争带宽，专家 KV 的跨数据中心放置策略尚未研究；
- **推测解码**：分支 KV 的回滚语义、临时 KV 的传输优先级，都没有对应方案；
- **Agent 工作流**：分支推理、上下文恢复带来的非线性 KV 生命周期，与现有 CDN 的线性前缀模型不匹配；
- **多模型共享**：DroidSpeak 仅验证了关键层复用，跨模型 KV 的版本兼容、精度损失边界、安全隔离都还处于早期。

### 5. 成本建模与标准缺失

- 现有方案多以性能最大化为目标，缺少结合算力单价、带宽单价、存储单价、地域电价差异的全局 TCO 优化模型；
- 没有统一的 KV 缓存互操作标准，不同厂商、不同框架的 KV 无法互通，阻碍跨厂商 CDN 形成。

---

## 落地建议与技术选型

### 分四阶段落地路线图

#### 阶段一：单集群前缀缓存优化（0~3 个月）

- **目标**：夯实基础，最大化本地复用；
- **技术选型**：vLLM / SGLang 引擎，RadixAttention 前缀缓存；
- **收益**：Prefill 算力节省 30%+，TTFT 显著降低；
- **投入**：仅软件配置，无额外硬件。

#### 阶段二：跨集群 PrfaaS 模式（3~6 个月）

- **目标**：突破单集群算力瓶颈，验证跨数据中心可行性；
- **技术选型**：PrfaaS 架构，选择性卸载策略，双时间尺度调度；
- **硬件**：Prefill 集群用高算力卡，Decode 集群用高带宽卡；
- **收益**：吞吐量提升 30%~~50%，TCO 降低 15%~~25%；
- **适用**：长上下文占比高、本地算力不足的场景。

#### 阶段三：区域级 KV Cache CDN（6~12 个月）

- **目标**：多区域多级缓存，就近服务 + 算力协同；
- **技术选型**：二级缓存（核心+区域），Preble 式智能调度，主动预分发；引入 CacheBlend 支持 RAG 场景非前缀复用；
- **硬件**：区域节点引入 CXL 内存池扩容，SmartNIC 加速传输（ShadowServe 模式）；
- **收益**：跨区域用户延迟降低 20%~30%，全局算力利用率提升。

#### 阶段四：全域 KV Cache CDN（12 个月以上）

- **目标**：跨地域/跨云的全域分发网络，潮汐调度与成本套利，支持多模型共享；
- **技术选型**：三级缓存架构，分布式目录，成本驱动的全局调度，DroidSpeak 式跨模型关键层复用；
- **硬件**：冷存储层 NVMe，全链路 DPU 卸载；
- **收益**：TCO 降低 30%~45%，具备全域容灾能力与多模型 Agent 支撑能力。

### 关键技术选型建议

| 维度   | 推荐选型                              | 说明                       |
| ---- | --------------------------------- | ------------------------ |
| 模型选型 | 优先混合注意力架构（KDA/SWA/线性注意力）          | KV 吞吐降低一个数量级，是跨数据中心可行的基础 |
| 传输协议 | 长距用 TCP+多连接并发，短距用 RDMA            | 兼顾通用性与性能                 |
| 压缩策略 | 传输用 CacheGen，存储用非对称量化             | 传输场景优先压缩率，存储场景优先访问速度     |
| 缓存算法 | 边缘用 LRU，区域用成本加权驱逐                 | 越往上层越要综合考虑重计算成本与传输成本     |
| 调度策略 | 端到端延迟最优，而非命中率最优                   | 避免单纯追求命中率导致长距离传输反而更慢     |
| 硬件卸载 | 传输解压用 SmartNIC 卸载（ShadowServe 模式） | 避免传输挤占推理 GPU 带宽          |

---

## 参考资料与延伸阅读

### 核心论文（16篇）

1. [P1] Efficient Memory Management for Large Language Model Serving with PagedAttention [SOSP 23] https://arxiv.org/abs/2309.06180
2. [P2] SGLang: Efficient Execution of Structured Language Model Programs https://arxiv.org/abs/2312.07104
3. [P3] Prompt Cache: Modular Attention Reuse for Low-Latency Inference [MLSys 24] https://arxiv.org/abs/2311.04934
4. [P4] DistServe: Disaggregating Prefill and Decoding for Goodput-optimized LLM Serving [OSDI 24] https://arxiv.org/abs/2401.09670
5. [P5] Splitwise: Efficient Generative LLM Inference using Phase Splitting [ISCA 24] https://arxiv.org/abs/2403.08511
6. [P6] Mooncake: A KVCache-centric Disaggregated Architecture for LLM Serving [FAST 25 Best Paper] https://arxiv.org/abs/2407.00079
7. [P7] CacheGen: KV Cache Compression and Streaming for Fast LLM Serving [SIGCOMM 24] https://arxiv.org/abs/2310.07240
8. [P8] CacheBlend: Fast Large Language Model Serving for RAG with Cached Knowledge Fusion [EuroSys 25 Best Paper] https://arxiv.org/abs/2405.16444
9. [P9] EPIC: Efficient Position-Independent Caching for Large Language Models [ICML 25] https://arxiv.org/abs/2410.15332
10. [P10] MemServe: Context Caching for Disaggregated LLM Serving with Elastic Memory Pool https://arxiv.org/abs/2406.17565
11. [P11] DroidSpeak: Cross-LLM KV Cache Sharing for Multi-LLM Agentic Systems [NSDI 26] https://arxiv.org/abs/2411.02820
12. [P12] Preble: Efficient Distributed Prompt Scheduling for LLM Serving [ICLR 24]
13. [P13] Prefill-as-a-Service: KVCache of Next-Generation Models Could Go Cross-Datacenter https://arxiv.org/abs/2604.15039
14. [P14] An Internet for the KV Cache https://arxiv.org/abs/2608.01526
15. [P15] ShadowServe: Zero-Interference Distributed Prefetch Cache for LLM Serving with SmartNIC Offloading https://arxiv.org/abs/2509.16857
16. [P16] LMCache: An Efficient KV Cache Layer for Enterprise-scale LLM Inference https://arxiv.org/abs/2510.09665

### 开源项目

- vLLM：https://github.com/vllm-project/vllm
- SGLang：https://github.com/sgl-project/sglang
- LMCache：https://github.com/LMCache/LMCache
- DistServe：https://github.com/LLMServe/DistServe

---

## 核心结论

### 1. 技术可行性：完全成立

KV Cache CDN 在技术上已经具备落地基础：

- **模型侧**：混合注意力架构将 KV 吞吐降低 4~36 倍，使普通以太网即可承载跨数据中心传输；
- **系统侧**：选择性卸载、流水线传输、增量同步、多级缓存、位置无关复用等技术已经成熟，PrfaaS 等方案已完成工程验证；
- **硬件侧**：CXL、SmartNIC、Prefill 专用芯片提供了从内存池到传输到计算的全链路硬件支撑；
- **扩展侧**：跨模型 KV 共享取得突破，为多模型 Agent 场景的 CDN 化铺平了道路。

当前不存在不可逾越的技术障碍，更多是工程化与标准完善的问题。

### 2. 商业可行性：场景成立，收益显著

KV Cache CDN 不是普适方案，但在目标场景下商业价值明确：

- **强收益场景**：多区域部署、长上下文为主、前缀复用率高、算力成本差异大、多模型 Agent 占比高；
- **TCO 改善**：成熟部署可降低 30%~45% 的推理总成本，同时提升用户体验与系统弹性；
- **边际成本**：主要增量在调度软件与跨集群带宽，硬件复用率高，ROI 回报周期短。

### 3. 技术演进方向

1. **从单向卸载到双向分发**：从 PrfaaS 式的单向 Prefill 卸载，走向多级缓存双向分发的完整 CDN；
2. **从性能优先到成本优先**：初期追求吞吐量与延迟，成熟阶段转向全局成本优化与算力套利；
3. **从同构到异构硬件协同**：Prefill 专用芯片、解码芯片、CXL 内存池、DPU 卸载深度协同；
4. **从单模型到多模型共享**：从单模型 KV 分发，走向跨模型、跨任务的通用 KV 内容网络；
5. **从闭域到开放互联**：从单厂商内部 CDN，走向标准化、可互通的 KV 缓存互联网。

> 最终判断：**KV Cache CDN 是长上下文与多模型 Agent 时代 LLM 推理基础设施的必然演进方向**，当前正处于从概念验证向规模化落地过渡的关键节点，提前布局可构建显著的成本与体验优势。
