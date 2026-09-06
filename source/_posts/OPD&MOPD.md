---
title: OPD & MOPD 在线策略蒸馏
categories:
  - 学习笔记
tags:
  - OPD
  - MOPD
  - 知识蒸馏
  - 强化学习
  - 大语言模型
description: 整理 OPD / MOPD 在线策略蒸馏的基本原理、工程实现与 GRPO 的结合方式。
cover: /img/avatar.jpg
toc_number: false
abbrlink: '75447'
date: 2026-09-06 18:00:00
updated: 2026-09-06 18:00:00

---

<div class="article-toc-inline" data-toc-title="本文目录"></div>

# OPD

## 1. 基本原理

<strong>传统离线蒸馏（SFT）：</strong>

- <strong>核心做法：</strong>使用强 Teacher 模型针对输入生成答案样本，存入静态数据集，然后用交叉熵 Loss 训练 Student 模型。

- <strong>潜在风险：</strong>
- <strong>（1）分布偏移/暴露偏差：</strong>离线蒸馏要求 Student 去拟合 Teacher 产生的字符串轨迹，由于Stu和Teacher模型概率分布存在偏差，自回归推理过程，一旦输出了Teacher未预测的Token，陷入未训练过的“分布外状态（OOD）”，导致错误快速累积，即暴露偏差（Exposure Bias）。

- <strong>（2）数据多样性陷阱：</strong>离线蒸馏数据固定，为覆盖Stu推理可能遇到情况，需要大量且多样性足够的训练数据

<strong>在线策略蒸馏（On-Policy Distillation, OPD）：</strong>

- **核心做法：**<span class="text-highlight-red" style="color: #d93025; font-weight: 650;">让学生在自己生成的轨迹上接受教师的逐 Token 监督，来逼近 Teacher 的概率分布</span>
- <strong>OPD优势：</strong>能够解决分布偏移，即使在犯错的分布区域内，仍然能够纠正修复

<strong>主流三段式做法：</strong>

<strong>1. 采样（Rollout）</strong>：学生模型 $\pi_\theta$ 对给定 Prompt 自主生成完整 Rollout $y\sim\pi_\theta(\cdot\mid x)$。

<strong>2. 评分（Scoring）</strong>：教师模型 $\pi_T$ 对学生生成的每个 Token 计算 log 概率，作为逐 Token 的监督信号。

<strong>3. 更新（Update）</strong> ：基于教师信号计算损失，更新学生模型参数

## 2. 工程实现细节：

### 2.1 Teacher & Student 选型

- <strong>Teacher 选择</strong>：通常选择同系列或同词表（Tokenizer）的高性能强模型（例如使用 Llama-3-70B 蒸馏给 Llama-3-8B）。
- <strong>Student 选择</strong>：选择架构一致（或兼容）、参数量较小（如 1B~8B）的模型。
- <strong>词表对齐（Tokenizer Alignment）</strong>：
  - <strong>理想情况（同词表）</strong>：Teacher 和 Student 共享相同的词表，可以直接逐 Token 对齐概率分布（Logits）。
  - <strong>非理想情况（跨词表）：</strong>

### 2.2 训练数据构建

### 2.3 优化方式（损失函数）

| 维度     | Top-K 软标签蒸馏 ($K=50/100$)                                | Target-Only 轨迹蒸馏 ($K=1$)                                 |
| -------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| 训练本质 | 实现加强版 SFT，KL 拟合 Token 概率分布                       | 逐 Token 粒度的打分器/奖励模型（Token-level Reward Model），策略梯度优化 |
| 损失函数 | $\mathcal{L}_{\text{Top-K KL}} = - \sum_{t=1}^{T} \sum_{i \in \mathcal{K}_t} \tilde{P}_{\text{teacher}}(i \mid y_{<t}) \cdot \log P_{\text{student}}(i \mid y_{<t})$ | $\mathcal{L}_{K=1 \text{ (PG)}} = - \frac{1}{G} \sum_{i=1}^{G} \sum_{t=1}^{T} A_{i,t} \cdot \log P_{\text{student}}(y_{i,t} \mid y_{i,<t})$ |
| 特定要求 | 严格要求同构词表                                             | 无                                                           |
| 核心优势 | 能够保留 Teacher 认为潜在正确的多个分支（Dark Knowledge，黑暗知识），引导 Student 学习分布的“形态”。 | （1）天然支持异构词表，只要能计算 Student 生成文本在 Teacher 下的对数似然即可；<br />（2）显存与通信开销极小。 |
| 工程应用 | （1）同系列/同 Tokenizer 模型压缩：Top-K 无缝对齐；<br />（2）高推理精度/低幻觉类任务：在代码生成、数学推理等领域，Top-K 能够严格约束概率分布形态，让 Student 迅速学习到 Teacher 在关键推理节点上的分化概率，减少胡言乱语。 | （1）跨架构蒸馏：如 Qwen -> Llama，避开 Tokenizer 冲突；<br />（2）强化学习：考虑到强化学习训练节点通信问题，K=1 能够作为 RM 打分器配合 GRPO 等算法实现，吞吐量会非常大。 |
|          |                                                              |                                                              |

