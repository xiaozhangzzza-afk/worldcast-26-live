# 项目固定约定

- 本网站的正式品牌名称固定为“足球预测大模型”。
- 后续新增功能、视觉改版、部署、页面标题、顶部品牌和页脚均继续使用“足球预测大模型”。
- 未经用户明确要求，不得恢复或替换为 WorldCast、WorldCast 26、WorldCup AI 或其他品牌名称。
- 为避免现有访问链接失效，品牌名称调整不等同于修改公开 URL 或仓库名称。
- 当前 V4.0 展示层为轻量多页面：`index.html`、`predictions.html`、`schedule.html`、`teams.html`、`about.html`，样式在 `assets/css/style.css`，共享数据在 `assets/js/data.js`。
- 后续修改必须保留中英文切换、主题切换、球队收藏、每日模型观察、比分频次、FAQ、预测免责声明和相对链接导航。
- 每次正式版本更新时同步修改 `service-worker.js` 的 `CACHE_NAME`，避免用户长期命中旧缓存。
