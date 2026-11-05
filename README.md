# 骞骞的学习方块世界 · 第一关

**森林琥珀保卫战（Forest Amber Defense）**：真正的第三人称 WebGL 3D 森林冒险 MVP，只实现第一关，没有其余五关。原创几何体 Voxel 美术，无后端、账号或付费 API。

> 产品基线：[PRD V3.1](docs/PRD.md)。本分支已开发第一关体验升级：随机计算题、三类可选任务、扩展装扮、明亮森林 UI 和中文有声对话。[实现与验证](docs/V31_IMPLEMENTATION.md) · [先做一个模块的 UAT](docs/V31_UAT.md) · [V3.0 归档](docs/PRD_V3.0.md)。

## 安装、启动与构建

Node.js 22.12+，npm。推荐 `nvm use`，本次环境使用 Node 24。

```sh
npm install
npm run dev
```

浏览器访问终端显示的 Vite 地址。手机可在同一局域网访问开发机地址；正式 iPhone 测试请使用 HTTPS 部署地址。**不要双击 HTML，也不要使用 iPhone 文件或聊天附件预览。**

```sh
npm ci           # 已有 lockfile 时可重复安装
npm run build    # TypeScript 检查与静态打包
npm run preview  # 本地预览 dist，非线上部署
```

## 怎么玩

1. 创建角色：4 种肤色、8 种衣色、6 种服饰与 6 套成套配色。拖动 3D 预览旋转人物，再进入森林。
2. 沿林间小路寻找 **3 块木头**，靠近物品并互动。
3. 收集 **5 块金色琥珀**。从中央木桥过河，继续向北探索。
4. 小心 24 个巡游/追逐的原创方块怪物；接触或落水回到最近安全旗帜，收集物不丢失。18 只兔子、长尾鹿、松鼠、狐狸、小鸟、刺猬会在林间活动，靠近后互动可打开有声对话。选择回应，由主角说出，再由动物回答；配字幕、重播、跳过、静音与播放失败重试。
5. 靠近北面灌木中的宝箱，材料齐全后解答本轮随机 3 题，默认 20 以内加减法。每题 4 个不同选项，包含进位题；首次答错给文字提示，第二次显示适配算式的点阵，可无限重试。关闭题目或刷新保持同一题组。
6. 答对全部 3 题，点击开箱，箱盖动画播放，**10 个木头方块**自动进入背包。每个本地存档只发一次。
7. 打开顶部“任务”：选择动物寻踪、森林探索或木桩跑酷。完成可选任务获得一次性徽章；主线宝箱不要求完成支线。切换可选任务保留步骤，确认放弃才重置该任务本轮步骤。

### 操作

| 操作        | 电脑                | 手机 / 平板              |
| ----------- | ------------------- | ------------------------ |
| 移动        | WASD / 方向键       | 左下虚拟摇杆             |
| 跳跃        | 空格                | 右下「跳跃」             |
| 互动 / 收集 | E，或近距离点击物品 | 「互动」，或近距离点物品 |
| 转动镜头    | 拖动 3D 场景        | 滑动场景空白处           |
| 换装 / 背包 | 顶部角色 / 背包     | 顶部图标                 |
| 关闭窗口    | 关闭按钮 / Esc      | 关闭按钮                 |

顶部「Ⅱ」或 Esc 可暂停；暂停菜单可进入家长视图、切换音效、重新开始第一关。重新开始会重置本轮材料与答题，但永久奖励、外观和累计学习记录保留。短音效通过本地 Web Audio 生成；对白使用随网站发布的 15 段中文 MP3（约 0.67 MB），不依赖浏览器 TTS 或外部服务。暂停菜单可分别调整对白/音效音量与低画质模式，设置会保存。配音为离线合成原型，人声音色可在 UAT 后替换。

地图上棕点为木头、金点为琥珀，北面方框为宝箱。金旗是安全点。打开菜单暂停怪物及角色；切换到后台自动暂停，失焦清空输入，防止按键卡住。

## 存档

使用独立的 `localStorage` 键 `qianqian-forest-v1`，使用 schema version 2，保存外观、物品 ID、随机题组快照/选项顺序、题目统计、任务步骤/徽章、安全点、本轮完成 / 永久通关状态、唯一奖励领取记录和音量/画质设置。旧版 `wordwood-v1` 不被覆盖。