#### 2.3.1 Top-K 软标签蒸馏 (K=50/100)：加强版 SFT

<strong>核心做法：</strong>在前向传播时，对于每个生成的 Token 位置 $t$，Teacher 计算全词表（如 $128k$ 维）的 Logits，但<strong>只挑选 Teacher 自己概率最高的 Top-K 个 Token</strong>（如 $K=50$），将其 Logits 和对应的 Token IDs 传输给 Student。

<strong>损失函数：</strong>整条序列的 <strong>Top-K KL 散度损失</strong> 为每个 Token 位置上 KL 散度的累加（展开并忽略仅与 Teacher 相关的常量项后，本质为<strong>加权 Soft-Label 交叉熵</strong>）：
$$
\mathcal{L}_{\text{Top-K KL}} = - \sum_{t=1}^{T} \sum_{i \in \mathcal{K}_t} \tilde{P}_{\text{teacher}}(i \mid y_{<t}) \cdot \log P_{\text{student}}(i \mid y_{<t})
$$

#### 2.3.2 Target-Only 轨迹蒸馏 (K=1)：往往作为 RM 打分器

<strong>核心做法：</strong>由于轨迹是 Student 已经采样生成出来的字符串 $Y = [y_1, y_2, \dots, y_T]$，<strong>不计算、不传输任何全词表的 Top-K 分布，只保留轨迹上实际被采样的 1 个 Token（即 $K=1$）</strong>。

损失函数：策略梯度优化（简化版强化学习函数，无KL、无CLIp裁剪）

 ① 基础版 Policy Gradient Loss：

$$
\mathcal{L}_{K=1 \text{ (PG)}} = - \frac{1}{G} \sum_{i=1}^{G} \sum_{t=1}^{T} A_{i,t} \cdot \log P_{\text{student}}(y_{i,t} \mid y_{i,<t})
$$

② 工业级 PPO/GRPO Clip 保护 Loss：

为了防止单步更新幅度过大导致模型崩盘，引入重要性采样比率 $r_{i,t} = \frac{P_{\text{student\_new}}(y_{i,t} \mid y_{i,<t})}{P_{\text{student\_old}}(y_{i,t} \mid y_{i,<t})}$：

$$
\mathcal{L}_{K=1 \text{ (GRPO)}} = - \frac{1}{G} \sum_{i=1}^{G} \sum_{t=1}^{T} \min \left( r_{i,t} A_{i,t}, \, \operatorname{clip}(r_{i,t}, 1-\epsilon, 1+\epsilon) A_{i,t} \right)
$$



## 3. QA 环节

### <span class="text-highlight-blue" style="color: #274DEA; font-weight: 650;">Q1：不同系列，跨词表如何处理Token之间的概率对齐？</span>

### <span class="text-highlight-blue" style="color: #274DEA; font-weight: 650;">Q2：Student模型和Teacher的数据是否为同一份，Student如何做冷启动？</span>

### <span class="text-highlight-blue" style="color: #274DEA; font-weight: 650;">Q3：K=1的opd是K=50的特例情况吗？为什么两个名字不一样</span>

### <span class="text-highlight-blue" style="color: #274DEA; font-weight: 650;">Q5：为什么K=1的时候，不能使用KL或者交叉熵来作为损失函数？</span>

<strong>一句话总结：</strong>只针对单个 Token（即概率分布退化为只有一个点，且归一化为 1.0 时），<strong>KL 散度在数值和梯度上完全等价于交叉熵（Cross-Entropy）</strong>。

<strong><span class="text-highlight-purple" style="color: #831FFC; font-weight: 650;">1. 数学推导</span></strong>

根据信息论的标准定义，KL 散度（Kullback-Leibler Divergence）与交叉熵（Cross-Entropy, CE）和熵（Entropy, H）的关系是：

$$
\text{KL}(P \parallel Q) = \text{CE}(P, Q) - H(P)
$$

其中：

- $P$ 是目标分布（Teacher 归一化后的分布）。
- $Q$ 是预测分布（Student 的分布）。
- $H(P) = - \sum_x P(x) \log P(x)$ 是目标分布 $P$ 的自熵（Self-Entropy）。

