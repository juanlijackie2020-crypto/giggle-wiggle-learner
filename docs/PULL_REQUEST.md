实现第一关「森林琥珀保卫战」的探索 → 收集 → 数学题 → 一次性开箱奖励闭环。入口升级为 React / TypeScript 的真正 3D 世界，仅开发第一关。

- 使用 R3F / Drei / Rapier 构建第三人称角色、碰撞、桥梁、树屋、森林动物与固定 24 个轻量怪物；静态几何合并、树木与怪物部件实例化。
- 支持 4 种肤色、5 种衣色、3 种服装；键鼠与触屏摇杆 / 跳跃 / 互动 / 镜头。
- 收集 3 木头、5 琥珀后才可答题，JSON 管理固定题目与提示；全部答对后开箱领取 10 木头方块。存档恢复并防止重复领取。
- 提供初始化阶段、开始按钮、错误日志 / 重试、WebGL 丢失恢复和存储失败提示；加入 Pages 子路径配置与 GitHub Actions。

验证：npm install、npm ci、npm run dev、npm run build 通过；Vitest 6/6、Chromium Playwright 8/8。浏览器完整路线实际移动收集、过桥、答错重试、开箱、刷新与重复开箱；另测触摸事件、横竖屏、怪物 / 落水回退、WebGL 故障恢复、存储拒绝与生产子路径。

限制：本仓库及 origin/main 未提供 docs/PRD.md 或六关全景图，用户确认其在另一对话，因此本次按当前消息的第一关规格实现，未声称完成 V3.0 PRD 对照。iPhone Safari 真机、线上 HTTPS / Pages 和长时间手机性能未验证。Pages 需在仓库设置选择 GitHub Actions，合并后才部署。详见 README 与 docs/LEVEL1_ACCEPTANCE.md。
