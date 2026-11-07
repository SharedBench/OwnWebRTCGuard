// Use Chrome's official privacy setting; do not access page contents or network.
// This setting persists in the browser until cleared or the extension is disabled.
const policy = chrome.privacy.network.webRTCIPHandlingPolicy;
const PROTECTED = "disable_non_proxied_udp";

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  // Never replace a user's explicitly selected mode during an extension update.
  if (reason !== "install") return;

  try {
    const current = await policy.get({ incognito: false });
    if (
      current.levelOfControl === "controllable_by_this_extension" ||
      current.levelOfControl === "controlled_by_this_extension"
    ) {
      await policy.set({ value: PROTECTED, scope: "regular" });
      const applied = await policy.get({ incognito: false });
      if (
        applied.levelOfControl !== "controlled_by_this_extension" ||
        applied.value !== PROTECTED
      ) {
        console.warn("Own WebRTC Guard: another controller may override this policy.");
      }
    } else {
      console.warn("Own WebRTC Guard: policy controlled by browser policy or another extension.");
    }
  } catch (error) {
    console.error("Own WebRTC Guard: cannot configure WebRTC IP handling:", error);
  }
});
