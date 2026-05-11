// URL của Google Apps Script (Web App)
const PROXY_URL = "https://script.google.com/macros/s/AKfycbwHt3WcAkfxQQOLeJUS479w5hLrhuFDzU6t4zIzz48yeEy9TsuApTqVPHHcXTQScub0uA/exec";
const FILE_ID = "1nWtLDwcp7cUlEdNI73UBE1ylfA64EkWC";

const audio = document.getElementById('bg-music');

// =====================================================================
// [MỚI THÊM] - CÁC HÀM HỖ TRỢ LƯU TRỮ VÀO Ổ CỨNG (INDEXEDDB)
// =====================================================================
const DB_NAME = "YinxOfflineMusic";
const STORE_NAME = "audio_files";

function openDB() {
    return new Promise((resolve) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = (e) => {
            if (!e.target.result.objectStoreNames.contains(STORE_NAME)) {
                e.target.result.createObjectStore(STORE_NAME);
            }
        };
        request.onsuccess = () => resolve(request.result);
    });
}

async function getOfflineBlob() {
    const db = await openDB();
    return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const req = tx.objectStore(STORE_NAME).get("bg_music_blob");
        req.onsuccess = () => resolve(req.result);
    });
}

async function saveOfflineBlob(blob) {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(blob, "bg_music_blob");
}
// =====================================================================

// Hàm thực hiện: Lấy link từ GAS -> Tải nhạc -> Biến thành Local Blob
async function setupMusic() {
    try {
        // [THAY ĐỔI 1 TRONG HÀM NÀY]: Đọc từ ổ cứng xem đã có file nhạc chưa
        console.log("🔍 Đang kiểm tra nhạc offline trong ổ cứng...");
        let blob = await getOfflineBlob();

        if (!blob) {
            // [LOGIC CŨ CỦA BẠN]: Chạy khi chưa có file trong ổ cứng
            console.log("📡 Chưa có nhạc offline. Đang lấy link chuẩn từ Google Script...");
            const responseLink = await fetch(`${PROXY_URL}?id=${FILE_ID}`);
            const driveUrlWithKey = await responseLink.text();

            if (!driveUrlWithKey.startsWith("https")) {
                throw new Error("Không lấy được link từ GAS: " + driveUrlWithKey);
            }

            console.log("📥 Đang tải nhạc về máy (Local Blob)...");
            const responseMusic = await fetch(driveUrlWithKey);
            blob = await responseMusic.blob();
            
            // [THAY ĐỔI 2 TRONG HÀM NÀY]: Lưu Blob vừa tải được vào ổ cứng để dùng vĩnh viễn
            await saveOfflineBlob(blob);
            console.log("💾 Đã cất nhạc vào ổ cứng thành công!");
        } else {
            // [THAY ĐỔI 3 TRONG HÀM NÀY]: Bỏ qua bước tải nếu đã có nhạc
            console.log("⚡ Đã tìm thấy nhạc từ ổ cứng. Không cần tải lại!");
        }
        
        // [GIỮ NGUYÊN]: Tạo link local và nạp vào audio
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