<strong>若K=1，即只针对这 1 个 Token做优化：</strong>

<strong>（1）目标分布</strong>$P$：由于只保留了这 1 个 Token，归一化后 $P(y_t) = 1.0$，其他所有词的概率都是 $0$。

<strong>（2）计算</strong> $P$ <strong>的自熵</strong> $H(P)$：

$$
H(P) = - [1.0 \times \log(1.0) + 0 + 0 + \dots] = - [1.0 \times 0] = \mathbf{0}
$$

将 $H(P) = 0$ 代回原式：

$$
\text{KL}(P \parallel Q) = \text{CE}(P, Q) - 0 = \mathbf{\text{CE}(P, Q)}
$$

<strong><span class="text-highlight-purple" style="color: #831FFC; font-weight: 650;">2. Loss公式推导</span></strong>

展开两者的 Loss 表达式：

<strong>（1） 交叉熵 Loss (</strong>$\mathcal{L}_{\text{CE}}$<strong>)：</strong>
$$
\mathcal{L}_{\text{CE}} = - \sum_{v \in V} P_{\text{Teacher}}(v) \log P_{\text{Student}}(v) = - \mathbf{1.0 \cdot \log P_{\text{Student}}(y_t)}
$$

<strong>（2）KL 散度 Loss (</strong>$\mathcal{L}_{\text{KL}}$<strong>)：</strong>

$$
\mathcal{L}_{\text{KL}} = \sum_{v \in V} P_{\text{Teacher}}(v) \log \frac{P_{\text{Teacher}}(v)}{P_{\text{Student}}(v)} = \mathbf{1.0 \cdot \log \frac{1.0}{P_{\text{Student}}(y_t)}}=- \mathbf{1.0 \cdot \log P_{\text{Student}}(y_t)}
$$

总结：在单点（One-Hot 或者 $K=1$ 强行归一化）情况下，KL等价于交叉熵，必须使用<strong>策略梯度（RL）优化，否则会坍缩成标准的 SFT（强行拉高概率）</strong>

### <span class="text-highlight-blue" style="color: #274DEA; font-weight: 650;">Q6：K=1 时，如何结合 GRPO 使用？</span>

<strong>标准的 GRPO是在“句子/序列级别（Sequence-level）”给整条轨迹打一个标量 Reward，然后对整条轨迹更新；</strong>

<strong>而OPD (</strong>$K=1$<strong>) 这种逐 Token 的打分对于上述情况一般有两种实现手段：</strong>

<strong><span class="text-highlight-purple" style="color: #831FFC; font-weight: 650;">1. 累加/平均化（Token-Level $\rightarrow$ Sequence-Level Reward）</span></strong>

标准 GRPO 框架下最常用的做法——<strong>把整条轨迹上每一个 Token 的 Teacher 对数概率（Log-Prob）累加或求平均，压缩成一个整体标量分值</strong> $R$。

<strong>具体步骤：</strong>

<strong>（1）Student 生成轨迹</strong>：Student 针对 Prompt $x$ 采样生成了一条长为 $T$ 的文本轨迹 $Y = [y_1, y_2, \dots, y_T]$。

<strong>（2）Teacher 逐 Token 评估</strong>：Teacher 对这条轨迹计算每个位置的 Log-Prob：
$$
[\log P_{\text{teacher}}(y_1), \log P_{\text{teacher}}(y_2), \dots, \log P_{\text{teacher}}(y_T)]
$$

<strong>（3）聚合为整条数据的 Reward (</strong>$R$<strong>)</strong>：

通过求平均或加权累加，得到整条轨迹在 Teacher 眼里的“整体合理度得分”：

$$
R(x, Y) = \frac{1}{T} \sum_{t=1}^{T} \log P_{\text{teacher}}(y_t \mid x, y_{<t})
$$

<strong>（4）送入标准 GRPO 流程</strong>：

Student 针对同一个 Prompt 采出了 $G$ 条轨迹（比如 $Y_1, Y_2, \dots, Y_G$），得到了 $G$ 个整体得分 $[R_1, R_2, \dots, R_G]$。
然后按照 GRPO 的标准公式做组内归一化（Z-score Standardize），算出每条轨迹的 <strong>Group Advantage (</strong>$A_i$<strong>)</strong>，最后更新 Student。

<strong><span class="text-highlight-purple" style="color: #831FFC; font-weight: 650;">2. Token-Level Process Reward（逐 Token 的过程奖励）</span></strong>

