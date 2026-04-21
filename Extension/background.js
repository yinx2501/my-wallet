const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx3H6ZBP77KEwMXfqdBgmpImVufFgQSAx8MtMrPxdGgp0pRYaHgvoaCji_HfvDbBMuuHQ/exec";

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("fetchData", { periodInMinutes: 2 });
  fetchAndSave(); // Chạy lần đầu ngay khi cài đặt
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
    // Lưu vào storage kèm thời gian cập nhật
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
let isManuallyPaused = false; // Biến ghi nhớ trạng thái người dùng tự bấm

// Khi khởi động, đọc lại trí nhớ xem trước đó người dùng có đang tắt nhạc không
chrome.storage.local.get(['isManuallyPaused'], (res) => {
    isManuallyPaused = res.isManuallyPaused || false;
});

// Hàm khởi tạo Loa
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

// Hàm cốt lõi kiểm tra âm thanh toàn trình duyệt
async function handleAutoMusic() {
    const tabs = await chrome.tabs.query({ audible: true });
    await ensureOffscreen();

    if (tabs.length > 0) {
        // CÓ tab đang phát nhạc -> Dừng nhạc nền
        chrome.runtime.sendMessage({ action: 'pause' }).catch(() => {});
    } else {
        // KHÔNG có tab nào phát nhạc -> CHỈ PHÁT NẾU NGƯỜI DÙNG KHÔNG TỰ BẤM DỪNG
        if (!isManuallyPaused) {
            chrome.runtime.sendMessage({ action: 'play' }).catch(() => {});
        }
    }
}

// 1. Theo dõi khi một tab thay đổi trạng thái âm thanh
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.hasOwnProperty('audible')) handleAutoMusic();
});

// 2. Theo dõi khi một tab bị đóng
chrome.tabs.onRemoved.addListener(() => handleAutoMusic());

// 3. Theo dõi khi bạn chuyển đổi giữa các Tab
chrome.tabs.onActivated.addListener(() => handleAutoMusic());

// 4. Lắng nghe LỆNH TRỰC TIẾP TỪ POPUP
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    // Chỉ xử lý tin nhắn có gán nhãn 'từ popup' để tránh vòng lặp tin nhắn
    if (message.from === 'popup') {
        ensureOffscreen().then(() => {
            if (message.action === 'toggle') {
                // Cập nhật biến cờ dựa trên nút bấm của người dùng
                isManuallyPaused = message.isPausing; 
                
                // Gửi lệnh tương ứng cho Offscreen
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