- 重复收集 ID、提前开箱、重复开箱不会增加物品或奖励。
- 开箱状态与奖励放在同一 JSON 存档中。开箱动画中刷新也不会重复领取。
- 旧版第一关存档会自动迁移。进行中的固定题组先保留，明确重新开始后才切换随机题；已领取奖励映射到唯一奖励 ID `forest-amber:wood-blocks:v1`。未记录的历史答题次数和时间不伪造；之后重玩可累积新记录。
- 损坏或不兼容存档会回到默认状态；无效 ID / 重复 ID / 不完整通关标记会被校正。
- 禁止网站存储时显示警告，仍可在本次会话游玩。清理网站数据将清除进度，不跨浏览器或设备同步。
- 本地单机进度不是服务器防作弊系统，无法防止用户主动修改浏览器存储。

## 家长视图与学习记录

从暂停菜单进入家长视图，明确确认后才显示参考答案。每题记录 `attemptCount`、`hintCount`、`correctCount`、`firstTryCorrect`、`completedAt`；正确率为累计答对次数 / 有效作答次数。首次错误提供文字提示，第二次提供图解。刷新、关闭题目和重新开始均保留累计记录，重玩时本轮提示级别重新开始。旧存档的既往数据标为“未记录”。家长入口用于避免误触，不是身份或密码验证。

## 测试

```sh
npm test
npx playwright install chromium
npm run test:e2e
```

已有系统 Chromium 时：

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE=/usr/bin/chromium npm run test:e2e
```

Playwright 先构建生产版本，再自动启动 Vite 与模拟 Pages 子路径的静态服务器。测试通过真实键鼠和浏览器 Pointer Events 操作，不通过传送接口伪造通关。设备仿真不等于真机 Safari 验证。

当前版本参见 [V3.1 实现与验证](docs/V31_IMPLEMENTATION.md)；[V3.0 测试记录](docs/LEVEL1_ACCEPTANCE.md)作为历史基线保留。

## GitHub Pages 部署

已提供 [GitHub Actions 配置](.github/workflows/pages.yml)：PR 运行测试；main 测试通过后上传 `dist` 并部署。

1. 在 GitHub 仓库打开 **Settings → Pages → Build and deployment → Source → GitHub Actions**。
2. 合并本次 PR 到 `main`，或在 Actions 手动运行工作流。
3. 打开工作流给出的 `github-pages` HTTPS 地址。

`vite.config.ts` 使用 `base: './'`，兼容仓库子路径和 Netlify 根路径，无需硬编码域名。Rapier WASM 随 npm 依赖打包在站点 JS 内，不从外部 CDN 下载。Netlify 仍使用 `npm run build` / `dist`。

尚未在用户 GitHub 账户中启用 Pages，也不声称已发布或已通过 HTTPS 真机测试。

## 代码结构与性能

- `src/App.tsx`：加载 / 错误 / 重试、创建角色、任务 HUD、数学窗口、背包与触屏。
- `src/game/Scene.tsx`：R3F 场景、Rapier 动态角色 / 固定地形 / 怪物传感器、第三人称相机。
- `src/game/state.ts`：纯状态转换、存档校验和一次性奖励。
- `src/game/world.ts`：场景位置、路线、收集物、检查点。
- `src/data/level1.json`：旧版题目、奖励唯一 ID 和怪物参数；`src/data/math.json`：随机题难度/提示规则；`src/game/questions.ts`：种子生成与去重。
- `src/data/tasks.json` / `src/game/tasks.ts`：任务规则、标记和木桩路线。
- `src/data/animals.json` / `src/data/dialogue.json`：动物线索与对白清单；`public/audio/forest`：中文 MP3 及来源说明。
- `scripts/generate-forest-voices.py`：可重复生成原型配音；开发/构建网站无需安装语音工具。
- `tests/unit` / `tests/e2e`：规则测试与实际浏览器操作。

树木采用实例化渲染，怪物默认 24 个池化传感器 + 实例化部件，按河流两岸分区激活，失去目标后返回巡逻范围，不在帧循环创建怪物。可通过 `level1.json` 的 `mobs.maxActive` 调整池上限（6–24），`zoneCount` 选择 1 / 2 区域，`chaseRadius`、`leashRadius`、`speed` 调节追逐。DPR 上限桌面 1.5、触屏 1；阴影 1024；无图片纹理和远程美术资源。固定物理步长 1/60，每帧最多推进两个子步，避免低帧率下跳过落点。窗口大小由 R3F 自动同步，图形上下文丢失可重试，错误详情写入控制台及屏幕。

手机实际帧率、iPhone Safari 兼容性和长时间发热情况仍需真机验证。初次下载包含物理引擎，慢网络需要等待；加载界面提供状态和重试，不伪造资源百分比。
