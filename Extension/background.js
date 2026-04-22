const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx3H6ZBP77KEwMXfqdBgmpImVufFgQSAx8MtMrPxdGgp0pRYaHgvoaCji_HfvDbBMuuHQ/exec";

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("fetchData", { periodInMinutes: 2 });
  fetchAndSave(); 
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "fetchData") {
    fetchAndSave();
  }
});

async function fetchAndSave() {
  try {
    const response = await fetch(SCRIPT_URL + "?readonly=true");
    const data = await response.text();
    chrome.storage.local.set({ 
      walletData: data, 
      lastUpdate: new Date().toLocaleTimeString() 
    });
    console.log("Đã cập nhật dữ liệu ngầm lúc: " + new Date().toLocaleTimeString());
  } catch (error) {
    console.error("Lỗi cập nhật ngầm:", error);
  }
}

// --- BACKGROUND: BỘ NÃO ĐIỀU PHỐI (CODE LÕI MỚI) ---
let isManuallyPaused = false; 

chrome.storage.local.get(['isManuallyPaused'], (res) => {
    isManuallyPaused = res.isManuallyPaused || false;
});

async function ensureOffscreen() {
    const hasOffscreen = await chrome.offscreen.hasDocument();
    if (!hasOffscreen) {
        await chrome.offscreen.createDocument({
            url: 'offscreen.html',
            reasons: ['AUDIO_PLAYBACK'],
            justification: 'Music background'
        });
    }
}

async function handleAutoMusic() {
    const tabs = await chrome.tabs.query({ audible: true });
    await ensureOffscreen();

    // Đọc trạng thái mới nhất từ storage để quyết định có phát nhạc hay không
    chrome.storage.local.get(['isManuallyPaused'], (res) => {
        const currentlyPaused = res.isManuallyPaused || false;

        if (tabs.length > 0) {
            // Có tab khác phát nhạc -> Luôn dừng
            chrome.runtime.sendMessage({ action: 'pause' }).catch(() => {});
            chrome.storage.local.set({ isPlaying: false });
        } else {
            // Không có tab nào phát nhạc -> Kiểm tra xem người dùng có đang chủ động tắt không
            if (!currentlyPaused) {
                chrome.runtime.sendMessage({ action: 'play' }).catch(() => {});
                chrome.storage.local.set({ isPlaying: true });
            } else {
                chrome.runtime.sendMessage({ action: 'pause' }).catch(() => {});
                chrome.storage.local.set({ isPlaying: false });
            }
        }
    });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.hasOwnProperty('audible')) handleAutoMusic();
});

chrome.tabs.onRemoved.addListener(() => handleAutoMusic());
chrome.tabs.onActivated.addListener(() => handleAutoMusic());

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
// Chấp nhận lệnh từ content.js (from: 'content')
    if (message.from === 'popup' || message.from === 'content') { 
        ensureOffscreen().then(() => {
            if (message.action === 'toggle') {
                isManuallyPaused = message.isPausing; 
                
                // Đồng bộ storage
                chrome.storage.local.set({ 
                    isManuallyPaused: isManuallyPaused,
                    isPlaying: !isManuallyPaused 
                });

                const actionToOffscreen = isManuallyPaused ? 'pause' : 'play';
                chrome.runtime.sendMessage({ action: actionToOffscreen }).catch(() => {});
                sendResponse({ success: true });
                
            } else if (message.action === 'volume') {
                chrome.runtime.sendMessage({ action: 'volume', value: message.value }).catch(() => {});
                sendResponse({ success: true });
            }
        });
        return true;
    }
});