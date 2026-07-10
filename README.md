# 足球预测大模型 V4.0

一个可直接部署到 GitHub Pages 的纯静态世界杯预测数据产品原型。V4.0 已从超长单页调整为轻量多页面结构。

## 项目定位

- 2026 世界杯赛程、比分预测、球队数据库、比分频次与模型观察。
- 当前使用本地演示数据，页面会明确标注 Demo data for product prototype。
- 所有预测只用于产品展示和数据表达，不构成投注、投资或财务建议。
- 不提供盗版直播源，不嵌入未知直播 iframe。

## 页面结构

```text
index.html
predictions.html
schedule.html
teams.html
about.html
assets/css/style.css
assets/js/data.js
assets/js/common.js
assets/js/home.js
assets/js/predictions.js
assets/js/schedule.js
assets/js/teams.js
assets/js/about.js
assets/img/og-cover.svg
assets/app-icon.svg
manifest.webmanifest
service-worker.js
robots.txt
sitemap.xml
README.md
```

## 本地预览

在项目目录运行任意静态服务器，例如：

```bash
python -m http.server 8766
```

然后打开：

```text
http://127.0.0.1:8766/
```

## GitHub Pages 部署

将本目录内容推送到 GitHub Pages 对应仓库的 `main` 分支，Pages source 选择 `Deploy from a branch`，目录选择根目录即可。

当前公开路径建议保持：

```text
https://xiaozhangzzza-afk.github.io/worldcast-26-live/
```

## 后续接入真实 API 的位置

在 `assets/js/data.js` 中，当前统一数据对象包括：

- `teams`
- `matches`
- `scoreDistribution`
- `insights`
- `faq`

后续可把 `teams` 和 `matches` 替换为真实 API 返回值，并保留现有渲染函数作为展示层。建议正式接入时拆出：

- 赛程 API
- 球员与伤病 API
- 实时比分 API
- 比赛事件时间轴 API
- 模型预测 API

## 合规边界

模型演示，不构成投注或财务建议。临场阵容、官方公告与实际赛果优先。
