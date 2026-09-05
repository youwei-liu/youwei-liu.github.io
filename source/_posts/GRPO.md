---
title: GRPO（Group Relative Policy Optimization）学习笔记
categories:
  - 学习笔记
tags:
  - GRPO
  - 强化学习
  - PPO
  - 大语言模型
  - 奖励模型
description: 整理 GRPO 的基本原理、训练流程、奖励模型、重要性采样与 PPO 的关系。
cover: /img/avatar.jpg
toc_number: false
abbrlink: 6e8a86af
date: 2026-09-03 18:00:00
updated: 2026-09-03 18:00:00
---

<div class="article-toc-inline" data-toc-title="本文目录"></div>

# GRPO

## 1. 基本原理





## 2. 工程实现流程

### 第1步：组内采样（生成G个回答）

对于同一个输入问题 $q$，我们用当前模型的旧策略 $\pi_{\theta_{\mathrm{old}}}$ 独立生成 $G$ 个不同的回答序列，记为 $\{o_1,o_2,\ldots,o_G\}$。

随后，奖励模型（RM）给这 $G$ 个回答分别打分，得到一组奖励值：
$$
\{r_1,r_2,\ldots,r_G\}。
$$

### 第2步：计算相对优势（GRPO的核心创新，去掉Critic网络）

在 PPO 中，优势 $A$ 需要通过一个独立的 Critic 网络估算基线（Baseline）。而在 GRPO 中，**优势完全由组内奖励的相对比较得出**，公式为：
$$
A_i=\frac{r_i-\operatorname{mean}(\mathbf{r})}{\operatorname{std}(\mathbf{r})},
\qquad i\in\{1,2,\ldots,G\}.
$$

展开来写就是：


$$
A_i=\frac{r_i-\mu_r}{\sigma_r}.
$$

- $\mu_r = \frac{1}{G} \sum_{i=1}^G r_i$（组内奖励的均值）
- $\sigma_r = \sqrt{\frac{1}{G} \sum_{i=1}^G (r_i - \mu_r)^2}$（组内奖励的标准差）

**解读**：这个公式相当于把组内成员的得分转化为“标准分”。高于平均水平的回答获得正优势（被强化），低于平均水平的获得负优势（被抑制）。

### 第3步：计算重要性采样比率（连接新旧策略）

这正是我们上一轮聊到的**重要性采样**在GRPO中的体现。对于组内第$i$个回答，定义新旧策略的生成概率比值为：

$$
\rho_i(\theta)=\frac{\pi_\theta(o_i\mid q)}
{\pi_{\theta_{\mathrm{old}}}(o_i\mid q)}.
$$

- $\pi_{\theta}$：当前正在更新的**新策略**（参数为$\theta$）
- $\pi_{\theta_{\mathrm{old}}}$：生成这批数据时的**旧策略**（参数固定）

### 第4步：GRPO 的完整目标函数（Loss）

将以上所有要素代入，GRPO的优化目标（最大化）写为：

$$
\mathcal{J}_{\mathrm{GRPO}}(\theta)
=\mathbb{E}_{q\sim P(Q),\,\{o_i\}_{i=1}^{G}\sim\pi_{\theta_{\mathrm{old}}}(\cdot\mid q)}\left[\frac{1}{G}\sum_{i=1}^{G}\min\left(\rho_i(\theta)A_i,\operatorname{clip}\left(\rho_i(\theta),1-\epsilon,1+\epsilon\right)A_i\right)-\beta D_{\mathrm{KL}}\left(\pi_\theta\parallel\pi_{\mathrm{ref}}\right)\right].
$$

为了更直观，我们把中间那个复杂的期望部分单独拎出来，它通常被称为 **Surrogate Objective（代理目标）**：
$$
\mathcal{L}_{\mathrm{GRPO}}^{\mathrm{CLIP}}(\theta)
=\frac{1}{G}\sum_{i=1}^{G}\min\Big(
\rho_i(\theta)A_i,
\operatorname{clip}\big(\rho_i(\theta),1-\epsilon,1+\epsilon\big)A_i
\Big).
$$





