// URL của Google Apps Script (Web App) bạn đã deploy
const PROXY_URL = "https://script.google.com/macros/s/AKfycbwHt3WcAkfxQQOLeJUS479w5hLrhuFDzU6t4zIzz48yeEy9TsuApTqVPHHcXTQScub0uA/exec";
const FILE_ID = "1nWtLDwcp7cUlEdNI73UBE1ylfA64EkWC";

const audio = document.getElementById('bg-music');

// Hàm thực hiện: Lấy link từ GAS -> Tải nhạc -> Biến thành Local Blob
async function setupMusic() {
    try {
        console.log("📡 Đang lấy link chuẩn từ Google Script...");
        const responseLink = await fetch(`${PROXY_URL}?id=${FILE_ID}`);
        const driveUrlWithKey = await responseLink.text();

        if (!driveUrlWithKey.startsWith("https")) {
            throw new Error("Không lấy được link từ GAS: " + driveUrlWithKey);
        }

        console.log("📥 Đang tải nhạc về máy (Local Blob)...");
        const responseMusic = await fetch(driveUrlWithKey);
        const blob = await responseMusic.blob();
        
        // Tạo link local và nạp vào audio
        audio.src = URL.createObjectURL(blob);
        console.log("✅ Nhạc local đã sẵn sàng!");
    } catch (error) {
        console.error("❌ Lỗi hệ thống:", error);
    }
}

// Chạy khởi tạo
setupMusic();

// --- GIỮ NGUYÊN BỘ LẮNG NGHE LỆNH CỦA BẠN ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!audio) return;

    if (message.action === 'play') {
        audio.play().catch(() => {});
    } 
    else if (message.action === 'pause') {
        audio.pause();
    } 
    else if (message.action === 'volume') {
        audio.volume = message.value;
    }
});