"use strict";

const setting = chrome.privacy.network.webRTCIPHandlingPolicy;
const buttons = [...document.querySelectorAll("button[data-mode]")];
const statusLabel = document.getElementById("status");
const effectiveLabel = document.getElementById("effective");
const message = document.getElementById("message");

const modeNames = {
  default: "Chrome 默认行为",
  default_public_and_private_interfaces: "公用与私有接口",
  default_public_interface_only: "兼容模式",
  disable_non_proxied_udp: "严格保护",
};

const controlNames = {
  controlled_by_this_extension: "本扩展正在控制",
  controllable_by_this_extension: "本扩展未控制，可修改",
  controlled_by_other_extensions: "其他扩展正在控制",
  not_controllable: "浏览器或管理策略不允许修改",
};

let busy = false;

function editable(level) {
  return level === "controlled_by_this_extension" ||
    level === "controllable_by_this_extension";
}

async function refresh() {
  try {
    const details = await setting.get({ incognito: false });
    const mine = details.levelOfControl === "controlled_by_this_extension";
    statusLabel.textContent = modeNames[details.value] ?? String(details.value);
    effectiveLabel.textContent = controlNames[details.levelOfControl] ?? details.levelOfControl;

    for (const button of buttons) {
      button.disabled = busy || !editable(details.levelOfControl);
      const mode = button.dataset.mode;
      button.classList.toggle("active", mode === "restore" ?
        !mine && editable(details.levelOfControl) : mine && details.value === mode);
    }

    if (!editable(details.levelOfControl)) {
      message.textContent = "当前策略受其他扩展或浏览器管理策略控制，请先检查相关设置。";
    }
    return details;
  } catch (error) {
    statusLabel.textContent = "读取失败";
    effectiveLabel.textContent = "无法通过浏览器 API 验证策略";
    for (const button of buttons) button.disabled = true;
    message.textContent = "读取失败：" + error.message;
    return null;
  }
}

async function apply(mode) {
  if (busy) return;
  busy = true;
  message.textContent = "";
  for (const button of buttons) button.disabled = true;
  try {
    const before = await setting.get({ incognito: false });
    if (!editable(before.levelOfControl)) {
      throw new Error("当前 WebRTC 策略由其他扩展或浏览器管理策略控制。");
    }
    if (mode === "restore") {
      await setting.clear({ scope: "regular" });
    } else {
      await setting.set({ value: mode, scope: "regular" });
    }
    const after = await setting.get({ incognito: false });
    if (mode !== "restore" &&
      (after.levelOfControl !== "controlled_by_this_extension" || after.value !== mode)) {
      throw new Error("未能确认本扩展已取得控制权，请检查其他扩展和管理策略。");
    }
    if (mode === "restore" && after.levelOfControl === "controlled_by_this_extension") {
      throw new Error("未能确认本扩展已释放控制权。");
    }
  } catch (error) {
    message.textContent = "操作失败：" + error.message;
  } finally {
    busy = false;
    await refresh();
  }
}

for (const button of buttons) {
  button.addEventListener("click", () => { void apply(button.dataset.mode); });
}

setting.onChange.addListener(() => { if (!busy) void refresh(); });
void refresh();