---



## 3. QA 环节

### Q1：πθ 是什么意思？是模型在当前状态下的概率分布吗？

一句话总结：$\pi_{\theta}$不是某个固定的分布，而是**由模型参数** $\theta$ **决定的、随上下文实时变化的动态条件概率分布**。

$\pi_{\theta}$是“条件概率分布”，在强化学习（RL）中，符号$\pi$代表**策略（Policy）**。在大语言模型（LLM）的语境下，它特指**模型在给定输入（Prompt）下，生成下一个 Token 的概率分布**。

具体数学表达式为：$\pi(a_t \mid s_t) \quad \text{或更具体地} \quad \pi_{\theta}(o_t \mid q, o_{<t})$

- $q$：用户输入的提示词（状态 $s$）。
- $o_{<t}$：当前已经生成的前缀 Token。
- $o_t$：模型在词表上即将采样的下一个 Token（动作 $a$）。
- $\theta$：模型的权重参数。

### Q2：在Rollout阶段，用于生成G个响应的prompt数量是如何确定的？是从数据集中随机选择的吗？依据是什么？

**一句话总结：从大规模数据集中随机采样（或按比例采样）的，但依据非常明确。**

- **数据来源**：通常是一个混合了多种任务的大规模指令数据集（如数学题、代码、通用问答）。
- **采样依据（策略）**：

1. **任务均衡（Domain Balancing）**：不会全随机，通常会按**任务类型**分层采样。比如，保证一个 Batch 里数学题占 30%，代码占 30%，通用对话占 40%，防止模型在某个领域过拟合。
2. **难度筛选（基于 RM 分数）**：有些实现会动态调整采样权重，多采样那些 RM 打分**方差大**（模型拿不准）的 Prompt，因为这类样本对模型提升最大（类似主动学习）。

- **数量（Batch Size for Rollout）**：这个数量称为 **Rollout Batch Size**。它取决于**算力**和**训练效率**的权衡。通常设为 **512 或 1024** 条。如果太小，组内比较（GRPO）的统计量（均值和方差）噪声太大；如果太大，生成这部分数据的时间会拖慢整体训练速度。

### Q3：参数每隔多少步更新一次？更新后是否会产生新的概率分布，即新的 πθ？

**（一）关于更新频率（不是按“时间步”，而是按“批次”）**

GRPO（以及PPO）采用**“批量生成 + 多次更新”**的模式，**不是**每生成一个 Token 就更新，也不是每生成一个回答就立刻更新。

- **生成阶段（Rollout）**：先用旧策略 $\pi_{\theta_{old}}$ 一次性生成一大批数据（比如，几百个 Prompt，每个生成 G 个回答）。这批数据被存入缓冲区（Buffer）。
- **更新阶段（Update）**：Buffer里的数据被打乱，切成多个**Mini-batch**。
  - **全局BS**（Global Batch Size）**：**设GBS= 512，但由于显存限制，单卡实际前向传播的**Micro Batch Size**可能只有 4 或 8。
  - **序列并行：**如果用了**序列并行（Sequence Parallelism）**，长序列会被切分到不同设备，但这不影响Step的计算逻辑，只影响单次Micro Batch的显存占用。
  - **梯度累积（Gradient Accumulation）**：累加多个Micro Batch的梯度（比如累加 64 次），凑够 Global Batch 的梯度后，优化器（Adam）**才执行一次参数更新（Step）**。

**（二）关于新** $\pi$

**一句话总结：当模型参数** $\theta$ **被优化器更新了一小步，**$\pi_{\theta}$**立刻就成为新的概率分布**。

注意：**在遍历同一批缓冲区的过程中，虽然**$\pi_{\theta}$**在每步更新后都在变，但我们计算“重要性采样比率**$\rho$**时，分母始终锁定为最开始的** $\pi_{\theta_{old}}$ **，分子始终用最新的**$\pi_{\theta}$**。** 所以需要重要性采样来修正分布偏差