若希望保留“<strong>某些 Token 给正反馈，某些 Token 给负反馈</strong>”的精细度（比如某个推导步骤写错了，只打压错的那个 Step/Token），则不能将得分合并成一个标量，工程上可以将GRPO扩展为<strong>Token-Level GRPO</strong>



<strong>具体步骤：</strong>

<strong>1. 组内采样：</strong>Student 对同一个 Prompt 采样生成 $G$ 条轨迹（比如 $G=8$）。

<strong>2. 构建<span class="text-highlight-red" style="color: #d93025; font-weight: 650;">逐 Token</span>的组内优势：</strong>假设这 8 条轨迹在第 $t$ 个 Token 位置，Teacher 分别算出了 8 个对数概率：$[\text{logp}_1^{(t)}, \text{logp}_2^{(t)}, \dots, \text{logp}_G^{(t)}]$

GRPO 会<strong>直接在当前 Token 位置</strong> $t$，对这 $G$ 个 Teacher 打分做 Z-Score 组内归一化：

$$
A_i^{(t)} = \frac{\text{logp}_i^{(t)} - \mu^{(t)}}{\sigma^{(t)}}
$$

- $\mu^{(t)}$：这 8 条轨迹在第 $t$ 个位置上 Teacher 打分的均值。
- $\sigma^{(t)}$：这 8 条轨迹在第 $t$ 个位置上 Teacher 打分的标准差。

<strong>3. 逐 Token 执行策略梯度更新</strong>

在计算 GRPO 的 Loss 时，直接用<strong>这个 Token 专属的</strong> $A_i^{(t)}$ 来加权：

$$
\mathcal{L}_{\text{GRPO\_Token}} = - \frac{1}{G} \sum_{i=1}^{G} \sum_{t=1}^{T} \min \left( r_{i,t} A_i^{(t)}, \, \text{clip}(r_{i,t}, 1-\epsilon, 1+\epsilon) A_i^{(t)} \right)
$$

<strong>(其中</strong> $r_{i,t} = \frac{P_{\text{student\_new}}(y_{i,t})}{P_{\text{student\_old}}(y_{i,t})}$ <strong>为重要性采样比率)</strong>

> <strong>效果</strong>：哪怕在同一条轨迹里，<strong>前 10 个 Token 也可以是正 Advantage（被鼓励），第 11 个 Token 可以是负 Advantage（被打压）</strong>。它实现了极精细的 Token-level 强化反馈！

<strong>总结：规则类/ Outcome-based 任务优先选序列级 GRPO；蒸馏类 / Process-based (K=1 OPD) 任务优先选 Token 级 GRPO。</strong> 

| 维度                            | 粒度一：逐 Token 优化 (Token-level)                          | 粒度二：序列级优化 (Sequence-level)                          |
| ------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| <strong>打分处理方式</strong>   | 在<strong>每一个 Token 位置</strong> $t$ 上，对 $G$ 个样本的 Teacher 概率做 Z-Score 归一化。 | 先把整条轨迹上所有 Token 的 Teacher 概率<strong>求平均/累加</strong>得到整条轨迹的总分 $R_i$，再对 $R_i$ 做 Z-Score 归一化。 |
| <strong>Advantage 形态</strong> | 1 维向量 $[A_i^{(1)}, A_i^{(2)}, \dots, A_i^{(T)}]$（作用于每个 Token） | 1 个标量 $A_i$（作用于整条轨迹）                             |
| <strong>控制精细度</strong>     | <strong>极高</strong>。能精确惩罚导致推理走偏的那<strong>某一个/某几个错词</strong>（Process-level Reward）。 | <strong>稍粗</strong>。整条轨迹“一荣俱荣，一损俱损”（Outcome-level Reward）。 |
| <strong>方差与稳定性</strong>   | 容易受单 Token 概率波动的干扰，需要较大 Group Size（如 $G \ge 8$）来平抑方差。 | 经过整条轨迹求平均后，得分方差小，训练非常稳定。             |
| <strong>适用场景</strong>       | <strong>长链条推理（CoT / Reasoning）、代码编写</strong>（单个逻辑节点的对错至关重要）。 | <strong>常规对话、摘要生成、格式化文本生成</strong>。        |



### <span class="text-highlight-blue" style="color: #274DEA; font-weight: 650;">Q7：K=50 时，损失函数推导公式（或软标签下 KL 散度与交叉熵损失的关系是什么？）</span>

**一句话总结：**<span class="text-highlight-red" style="color: #d93025; font-weight: 650;">深度学习的梯度下降优化中，最小化 KL 散度，数学上完全等价于最小化加权交叉熵（Cross-Entropy）</span>

<strong><span class="text-highlight-purple" style="color: #831FFC; font-weight: 650;">1. 前置工作</span></strong>

