# Own WebRTC Guard / 自用 WebRTC IP 保护

一个无第三方依赖的 Chrome Manifest V3 扩展，通过官方 Chrome privacy.network.webRTCIPHandlingPolicy 接口限制 WebRTC 的 IP/网络路径处理。

## 研究笔记 / Research notes

- [WebRTC 泄露原理、四项目比较与待验证项（中文）](docs/notes/webrtc-ip-privacy-comparison_cn.md)
- [WebRTC IP privacy mechanisms and extension comparison (English)](docs/notes/webrtc-ip-privacy-comparison.md)

## 安装（macOS / Windows / Linux）

1. 从本仓库的 Code → Download ZIP 下载源码并解压，也可以直接 git clone。
2. Chrome 地址栏打开 chrome://extensions，启用「开发者模式」。
3. 选择「加载已解压的扩展程序」，选择包含 manifest.json 的目录。
4. 首次安装会尝试启用「严格保护」策略：disable_non_proxied_udp。
5. 点击工具栏扩展图标，可选择严格保护、兼容模式，或取消本扩展的设置。
6. 到 https://browserleaks.com/webrtc 和 https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/ 验证；请结合代理/VPN 开启前后的结果比较。

## 模式

| 按钮 | Chrome API 值 | 说明 |
|---|---|---|
| 严格保护 | disable_non_proxied_udp | 限制不经代理的 UDP；不代表 WebRTC 完全禁用。 |
| 兼容模式 | default_public_interface_only | 限制使用私有网络接口，但仍可能暴露公网 IP。 |
| 取消本扩展的设置 | chrome.privacy.network.webRTCIPHandlingPolicy.clear | 释放本扩展的控制权，之后由浏览器或其他策略决定。 |

## 安全设计

- 唯一权限是 privacy；没有 host_permissions、content_scripts、cookies、tabs、proxy、webRequest、storage 等额外权限。
- 无网络访问、无远程脚本、无遥测、无第三方依赖，不读取网页。
- 不注入脚本、不改写 navigator.mediaDevices.enumerateDevices()。这点与部分商店扩展不同。
- 通过 levelOfControl 判断是否确实取得设置控制权；避免在受浏览器管理策略或其他扩展控制时假报成功。
- 更新版本不重置用户选择。禁用/卸载扩展会释放它对 Chrome 设置的控制。

## 使用限制与验证状态

- 本扩展不是 VPN、代理或匿名工具，也不会阻断 HTTP、DNS、IPv6、浏览器指纹等其他隐私泄露。
- 无代理环境中不能假设真实公网 IP 会被隐藏；WebRTC 通话功能可能受限制。
- 当前完成的是静态检查及模拟 Chrome API 的 6 项本地测试，尚未在真实浏览器及代理环境中验证防泄露效果。

## 本地测试

Node.js 18+（可选，Chrome 运行扩展无需 Node.js）：

    node --test tests/*.test.cjs

## 官方资料

- Chrome privacy API：https://developer.chrome.com/docs/extensions/reference/api/privacy
- Chrome setting：https://developer.chrome.com/docs/extensions/reference/api/types#type-ChromeSetting
- Chromium WebRTC IP handling policy：https://chromium.googlesource.com/chromium/src/+/376fc41e87a058f7a7b300b0ec3a4982b4ec0960/components/policy/resources/templates/policy_definitions/Miscellaneous/WebRtcIPHandling.yaml
- 参考开源项目（本扩展未复制其源代码）：https://github.com/a8763506128977812212307169331690/WebRTC-Leak-Prevent
