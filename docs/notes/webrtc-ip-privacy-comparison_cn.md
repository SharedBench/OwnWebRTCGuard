# WebRTC IP 泄露防护：机制、项目比较与 OwnWebRTCGuard 决策笔记

- 记录日期：2026-11-08
- 归档项目：[SharedBench/OwnWebRTCGuard](https://github.com/SharedBench/OwnWebRTCGuard)
- 范围：Chromium/Chrome 浏览器的 WebRTC IP 选路与相关隐私，不涵盖系统级所有网络流量
- 来源类型：Chrome 官方接口文档、三个项目的公开说明、OwnWebRTCGuard 的当前仓库源码
- 事实状态：**已核实的源码/API**、**上游自述（未独立审计）**、**待实机验证** 严格分开
- 对应英文：[webrtc-ip-privacy-comparison.md](webrtc-ip-privacy-comparison.md)

## 1. 问题与机制

WebRTC 的 ICE 连接建立过程可能收集 host（本机接口）、server-reflexive（例如经 STUN 得到的公网映射地址）和 relay（例如 TURN 中继）候选；实际可见地址、是否被 mDNS 隐藏，取决于浏览器版本、网络、权限、代理及选路策略。**即使普通 HTTP 页面走代理，WebRTC 非代理 UDP 也可能采用另一条路径。**

Chrome 提供扩展 API：`chrome.privacy.network.webRTCIPHandlingPolicy`（需 `privacy` 权限），允许控制 WebRTC 使用网络接口和 UDP 的规则；该接口 **不是**全局代理、也不是保证任何网页都无法识别公网 IP 的开关。

四个官方枚举值：

| 值 | 理解与影响 |
|---|---|
| `default` | Chromium 默认行为 |
| `default_public_and_private_interfaces` | 允许公用与私有接口；不适合作为强制隐藏局域网地址的保证 |
| `default_public_interface_only` | 限制使用私有接口，通常更兼顾实时通信；**不能保证隐藏公网 IP** |
| `disable_non_proxied_udp` | 限制非代理 UDP；适合担忧普通代理之外 WebRTC UDP 外连的情况，但可能影响语音/视频/点对点功能 |

详见：[Chrome privacy API](https://developer.chrome.com/docs/extensions/reference/api/privacy)。

## 2. 对比结论（截至记录日）

| 项目 | 核心设计 | 默认行为 / 额外功能 | 可确认权限 / 源码 | 取舍与证据 |
|---|---|---|---|---|
| [OwnWebRTCGuard](https://github.com/SharedBench/OwnWebRTCGuard)（自研） | 使用 Chrome 官方 `webRTCIPHandlingPolicy`，不注入网页 | 首次安装尝试 `disable_non_proxied_udp`；提供兼容模式 `default_public_interface_only` 与 `clear()` 恢复控制 | Manifest V3；仅申请 `privacy`；源码在本仓库 | **已由自身源码确认**：小权限面、可审计；没有设备枚举隐藏、没有完整关闭 WebRTC |
| [WebRTC Leak Prevent](https://github.com/a8763506128977812212307169331690/WebRTC-Leak-Prevent)（开源） | 同一 Chromium 官方设置接口 | README 表述默认 `default_public_interface_only`，侧重兼容 | README 表述 `privacy` + `storage`；Apache-2.0 | **上游 README 可确认**；它不是自研实现的依赖 |
| [WebRTC Protect - Protect IP Leak](https://chromewebstore.google.com/detail/webrtc-protect-protect-ip/bkmmlbllpjdpgcgdohbaghfaecnddhni)（商店） | 商店介绍称修改浏览器 WebRTC 网络路由设置 | 自称默认阻断 WebRTC，并提供临时放开；自称 `enumerateDevices()` 返回空数组的可配置能力 | 未获取完整源码或逐项审核其 Manifest / 权限 | **仅商店说明，非独立验证**；媒体设备列表隐藏≠阻止 IP 泄露 |
| [WebRTC Control](https://github.com/dlinbernard/webrtc-control)（开源） | 多浏览器 WebRTC 控制，偏向阻断或干预页面 WebRTC 功能 | README 宣称支持关闭 `getUserMedia`、`RTCPeerConnection` 等组件 | 公开源码；本次**未逐项审核权限和实现细节** | 功能范围更大，可能破坏网站音视频；不把项目宣传等同于验证结果 |

**核心差异**：OwnWebRTCGuard 是“约束选路 + 最少权限”，不是“所有网页 WebRTC API 的拦截器”，也没有承诺隐身。参考项目中的“隐藏 IP/关闭 WebRTC”要用实际 ICE 候选结果检验，而不能仅凭按钮或商店介绍判定。

## 3. 当前 OwnWebRTCGuard 的实现边界

**REAL — 源码可验证：**

- `manifest.json`：MV3，只有 `privacy`，无 `host_permissions`、`content_scripts`、`storage`、`proxy` 或 `webRequest` 权限。
- `background.js`：仅在新安装时尝试设置严格模式；更新不自动覆盖用户已选模式；先检查 `levelOfControl`。
- `popup.js`：严格、兼容、释放控制权；读取返回策略及 `levelOfControl`，提示被其他扩展/企业策略覆盖的情况。
- 自带两个 Node 测试文件，共 6 个模拟 API / 静态检查用例；此前交付报告称全部通过，本笔记发布过程**不等于重新执行测试**。

**NOT_RUN — 尚未验收：**

- 未以真实 Chrome 安装、浏览器重启和代理切换流程验证候选地址。
- 未验证与 Chumen 代理模式（HTTP、SOCKS、TUN/系统代理等）的交互。
- 未完成音视频站点兼容性、不同 Chromium 版本和扩展冲突的实机矩阵。
- 浏览器设置返回“已由本扩展控制”只能证明策略已被应用，**不能证明外部网站看不到原始公网 IP**。

**不做的功能（当前设计选择）：** 注入网页脚本修改 `enumerateDevices()`、全面屏蔽 `RTCPeerConnection`、收集网站数据、自动上传诊断信息。

## 4. 与 Chumen 的边界

- **Chumen/系统代理**：决定设备或浏览器的实际网络出口；其安全性不能由浏览器扩展替代。
- **OwnWebRTCGuard**：约束 Chrome 内 WebRTC 非代理 UDP 选路；不能影响其他进程的 UDP，也不能自动解决 DNS、HTTP 直连、IPv6 或浏览器指纹问题。
- 推荐组合：先保证代理路由本身正确，再在浏览器启用严格策略，最后使用 WebRTC 测试页确认实际曝光。**不能把“开启严格模式”直接写成“已无 IP 泄露”。**

## 5. 实机验收清单（待执行）

1. 记录 Chrome 版本、macOS 版本、Chumen 模式、代理出口公网 IP；不要在公开日志中上传真实地址/凭据。
2. 在浏览器分别选择 **恢复设置 → 兼容模式 → 严格保护**，每次重新打开测试页以获取新的 ICE 候选。
3. 使用 [BrowserLeaks WebRTC](https://browserleaks.com/webrtc) 与 [Trickle ICE](https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/) 观察 host、srflx、relay 候选及实际可见 IP；注意 mDNS 隐藏和浏览器权限。
4. 分别对代理开/关、网络切换、重启 Chrome、另一扩展抢占策略、企业策略锁定进行核验。
5. 检查音视频会议/数据通道是否正常；按“实际是否出现非预期地址 + 功能可用性”给出结果，不把站点无法连接自动视为保护成功。
6. 汇总机器、模式、结果与脱敏证据；未执行保持 **NOT_RUN**，意外泄露标 **FAILED**，环境缺失标 **BLOCKED**。

## 6. 后续优先级

1. 先做实机测试/复现脚本，形成可以重复的脱敏验收证据。
2. 在弹窗增加“浏览器设置已应用 / 真实 IP 未检测”两种状态的明确区分。
3. 根据实测结果再决定是否与 Chumen 做可选状态对接；默认不新增不必要权限。
4. 媒体设备枚举伪装与彻底禁用 WebRTC 暂不作为第一阶段范围；只有明确需求、审查权限并测试兼容性后再考虑。

## 7. 来源与复核入口

- Chrome 官方 [privacy API](https://developer.chrome.com/docs/extensions/reference/api/privacy)
- Chrome 官方 [ChromeSetting 及控制级别](https://developer.chrome.com/docs/extensions/reference/api/types#type-ChromeSetting)
- [WebRTC Leak Prevent README](https://github.com/a8763506128977812212307169331690/WebRTC-Leak-Prevent)
- [WebRTC Control README](https://github.com/dlinbernard/webrtc-control)
- [WebRTC Protect 商店页](https://chromewebstore.google.com/detail/webrtc-protect-protect-ip/bkmmlbllpjdpgcgdohbaghfaecnddhni)
- [OwnWebRTCGuard 源码与 README](https://github.com/SharedBench/OwnWebRTCGuard)

> 本文是研究与选型记录，不是 Chrome/WebRTC 的安全保证或真实环境验收报告。