### Q4：其中是否涉及 RM（奖励模型）？ DPO没有 RM，GRPO 是否重新引入了 RM？RM 需要预先训练吗？

<strong>一句话总结：</strong>GRPO/PPO 均涉及 RM，需要预先训练，且在强化学习阶段冻结参数使用。

| 流派                                 | 是否依赖 RM（奖励模型） | 训练方式                                                     |
| ------------------------------------ | ----------------------- | ------------------------------------------------------------ |
| **DPO（直接偏好优化）**        | **不需要**        | 通过数学推导，将奖励模型的拟合过程直接转化为对策略模型$\pi$的**分类损失（交叉熵）**，绕开了显式的 RM。 |
| **GRPO / PPO（基于强化学习）** | **需要！**        | **显式地**依赖一个外部 RM 来给生成的文本打分，提供奖励信号$r_i$。 |

**关于 RM 是否要提前训练：必须提前训练，且在 GRPO 训练期间冻结（Freeze）！**

- **训练数据**：使用大量人类偏好对比数据（如“好回答 vs 坏回答”）。
- **训练方式**：通常采用 **Bradley-Terry 模型**，让 RM 学会给“好回答”打高分，给“坏回答”打低分。
- **GRPO 中的角色**：RM 只负责给组内$G$个回答输出原始的标量奖励值 $\{r_1, ..., r_G\}$，作为计算$A_i$的原材料。RM 的参数在 GRPO 阶段**不再更新**。

**特别注意**：GRPO 去掉的是 PPO 中的 **Critic（价值网络）**，但**保留了 RM（奖励模型）**。Critic 和 RM 是两个完全不同的东西，千万别混淆。



### Q5：RM（奖励模型）是如何预先训练的？它的输出只是一个分数吗？人工label是什么样子的？如果以pair出现，且只有good/bad标签，为什么模型能够输出分数？是否涉及配比问题

参考：https://youwei-liu.github.io/posts/dc941e42/

<strong>RM模型：</strong>RM 本质上是一个回归（或排序）模型，通常由 SFT 模型（或更大底座）初始化，去掉最后的 LM Head，接上一个线性层（输出维度为1）。

<strong>人工 label：</strong>人工标注的原始数据格式是以 Pair（对比对）呈现的，仅包含排序结果，不包含分数。

- 标准格式：给定同一个问题（Prompt），标注员会看到 两个（甚至多个）匿名模型生成的回答，且带有序关系（Order），例如回复A>回复B

**损失函数（经典 Bradley-Terry 排序损失）**：
$$
\mathcal{L}_{RM} = -\log \left(\sigma\left(r_{\theta}(x, y_{chosen}) - r_{\theta}(x, y_{rejected})\right)\right)
$$
其中 $\sigma$是 Sigmoid 函数。训练时，**RM 不输出概率，只输出分数**，通过反向传播拉大“好回答”和“坏回答”之间的分数差距（Margin）。训练完成后，RM 冻住，只充当 GRPO 中的静态标尺。

输出连续分数：

- **Step 1：RM 输出原始分数（Logits）**
  RM 的最后一层是**不带激活函数（没有Sigmoid/Softmax）的线性层**，输出维度是 1。这意味着 RM 可以输出任意实数，比如 `r_chosen = 2.3`，`r_rejected = 0.7`。这个分数本身就是连续的。
- **Step 2：计算差值（相对距离）**
  公式计算两者的差：$\Delta = r_{chosen} - r_{rejected}$。假设 $\Delta = 2.3 - 0.7 = 1.6$。
- **Step 3：通过 Sigmoid 转为“被选中的概率”**
  $\sigma(\Delta)$ 将差值压缩到 0~1 之间。如果差值 $\Delta$ 很大（比如 5.0），Sigmoid 的结果就接近 1（代表模型有 99% 的把握认为 Chosen 绝对优于 Rejected）；如果差值接近 0，Sigmoid 结果接近 0.5（代表模型觉得这俩差不多）。
