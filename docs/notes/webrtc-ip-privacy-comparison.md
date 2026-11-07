# WebRTC IP Privacy: Mechanism, Alternatives, and OwnWebRTCGuard Decision Note

- Recorded: 2026-11-08
- Project: [SharedBench/OwnWebRTCGuard](https://github.com/SharedBench/OwnWebRTCGuard)
- Scope: Chrome/Chromium WebRTC IP handling—not system-wide anonymity
- Evidence categories: **REAL (verified implementation or official API)**, **UPSTREAM CLAIM (not independently audited)**, **NOT_RUN (not yet exercised in a real browser)**
- Chinese translation: [webrtc-ip-privacy-comparison_cn.md](webrtc-ip-privacy-comparison_cn.md)

## 1. What is being protected?

WebRTC ICE may discover host, server-reflexive (STUN), and relay (TURN) candidates. Which addresses become visible depends on the browser, network, proxies, permissions, mDNS host-candidate masking, and selected policy. A web page that loads over an HTTP proxy does **not** imply that WebRTC UDP always uses the same proxy.

Chrome provides `chrome.privacy.network.webRTCIPHandlingPolicy` with the `privacy` permission. Its supported values are `default`, `default_public_and_private_interfaces`, `default_public_interface_only`, and `disable_non_proxied_udp`. These constrain WebRTC routing; they are **not** a VPN or a universal IP-hiding guarantee. See [Chrome's official documentation](https://developer.chrome.com/docs/extensions/reference/api/privacy).

## 2. Alternatives

| Extension | Mechanism and scope | Default / extra capability | Evidence / caution |
|---|---|---|---|
| [OwnWebRTCGuard](https://github.com/SharedBench/OwnWebRTCGuard) | Chrome privacy API only; no page injection | On installation, attempts `disable_non_proxied_udp`; compatibility mode `default_public_interface_only`; clear policy | **REAL:** code and manifest in this repository; only the `privacy` permission |
| [WebRTC Leak Prevent](https://github.com/a8763506128977812212307169331690/WebRTC-Leak-Prevent) | Same Chrome setting | README says default is `default_public_interface_only` | **UPSTREAM README:** `privacy` and `storage` permissions, Apache-2.0 |
| [WebRTC Protect – Protect IP Leak](https://chromewebstore.google.com/detail/webrtc-protect-protect-ip/bkmmlbllpjdpgcgdohbaghfaecnddhni) | Store listing says it changes WebRTC routing | Claims default blocking, temporary enablement, and optional empty `enumerateDevices()` results | **UPSTREAM CLAIM:** complete extension source and permission manifest were not audited |
| [WebRTC Control](https://github.com/dlinbernard/webrtc-control) | Multi-browser API control/blocking | README claims control over `getUserMedia`, `RTCPeerConnection`, etc. | **UPSTREAM README:** wider scope and potential website breakage; permissions not audited here |

The central distinction is **routing policy vs. blocking/intercepting web-facing WebRTC APIs**. Hiding a media-device list is separate from preventing unexpected IP exposure.

## 3. OwnWebRTCGuard implementation and limits

**REAL (source-inspected):** Manifest V3; `privacy` is the sole declared permission; no host access, content scripts, remote scripts, telemetry, or network requests in runtime code. On first install, `background.js` requests `disable_non_proxied_udp` if the policy is controllable; on upgrade it does not overwrite the chosen policy. The popup exposes strict, compatibility, and clear controls and reads `levelOfControl`.

There are six Node-based mock/static test cases in two test files. The preceding delivery reported them as passing; publishing this note does **not** constitute a fresh test run.

**NOT_RUN:** Real Chrome installation/restart, WebRTC ICE leak verification, macOS/Chumen proxy combinations, browser compatibility, and policy conflicts. A `controlled_by_this_extension` status confirms ownership of the setting, **not** that the origin IP is invisible to every site.

This extension deliberately does not inject scripts, override `navigator.mediaDevices.enumerateDevices()`, or fully disable all WebRTC APIs.

## 4. Chumen integration boundary

Chumen or the OS routing layer determines the actual proxy/network egress; OwnWebRTCGuard only controls Chrome's WebRTC IP routing policy. Neither replaces checks for ordinary HTTP direct routing, DNS, IPv6, browser fingerprinting, or other processes. Strict mode is especially relevant when non-proxied UDP is a concern, but must be tested under the specific proxy configuration.

## 5. Practical acceptance criteria (pending)

1. Record Chrome/macOS versions, proxy mode and expected external IP privately; redact sensitive identifiers in shared test evidence.
2. Compare **clear → compatibility → strict** modes, rebuilding ICE candidates for each.
3. Inspect host/srflx/relay candidates using [BrowserLeaks](https://browserleaks.com/webrtc) and [Trickle ICE](https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/); account for browser permissions and mDNS obfuscation.
4. Repeat with proxy on/off, network changes, Chrome restart, and another extension or enterprise policy controlling the setting.
5. Test calling/video/data-channel compatibility and report both network exposure and functionality. A failed connection alone does not prove privacy.
6. Attach redacted evidence and label results **REAL**, **NOT_RUN**, **FAILED**, or **BLOCKED** accurately.

## 6. Next steps

Prioritize real-browser reproducible tests, clarify “policy active” vs. “actual IP exposure unknown” in the UI, then consider optional Chumen integration if supported by evidence. Avoid introducing webpage access or device-enumeration interception merely to match a store listing.

## Sources

- [Chrome privacy API](https://developer.chrome.com/docs/extensions/reference/api/privacy)
- [ChromeSetting control semantics](https://developer.chrome.com/docs/extensions/reference/api/types#type-ChromeSetting)
- [WebRTC Leak Prevent](https://github.com/a8763506128977812212307169331690/WebRTC-Leak-Prevent)
- [WebRTC Control](https://github.com/dlinbernard/webrtc-control)
- [WebRTC Protect Chrome Web Store listing](https://chromewebstore.google.com/detail/webrtc-protect-protect-ip/bkmmlbllpjdpgcgdohbaghfaecnddhni)
- [OwnWebRTCGuard implementation](https://github.com/SharedBench/OwnWebRTCGuard)

> This is a research and decision note, not a security certification or a completed browser acceptance report.
