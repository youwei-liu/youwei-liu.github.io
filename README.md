# 浪里白条的个人博客

使用 [Hexo](https://hexo.io/) 与 [Butterfly](https://github.com/jerryc127/hexo-theme-butterfly) 构建，通过 GitHub Pages 发布。

## 本地运行

```bash
npm install
npm run server
```

访问 `http://localhost:4000`。

## 写文章

```bash
npm run new -- "文章标题"
```

文章会生成在 `source/_posts/`，使用 Markdown 编辑。完成后提交并推送到 `main`，GitHub Actions 会自动构建和发布。

## 常用位置

- 网站信息：`_config.yml`
- Butterfly 设置：`_config.butterfly.yml`
- 文章：`source/_posts/`
- 关于页面：`source/about/index.md`
- 图片：`source/img/`
