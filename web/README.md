# Learn Pi Agent — 教程站

参照 [learn.shareai.run](https://learn.shareai.run/zh/s01/) 的样式,用 Next.js + Tailwind 4 重做的 pi harness 教程站。
**默认中文(`/zh/`),英文在 `/en/`。**

章节正文直接来自仓库各目录下的 `README.md`(中文)与 `README.en.md`(English),
由 `scripts/extract-content.ts` 抽取成 `src/data/generated/*.json`;`code.ts` 的注释是中英双语。

```bash
npm install
npm run dev     # 会先跑 extract → http://localhost:3000/zh/
npm run build   # 静态导出到 out/
```

## 功能

- 章节页:机制定位图 + 学习 / 源码 / 结构三个 tab(含源码高亮与结构 diff)
- 学习路径时间线、任意两章对比、四层机制视图
- 双语:站点 UI 与正文都按 `/zh`、`/en` 区分,语言切换在右上角
- SEO:`sitemap.xml`(含 hreflang alternates)、`robots.txt`、每页 canonical + hreflang

## 部署

GitHub Actions 调用 Vercel CLI(仓库根 `.github/workflows/deploy-vercel.yml`)。

需要设置的环境变量 / secrets:

| 名称 | 位置 | 说明 |
|---|---|---|
| `VERCEL_TOKEN` | 仓库 secret | vercel.com/account/tokens |
| `VERCEL_ORG_ID` | 仓库 secret | Vercel 项目 id |
| `VERCEL_PROJECT_ID` | 仓库 secret | Vercel 项目 id |
| `NEXT_PUBLIC_SITE_URL` | Vercel 环境变量 | 你的正式域名,用于 sitemap / canonical |

Vercel 项目的 Root Directory 设为 `web`。
