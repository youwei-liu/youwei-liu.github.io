---
title: BPE（Byte Pair Encoding）
categories:
  - 学习笔记
tags:
  - BPE
  - Tokenizer
  - 自然语言处理
  - 机器学习
  - 算法
description: 整理 BPE（Byte Pair Encoding）的基本原理和合并流程
cover: /img/avatar.jpg
toc_number: false
abbrlink: bpe
date: 2026-09-09 19:00:00
updated: 2026-09-09 19:00:00

---

<div class="article-toc-inline" data-toc-title="本文目录"></div>

# BPE（Byte Pair Encoding）

## 一、BPE算法分词（针对中文/英文）

### BPE原理

概念源于一种无损压缩算法。

**STEP1：**寻找出现频率最高的相邻两字符（BP，Byte Pair）

```plain
aaabdaaabac
aa|||||||||
aa||||||||
  ab|||||||
   bd||||||
  	da|||||
  	 aa||||
  	  aa|||
  	   ab||
  	    ba|
  	     ac
```

统计如下：

```plain
aa - 4
ab - 2
ac - 1
bd - 1
da - 1
```

<strong>STEP2：</strong>因此替换频率最高的 `aa` 为 `[aa]`：

```plain
[aa]abd[aa]abac
```

再次统计如下：

```plain
[aa]a   - 2
ab      - 2
bd      - 1
d[aa]   - 1
ba      - 1
ac      - 1
```

因此替换 `[aa]a` 为 `[aaa]`：

```plain
[aaa]bd[aaa]bac
```

重复。替换 `[aaa]b` 为 `[aaab]`：

> [aaab]d[aaab]ac

最终形式（各字节对出现频率相同，此时不必再替换）：

```plain
XdXac
```

其中 `X` 映射为 `aaab`﻿

{% note info %}

此时，只要一个压缩后的数据，加上一个字典，就能表示原数据。

字典：{"X":"aaab"}

{% endnote %}

### References:

【1】英文实现  https://blog.csdn.net/qq_41020633/article/details/123622667﻿

【2】中文实现 https://www.less-bug.com/posts/using-bpe-principle-for-chinese-word-segmentation-plate/﻿

【3】Byte Pair Encoding — The Dark Horse of Modern NLP  https://towardsdatascience.com/byte-pair-encoding-the-dark-horse-of-modern-nlp-eb36c7df4f10﻿

【4】https://yey.world/2020/03/11/COMP90042-WS-02/ 自然语言处理 Workshop 02：BPE 算法