- **Step 4：反向传播的“压榨”机制（回答你的核心疑问）**
  损失函数是 $-\log(\text{这个概率})$。为了让损失变小，模型**必须绞尽脑汁地把 $\Delta$ 拉得越来越大**。

### Q6：裁剪（Clip）的目的是什么？

<strong>CLIP 裁剪核心思想：</strong>使用 $\min$ 操作和 $\operatorname{clip}$ 操作，永远选择<span class="text-highlight-red" style="color: #d93025; font-weight: 650;">数值更小（更悲观）的项</span>作为最后的优化目标。其根本目的是防止策略在单次更新中迈的步子过大。

**核心目标函数的形式：**
$$
L^{CLIP}(\theta)=\hat{\mathbb{E}}_t\left[\min\left(\rho_t(\theta)A_t,\operatorname{clip}\left(\rho_t(\theta),1-\epsilon,1+\epsilon\right)A_t\right)\right]
$$

<strong>优势函数</strong> $A_t$ 的<span class="text-highlight-red" style="color: #d93025; font-weight: 650;">符号决定了裁剪上下界是否生效</span>：
$$
L^{CLIP}=\min\Big(\underbrace{\rho_t\cdot A_t}_{\text{原始项}},\underbrace{\operatorname{clip}(\rho_t,1-\epsilon,1+\epsilon)\cdot A_t}_{\text{裁剪项}}\Big)
$$

- 注意：截断是该区间梯度被截断为0（$\frac{\partial L}{\partial \theta} = 0$），不更新参数

**当** $A_t > 0$ **（奖励为正，鼓励该动作）：** 最终取值由<span class="text-highlight-red" style="color: #d93025; font-weight: 650;">非裁剪项</span>和 <span class="text-highlight-red" style="color: #d93025; font-weight: 650;">Clip上界</span>$(1+\epsilon) A_t$ 决定。

- （1）如果$\rho_t > 1+\epsilon$：选择裁剪项，**限制好动作的概率过度飙升**（封顶收益，更新幅度变小）。
  - 示例：$\rho_t > 1+\epsilon$，设 $\rho=1.3$：
    $$
    \begin{aligned}
    L &= \min\left(\rho_t A_t,\operatorname{clip}(\rho_t,0.8,1.2)A_t\right)\\
      &= \min(1.3A_t,1.2A_t)\\
      &= 1.2A_t
    \end{aligned}
    $$
    取裁剪项 $(1+\epsilon)A_t$。

- （2）如果$\rho_t < 1-\epsilon$，选择未裁剪项$\rho_t A_t$，**如实反映概率下降带来的损失**（不限制更新）。
  - 示例：$\rho_t < 1-\epsilon$，设 $\rho=0.7$：
    $$
    \begin{aligned}
    L &= \min\left(\rho_t A_t,\operatorname{clip}(\rho_t,0.8,1.2)A_t\right)\\
      &= \min(0.7A_t,0.8A_t)\\
      &= 0.7A_t
    \end{aligned}
    $$
    取非裁剪项 $\rho_t A_t$。

**当** $A_t < 0$ **（奖励为负，惩罚该动作）：** 最终取值由<span class="text-highlight-red" style="color: #d93025; font-weight: 650;">非裁剪项</span>和<span class="text-highlight-red" style="color: #d93025; font-weight: 650;">Clip下界</span> $(1-\epsilon) A_t$ 决定。

- （1）如果$\rho_t > 1+\epsilon$（坏动作概率反而变大）：选择未裁剪项，**保留最大强度的惩罚**（更新幅度很大，狠狠修正错误）。
  - 示例：$\rho_t > 1+\epsilon$，设 $\rho=1.3$：
    $$
    \begin{aligned}
    L &= \min\left(\rho_t A_t,\operatorname{clip}(\rho_t,0.8,1.2)A_t\right)\\
      &= \min(1.3A_t,1.2A_t)\\
      &= 1.3A_t
    \end{aligned}
    $$
    取非裁剪项 $\rho_t A_t$。

