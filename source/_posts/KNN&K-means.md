---
title: KNN 与 K-means
categories:
  - 学习笔记
tags:
  - KNN
  - K-means
  - 机器学习
  - 算法
description: 整理 KNN 与 K-means 的基本原理、特征表示、距离度量和训练流程。
cover: /img/avatar.jpg
toc_number: false
abbrlink: knn-kmeans
date: 2026-09-09 18:00:00
updated: 2026-09-09 18:00:00

---

<div class="article-toc-inline" data-toc-title="本文目录"></div>

# KNN（K-Nearest Neighbors，K-近邻算法）

{% note info %}

<strong>一句话总结：</strong>新数据来了，看离它最近的 K 个已知邻居谁占多数（或取均值），就把它划归为哪一类。

{% endnote %}

## 1. 基本原理

基本原理：在 KNN 算法中，每一条数据（无论是已知标签的数据，还是新来的数据）都被表示为一个<strong>特征向量</strong>。得到特征向量之后，衡量新旧数据相似度，本质上就是计算两个向量在多维空间中的几何距离。

## 2. 特征向量表示

<strong>（1）密集嵌入向量（Embedding）：</strong>使用 LLM Embedding 层来实现映射（如 1×512 维度向量），单个维度无意义，但能够通过余弦相似度量化<span style="color: #d93025; font-weight: 650;">语义相似性</span>和<span style="color: #d93025; font-weight: 650;">模式相似性</span>：

<strong>（2）标量分值表示：</strong>有明确维度含义，包含一维和多维形式，以列向量或矩阵来表示，但是计算相似度需要量纲统一，做<span style="color: #d93025; font-weight: 650;">归一化或标准化</span>：

> 如果选取 `[面积(㎡), 房间数(个), 房龄(年), 距离地铁(km)]` 4 个特征：
>
> - 一套 85㎡、2 房、5 年房龄、距地铁 0.3km 的房子，其特征向量表示为：
>
>   $$
>   \mathbf{x} = [85, 2, 5, 0.3]
>   $$
>
> 如果有 **m** 个样本，每个样本有 **n** 个特征，整个数据集就会排成一个 **m** × **n** 的<strong>特征矩阵（Design Matrix）</strong>：
>
> $$
>   \mathbf{X} = \begin{bmatrix} 85 & 2 & 5 & 0.3 \\ 120 & 3 & 2 & 1.1 \\ 45 & 1 & 12 & 0.1 \end{bmatrix}
> $$

## 3. 距离度量方法

### 3.1 欧氏距离（Euclidean Distance）

即两点之间的直线距离（勾股定理的推广），是 KNN 和 K-means 的默认选择。

$$
d(\mathbf{x}, \mathbf{y}) = \sqrt{\sum_{i=1}^{n} (x_i - y_i)^2}
$$

### 3.2 曼哈顿距离（Manhattan Distance）

即沿着坐标轴走直线的“城市街区距离”，对极端异常值比欧氏距离更鲁棒。

$$
d(\mathbf{x}, \mathbf{y}) = \sum_{i=1}^{n} \vert x_i - y_i \vert
$$

### 3.3 余弦相似度（Cosine Similarity）

严格来说衡量的是<strong>向量夹角</strong>而非绝对空间距离，关注的是“方向”是否一致而非“大小”。<strong>常用于文本分析、推荐系统和高维稀疏数据</strong>。

$$
\text{Sim}(\mathbf{x}, \mathbf{y}) = \cos(\theta) = \frac{\mathbf{x} \cdot \mathbf{y}}{\Vert \mathbf{x} \Vert \; \Vert \mathbf{y} \Vert} = \frac{\sum_{i=1}^{n} x_i y_i}{\sqrt{\sum_{i=1}^{n} x_i^2} \sqrt{\sum_{i=1}^{n} y_i^2}}
$$

# K-means（K-均值聚类算法）

{% note info %}

<strong>一句话总结：</strong>在无标签数据中随机指定 K 个中心点，通过“按最近距离划分归属”与“按均值更新中心点”的循环迭代，自动将数据聚集为 K 个簇。

{% endnote %}

## 1. K-means 训练过程