对于生成序列中的某一个 Token 位置 $t$：

- **Teacher 的截断重归一化分布** $P_T$：

在 Top-K 集合 $\mathcal{K}_t$ 内，Teacher 的概率为 $\tilde{P}_{\text{teacher}}(i)$；在集合外，概率为 $0$；满足 $\sum_{i \in \mathcal{K}_t} \tilde{P}_{\text{teacher}}(i) = 1$。

- **Student 的预测分布** $P_S$：Student 在全词表 $V$ 上的预测概率为 $P_{\text{student}}(i)$。

<strong><span class="text-highlight-purple" style="color: #831FFC; font-weight: 650;">2. 数学推导</span></strong>

（1）单个 Token 位置 $t$ 的标准 KL 散度公式

根据离散 KL 散度的定义，在位置 $t$：

$$
\text{KL}(P_T \parallel P_S)_t = \sum_{i \in V} P_T(i) \cdot \log \frac{P_T(i)}{P_S(i)}
$$

（2）将求和范围缩小到 Top-K 集合 $\mathcal{K}_t$

因为在 Top-K 集合之外，Teacher 的概率 $P_T(i) = 0$，根据 $0 \cdot \log(0) = 0$，集合外的项全部归零：

$$
\text{KL}(P_T \parallel P_S)_t = \sum_{i \in \mathcal{K}_t} \tilde{P}_{\text{teacher}}(i) \cdot \log \frac{\tilde{P}_{\text{teacher}}(i)}{P_{\text{student}}(i)}
$$

（3）公式拆分

将对数项展开为两项相减：

$$
\text{KL}(P_T \parallel P_S)_t = \sum_{i \in \mathcal{K}_t} \tilde{P}_{\text{teacher}}(i) \cdot \left( \log \tilde{P}_{\text{teacher}}(i) - \log P_{\text{student}}(i) \right)
$$

再将求和符号分配进去：

$$
\text{KL}(P_T \parallel P_S)_t = \underbrace{\sum_{i \in \mathcal{K}_t} \tilde{P}_{\text{teacher}}(i) \log \tilde{P}_{\text{teacher}}(i)}_{\text{第一项：Teacher 的负熵 } -H(P_T)} - \underbrace{\sum_{i \in \mathcal{K}_t} \tilde{P}_{\text{teacher}}(i) \log P_{\text{student}}(i)}_{\text{第二项：交叉熵 } \text{CE}(P_T, P_S)}
$$

<strong><span class="text-highlight-purple" style="color: #831FFC; font-weight: 650;">3. 公式化简</span></strong>

在训练 Student 模型时，通过计算 Loss 关于 **Student 参数** $\theta$ 的梯度（$\nabla_\theta \mathcal{L}$）来更新模型。

- **第一项**：只包含 Teacher 算出来的概率 $\tilde{P}_{\text{teacher}}$，**完全不包含 Student 的参数**$\theta$，反向传播求导过程中常为0。

$$
\sum_{i \in \mathcal{K}_t} \tilde{P}_{\text{teacher}}(i) \log \tilde{P}_{\text{teacher}}(i)
$$

- **第二项**：包含了 Student 的预测概率 $P_{\text{student}}(i)$，是梯度的唯一来源

$$
- \sum_{i \in \mathcal{K}_t} \tilde{P}_{\text{teacher}}(i) \log P_{\text{student}}(i)
$$

因此，单个 Token 位置的等效 Loss 就是：

$$
\mathcal{L}_t \equiv - \sum_{i \in \mathcal{K}_t} \tilde{P}_{\text{teacher}}(i \mid y_{<t}) \cdot \log P_{\text{student}}(i \mid y_{<t})
$$

将整条序列 $T$ 个位置的 Loss 累加起来，就得到了最终的公式：

$$
\mathcal{L}_{\text{Top-K KL}} = - \sum_{t=1}^{T} \sum_{i \in \mathcal{K}_t} \tilde{P}_{\text{teacher}}(i \mid y_{<t}) \cdot \log P_{\text{student}}(i \mid y_{<t})
$$

<strong>总结：</strong>深度学习的梯度下降优化中，最小化 KL 散度，数学上完全等价于最小化加权交叉熵

Teacher 给出的概率 $\tilde{P}_{\text{teacher}}(i)$ 充当了<strong>软标签权重（Soft Label Weights）</strong>：

> 如果某个 Token Teacher 认为概率很大（比如 0.8），Student 预测它的 $-\log P_{\text{student}}$ 就会乘上 0.8 的大权重；
>
> 如果某个 Token Teacher 认为概率很小（比如 0.01），就会只乘上 0.01 的小权重。