- （2）如果$\rho_t < 1-\epsilon$（坏动作概率在降低/纠错）：选择裁剪项$(1-\epsilon) A_t$，**限制纠错带来的收益上限**（梯度归零，防止因过度纠错导致策略不稳定）。
  - 示例：$\rho_t < 1-\epsilon$，设 $\rho=0.7$：
    $$
    \begin{aligned}
    L &= \min\left(\rho_t A_t,\operatorname{clip}(\rho_t,0.8,1.2)A_t\right)\\
      &= \min(0.7A_t,0.8A_t)\\
      &= 0.8A_t
    \end{aligned}
    $$
    取裁剪项 $(1-\epsilon)A_t$。

**总结：**

1. **对“越界飙升”的狠狠惩罚：** 无论是好动作还是坏动作，只要概率偏离旧策略太多（$\rho > 1+\epsilon$），算法都会通过机制进行**强力抑制**（A>0）**或严厉惩罚（A<0）**，绝对不许它盲目飙升。
2. **对“概率降低”的保护：** 当概率在往低走（$\rho < 1-\epsilon$）时，算法在**保护策略的稳定性**，避免因为一次更新降得太狠而导致模型“休克”或崩塌。



### Q7：调整 Clip 上下界，模型更新会发生什么变化？

| 场景 | 生效的边界 | 调大的效果 | 调小的效果 |
| --- | --- | --- | --- |
| $A < 0$（坏动作） | 只由下界决定 | 下界调大 $\to$ 纠错变保守，更新幅度变小 | 下界调小 $\to$ 允许大幅降低，更新幅度变大 |
| $A > 0$（好动作） | 只由上界决定 | 上界调大 $\to$ 允许大幅上涨，更新幅度变大 | 上界调小 $\to$ 涨幅被锁定，更新幅度变小 |



### Q8：Clip 与损失函数的关系？

$L^{CLIP}$ 是强化学习（PPO / GRPO）里的**策略目标函数（Objective Function）**，用来给出策略好坏的综合评分。

**$L^{CLIP}$ 的含义：**

- **动作好坏（$A_t$）：** 如果策略选的动作效果好，优势函数 $A_t > 0$（得分高）；如果选的动作效果差，$A_t < 0$（得分低）。
- **概率变化（$\rho_t$）：** $\rho_t$ 代表新策略相对于旧策略，选择该动作的概率放大了多少倍。
- **综合得分（$\rho_t A_t$）：** 如果一个动作很好（$A_t > 0$），且新策略大幅增加了选它的概率（$\rho_t > 1$），得分就会很高。
- **$L^{CLIP}$ 的最终含义：** 它代表了在“防止新策略跟旧策略偏离太远”的前提下，新策略能获得的**安全收益总分**。

**$L^{CLIP}$ 与损失函数的关系：**

$$
\begin{aligned}
\mathrm{Loss}^{\mathrm{policy}}(\theta)
&=-L^{CLIP}(\theta)\\
&=-\hat{\mathbb{E}}_t\left[\min\left(\rho_t(\theta)A_t,
\operatorname{clip}\left(\rho_t(\theta),1-\epsilon,1+\epsilon\right)A_t\right)\right]\\
&=\hat{\mathbb{E}}_t\left[\max\left(-\rho_t(\theta)A_t,
-\operatorname{clip}\left(\rho_t(\theta),1-\epsilon,1+\epsilon\right)A_t\right)\right]
\end{aligned}
$$

在GRPO中会额外设计一个KL散度项：待补充

- **裁剪与KL**：**裁剪**是硬性的“物理限幅”，防止单次更新走极端；**KL惩罚**是软性的“化学约束”，防止模型整体偏离人类语言常识。
