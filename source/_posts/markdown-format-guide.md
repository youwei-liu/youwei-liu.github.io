---
title: 博客 Markdown 常用格式参考
categories:
  - 建站记录
tags:
  - Markdown
  - Hexo
  - 写作指南
description: 当前博客支持的提示块、文字颜色、公式、表格、代码和目录写法示例。
cover: /img/avatar.jpg
toc_number: false
abbrlink: markdown-format-guide
date: 2026-09-07 19:00:00
updated: 2026-09-07 19:00:00

---

<div class="article-toc-inline" data-toc-title="本文目录"></div>

# 博客 Markdown 常用格式参考

这篇文章用于记录本站常用的 Markdown 写法。编辑时可以直接复制代码块中的内容，再替换成自己的文字。

## 一、背景高亮

本站使用 Butterfly 的 `note` 标签。除了浅蓝色的 `info`，还支持以下五种颜色：

{% note default %}
default：灰色，适合普通补充说明。
{% endnote %}

{% note primary %}
primary：紫色，适合强调一个概念。
{% endnote %}

{% note info %}
info：浅蓝色，适合一般提示信息。
{% endnote %}

{% note success %}
success：绿色，适合表示完成、正确或推荐。
{% endnote %}

{% note warning %}
warning：黄色，适合表示注意事项或潜在风险。
{% endnote %}

{% note danger %}
danger：红色，适合表示错误、警告或重要限制。
{% endnote %}

对应的 Markdown 写法：

```markdown
{% note warning %}
这里是需要注意的内容。
{% endnote %}
```

## 二、字体颜色与强调

可以用 HTML 的 `span` 设置颜色、粗细和背景色。本站常用蓝色 `#274DEA`、红色 `#d93025` 和紫色 `#831FFC`：

<span style="color: #274DEA; font-weight: 650;">蓝色重点说明</span>　
<span style="color: #d93025; font-weight: 650;">红色重点说明</span>　
<span style="color: #831FFC; font-weight: 650;">紫色重点说明</span>

```html
<span style="color: #274DEA; font-weight: 650;">蓝色重点说明</span>
<span style="color: #d93025; font-weight: 650;">红色重点说明</span>
```

需要背景高亮时，可以增加 `background-color`：

<span style="background-color: #fff3a3; padding: 2px 5px; border-radius: 3px;">黄色背景高亮</span>

```html
<span style="background-color: #fff3a3; padding: 2px 5px; border-radius: 3px;">黄色背景高亮</span>
```

粗体、斜体和删除线可以使用标准 Markdown。不要把 HTML 标签和未配对的 `*` 混在一起：

```markdown
**粗体**
*斜体*
~~删除线~~
<strong>更醒目的粗体</strong>
```

## 三、数学公式

行内公式使用一对 `$`，适合放在句子中，例如 $P(A>B)=\frac{1}{1+10^{(R_B-R_A)/400}}$。

独占一行的公式使用一对 `$$`，会自动居中：

$$
L(\theta)=-\sum_x P(x)\log Q(x)
$$

```markdown
行内公式：$a^2+b^2=c^2$

$$
L(\theta)=-\sum_x P(x)\log Q(x)
$$
```

公式中的反斜杠需要保留；复杂公式建议使用块级写法，避免在窄屏上挤压正文。

## 四、表格

```markdown
| 方法 | 优点 | 注意事项 |
| --- | --- | --- |
| 方法 A | 速度快 | 需要更多数据 |
| 方法 B | 结果稳定 | 计算成本较高 |
```

渲染效果：

| 方法   | 优点     | 注意事项     |
| ------ | -------- | ------------ |
| 方法 A | 速度快   | 需要更多数据 |
| 方法 B | 结果稳定 | 计算成本较高 |

## 五、代码、引用与列表

代码块在开头标明语言即可获得语法高亮：

```python
def mean(values):
    return sum(values) / len(values)
```

引用和列表写法如下：

```markdown
> 这是引用内容。

1. 第一步
2. 第二步

- 无序项目
- 另一个项目
```

## 六、目录与标题编号

文章开头加入下面这行，会在正文前生成一份目录：

```html
<div class="article-toc-inline" data-toc-title="本文目录"></div>
```

标题本身只写层级，不要手动添加 `1.`、`1.1` 等序号。主题会根据 `##`、`###` 自动生成目录层级和编号；如果手动编号，页面上就可能出现连续的“1. 1.”。

```markdown
## 数学推导
### Loss 公式推导
```

文章 front matter 中设置 `toc_number: false` 可以关闭目录编号；保留为 `true` 则会显示自动编号。

## 七、常见问题

- Typora 是否显示提示块，取决于它是否支持 Butterfly 的 Liquid 标签；博客上的效果以 Hexo 构建结果为准。
- HTML 颜色通常能在博客中生效，但部分 Markdown 编辑器不会预览自定义 CSS。
- 公式无法渲染时，先检查 `$` 是否成对，并确认块级公式的 `$$` 各自独占一行。
