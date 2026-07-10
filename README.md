# 足球预测大模型 V4.1

纯 HTML、CSS、JavaScript 的 2026 世界杯数据展示站，可直接部署到 GitHub Pages。V4.1 保留现有多页面 UI、深浅配色和响应式布局，重点统一数据层、快照兜底和 Service Worker 缓存策略。

## 页面结构

- `index.html`：首页摘要、下一场焦点战、3 场焦点比赛和模型观察。
- `predictions.html`：全部比赛预测、日期/阶段筛选、比分分布和详情弹窗。
- `schedule.html`：完整赛程、场地、状态和阶段筛选。
- `teams.html`：球队数据库、球员档案、评分、风险标签和收藏。
- `about.html`：模型边界、数据来源、FAQ 和合规说明。

## 数据架构

- `assets/js/data-normalizer.js`：把 live.json、快照和比分源转换为统一比赛/球队格式，校验日期、概率并去重。
- `assets/js/prediction-service.js`：只管理预测比分、备选比分、概率、信心和关键因素，不修改真实赛程或正式比分。
- `assets/js/data-service.js`：请求远程主数据，按需合并 ESPN 比分状态，失败时读取固定快照，并通过 `window.FM_STORE` 和 `fm:data-*` 事件供所有页面共享。
- `assets/data/snapshot.json`：最后一次可用数据的固定快照，不会随着页面刷新漂移。
- `assets/js/data.js`：仅保留比分分布、模型观察和 FAQ 等静态展示配置，不承载真实赛程。

真实事实层包含日期、队伍、场地、状态和正式比分；模型层包含预测比分、备选比分、胜平负概率、模型信心和因素。页面会明确区分两层。

## 数据源

主数据源：`https://raw.githubusercontent.com/xiaozhangzzza-afk/worldcast-26/main/data/live.json`

可选比分补充：`https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard`

ESPN 失败不会阻断主数据展示；远程主数据失败时使用 `assets/data/snapshot.json`，两者都失败时显示明确错误状态，不生成虚假赛程。

## 本地预览

不要直接双击 HTML 测试远程 `fetch`。在项目目录运行：

```bash
python -m http.server 8000
```

然后打开 <http://localhost:8000/>。

## GitHub Pages 部署

将项目根目录推送到 Pages 仓库的 `main` 分支，Pages 选择 `Deploy from a branch`，目录选择 `/ (root)`。当前公开地址为：

<https://xiaozhangzzza-afk.github.io/worldcast-26-live/>

发布新版本时同步更新 `service-worker.js` 的 `CACHE_NAME` 和 HTML 资源版本号（当前为 `4.1.0`）。首次打开新版本会执行一次旧缓存迁移；如仍看到旧页面，可使用强制刷新或在地址后添加 `?v=4.1.0`。

## 后续替换数据源

替换源时只需在 `data-service.js` 更新 URL，并在 `data-normalizer.js` 增加字段映射。保持 `FM_STORE` 和统一比赛/球队格式即可，不需要改动页面渲染层。

## 合规边界

模型演示，不构成投注、投资或财务建议。临场阵容、官方公告与实际赛果优先。正规观赛入口以页面列出的官方平台和资讯入口为准。
