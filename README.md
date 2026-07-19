# 浪里白条的个人网站

一个无需构建工具的静态个人主页，可直接部署到 GitHub Pages。

## 本地预览

```bash
python3 -m http.server 8000
```

打开 `http://localhost:8000`。

## 发布

1. 在 GitHub 创建仓库。若希望地址为 `https://youwei-liu.github.io`，仓库名必须是 `youwei-liu.github.io`。
2. 将本目录作为独立 Git 仓库并推送至该仓库的 `main` 分支。
3. 在仓库的 **Settings → Pages → Build and deployment** 中选择 **GitHub Actions**。
4. 工作流会自动部署，后续每次推送 `main` 都会更新网站。

## 修改内容

- 页面资料：`index.html`
- 视觉样式：`styles.css`
- 头像：`头像.jpg`
