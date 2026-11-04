实现第一关「森林琥珀保卫战」的探索 → 收集 → 数学题 → 一次性开箱奖励闭环，入口升级为 React / TypeScript 的真正 3D 世界。现有实现按 PRD V3.0 核对 M1 第一关及公共系统；不实现其余五关。新增 PRD V3.1 需求文档及 V3.0 归档，明确随机计算题、任务与服饰扩展、附件视觉方向和双向有声对话；这些 V3.1 功能待开发与模块 UAT。

- R3F / Drei / Rapier：第三人称角色、碰撞、木桥、树屋、森林；静态几何合并，树木与怪物部件实例化。默认 24 个池化怪物按两岸区域激活，支持巡逻、追逐、返回与 JSON 性能参数。
- 4 种肤色、5 种衣色、3 种服装；键鼠与触屏摇杆 / 跳跃 / 互动 / 镜头。六类 18 只动物可交流获取线索，含小鸟与刺猬。
- 3 木头 + 5 琥珀解锁固定三道 JSON 数学题。首次错误给文字提示，第二次显示图解。每题记录 attemptCount / hintCount / correctCount / firstTryCorrect / completedAt。
- 独立家长入口确认后展示参考答案与正确率 / 提示统计，不与儿童答题界面混用。顶部暂停、Esc、持久化音效静音与重新开始；重玩保留永久奖励、外观、通关历史与累计学习记录。
- 奖励采用唯一 ID，首次开箱发 10 木头方块；旧存档迁移，不补造历史学习数据。加入加载阶段、WebGL 错误 / 丢失恢复、存储失败提示和 Pages 工作流。

验证：npm install、npm ci、npm run dev、npm run build 通过；Vitest 10/10、Chromium Playwright 10/10。完整路线实际移动收集、过桥、答错重试、开箱、刷新与重复开箱；新增触摸、怪物 / 落水回退、WebGL 恢复、存储拒绝、生产子路径、动物交流、音效开关、暂停、分级提示、家长视图与奖励保留重玩验证。

限制：已收到六关全景图附件并写入 V3.1 视觉要求，实际游戏视觉对照尚未验收。iPhone Safari 真机、线上 HTTPS / Pages 与长时间手机性能未验证。Pages 需在仓库设置选择 GitHub Actions，合并后部署。详见 README、docs/PRD.md、docs/IMPLEMENTATION_BASELINE.md 与 docs/LEVEL1_ACCEPTANCE.md。