<strong>步骤 1：初始化中心点：</strong>设定起点。

在数据空间中<strong>随机选择</strong> $K$ <strong>个数据点</strong>（或使用 K-means++ 算法选择 $K$ 个尽量离得远的点）作为初始的聚类中心 $\mu_1, \mu_2, \dots, \mu_K$。

<strong>步骤 2：分配样本到最近的簇：</strong>归属分配。

计算<strong>每一个数据点</strong>到这 $K$ 个中心点的距离（通常使用欧氏距离）。数据点被划分到<strong>距离最近</strong>的那个中心点所在的簇中：

$$
C_k = \{ x_i : \arg\min_j \Vert x_i - \mu_j \Vert^2 = k \}
$$

<strong>步骤 3：更新聚类中心：</strong>重心移动。

针对每一个簇 $C_k$，重新计算该簇内<strong>所有样本点的均值（平均坐标）</strong>，并将该簇的中心点移动至新的均值位置：

$$
\mu_k = \frac{1}{\vert C_k \vert} \sum_{x_i \in C_k} x_i
$$

<strong>步骤 4：判断收敛与停止：</strong>终止校验。

检查聚类中心的位置是否不再发生改变（或变化量小于设定阈值）：

- <strong>未收敛</strong>：重复执行<strong>步骤 2</strong>和<strong>步骤 3</strong>。
- <strong>已收敛</strong>：输出最终的 $K$ 个簇划分与中心点坐标，训练结束。

```text
算法：K-means 训练过程

输入：数据集 X，簇数量 K
输出：K 个聚类中心 mu

1. 【初始化】：随机选取 K 个样本点作为初始中心 mu_1, mu_2, ..., mu_K
2. 【循环迭代】：
   REPEAT:
       a. 分配（E 步）：对每一个样本 x_i，将其归类到距离最近的中心点 mu_k
          c_i = argmin_k ||x_i - mu_k||^2
       b. 更新（M 步）：对每一个簇 k，计算簇内所有样本的均值，作为新的中心点
          mu_k = mean({x_i | c_i == k})
   UNTIL 所有中心点 mu 不再发生变化（或达到最大迭代次数）
3. 返回聚类中心 mu
```

## 2. KNN 与 K-means 对比

| 维度                 | KNN（K-近邻）                                                | K-means（K-均值）                                            |
| -------------------- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| 算法类型             | **监督学习**（Supervised Learning）                          | **非监督学习**（Unsupervised Learning）                      |
| 数据要求             | 需要有标签（Label）的训练数据                                | 只需要无标签的输入特征                                       |
| 核心任务             | 主要用于**分类**和**回归**                                   | 主要用于**聚类**（数据分组/分群）                            |
| 参数 $K$ 的含义      | 预测时参考的**离目标最近的** $K$ **个邻居**                  | 预先指定的**聚类簇数（Cluster count）**                      |
| 模型训练（学习过程） | **惰性学习（Lazy Learning）**：没有显式的训练阶段，直接存储样本，预测时才计算距离 | **急切学习（Eager Learning）**：通过迭代寻找 $K$ 个聚类中心，训练完成后保存中心点 |
| 预测计算复杂度       | **很高**：对每个新样本预测时，都需要计算其与全量训练样本的距离 | **较低**：训练好后，只需计算新样本与 $K$ 个聚类中心的距离    |

## QA 环节

### Q1：归一化和标准化如何实现？

<strong>归一化原理：</strong>将数值线性映射到指定区间（默认是 $[0, 1]$）。

<strong>特点：</strong>有严格上下界（0 和 1），易受到极值影响。

$$
x' = \frac{x - x_{\min}}{x_{\max} - x_{\min}}
$$

<strong>标准化原理：</strong>将数据转换为均值为 $0$、标准差为 $1$ 的标准正态分布。

<strong>特点：</strong>无固定上下界，绝大多数分布在 [-3, 3]，对异常值友好。

$$
x' = \frac{x - \mu}{\sigma}
$$

- $\mu$ 为样本均值：$\mu = \frac{1}{N}\sum x_i$
- $\sigma$ 为样本标准差：$\sigma = \sqrt{\frac{1}{N}\sum (x_i - \mu)^2}$
