---
title: 测试
categories:
  - 学习笔记
tags:
  - 测试
description: 介绍 ELO 等级分与 Bradley-Terry 模型的核心公式、参数含义、最大似然求解及其在奖励模型中的应用。
cover: /img/avatar.jpg
abbrlink: dc941e43
date: 2026-09-05 18:00:00
updated: 2026-09-05 18:00:00
toc_number: false
---

<div class="article-toc-inline" data-toc-title="本文目录"></div>

# ELO **等级分**

## 1. ELO基本原理

Elo 最初由物理学家 Arpad Elo 为国际象棋设计，本质上是 BT 模型的一个 **增量更新（Online/Dynamic）工程实现**。

在 Elo 等级分系统中，A 战胜 B 的期望胜率 $P(A>B)$ 是基于 **双方积分之差**（$R_B - R_A$），通过 **Logistic 函数（逻辑斯蒂函数）** 计算出来的，**计算公式如下：**
asd
