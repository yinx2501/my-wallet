// 1. TẠO GIAO DIỆN CHÈN VÀO TRANG WEB
const player = document.createElement('div');
player.id = 'mw-floating-player';
player.innerHTML = `
  <div id="mw-drag-handle">🎵 Khúc Nhạc Thư Giãn</div>
  <div id="mw-controls">
    <button id="mw-play-btn">▶</button>
    <input type="range" id="mw-volume-slider" min="0" max="100" value="15">
  </div>
`;
document.body.appendChild(player);

const btnPlay = document.getElementById('mw-play-btn');
const sliderVol = document.getElementById('mw-volume-slider');
const dragHandle = document.getElementById('mw-drag-handle');

let isPlaying = false;

// 2. KHÔI PHỤC TRẠNG THÁI TỪ BỘ NHỚ KHI VỪA MỞ TRANG
chrome.storage.local.get(['isPlaying', 'userVolume', 'playerPos'], (res) => {
    // Phục hồi âm lượng và nút bấm
    if (res.userVolume !== undefined) sliderVol.value = res.userVolume;
    
    isPlaying = res.isPlaying || false;
    updatePlayButtonUI(isPlaying);

    // Phục hồi vị trí nếu bạn đã kéo nó đi chỗ khác ở tab khác
    if (res.playerPos) {
        player.style.bottom = 'auto';
        player.style.right = 'auto';
        player.style.left = res.playerPos.x + 'px';
        player.style.top = res.playerPos.y + 'px';
    }
});

// Hàm cập nhật giao diện nút
function updatePlayButtonUI(playing) {
    isPlaying = playing;
    btnPlay.innerText = playing ? "⏸" : "▶";
    btnPlay.style.background = playing ? "#f44336" : "#4caf50";
}

// 3. XỬ LÝ SỰ KIỆN NGƯỜI DÙNG BẤM TẠI TAB HIỆN TẠI
btnPlay.onclick = () => {
    const newState = !isPlaying;
    
    // Lưu vào storage (tất cả các tab khác sẽ nghe thấy tín hiệu này)
    chrome.storage.local.set({ 
        isPlaying: newState,
        isManuallyPaused: !newState // Báo cho background biết là do user tự bấm
    });

    // Gửi lệnh cho Background để Offscreen phát/dừng nhạc
    chrome.runtime.sendMessage({ 
        from: 'content', 
        action: 'toggle', 
        isPausing: !newState 
    });
};

sliderVol.oninput = (e) => {
    const val = e.target.value;
    chrome.storage.local.set({ userVolume: val }); // Đồng bộ thanh kéo các tab
    chrome.runtime.sendMessage({ from: 'content', action: 'volume', value: val / 100 });
};

// 4. LẮNG NGHE ĐỒNG BỘ TỪ CÁC TAB KHÁC
chrome.storage.onChanged.addListener((changes) => {
    if (changes.isPlaying) {
        updatePlayButtonUI(changes.isPlaying.newValue);
    }
    if (changes.userVolume) {
        sliderVol.value = changes.userVolume.newValue;
    }
    // Đồng bộ vị trí kéo thả giữa các tab (tùy chọn)
    if (changes.playerPos) {
        player.style.bottom = 'auto';
        player.style.right = 'auto';
        player.style.left = changes.playerPos.newValue.x + 'px';
        player.style.top = changes.playerPos.newValue.y + 'px';
    }
});

// 5. CHỨC NĂNG KÉO THẢ (PHIÊN BẢN CHIẾN ĐẤU - CHỐNG XUNG ĐỘT)
let isDragging = false;
let startMouseX = 0, startMouseY = 0;
let startPlayerX = 0, startPlayerY = 0;

// Dùng pointerdown thay cho mousedown và thêm tham số { capture: true }
dragHandle.addEventListener("pointerdown", (e) => {
    // Chỉ xử lý nếu bấm chuột trái (button === 0)
    if (e.button !== 0) return;

    isDragging = true;
    
    // Ghi nhận vị trí
    startMouseX = e.clientX;
    startMouseY = e.clientY;
    
    const rect = player.getBoundingClientRect();
    startPlayerX = rect.left;
    startPlayerY = rect.top;
    
    player.style.bottom = 'auto';
    player.style.right = 'auto';
    player.style.left = startPlayerX + 'px';
    player.style.top = startPlayerY + 'px';
    
    dragHandle.style.cursor = 'grabbing';

    // Ngăn chặn sự kiện bị các bên khác "hớt tay trên"
    e.stopPropagation(); 
}, { capture: true }); // <--- Bắt sự kiện ngay từ vòng ngoài (Capture phase)

document.addEventListener("pointermove", (e) => {
    if (!isDragging) return;
    
    const dx = e.clientX - startMouseX;
    const dy = e.clientY - startMouseY;
    
    player.style.left = (startPlayerX + dx) + "px";
    player.style.top = (startPlayerY + dy) + "px";
}, { capture: true });

document.addEventListener("pointerup", () => {
    if (isDragging) {
        isDragging = false;
        dragHandle.style.cursor = 'grab';
        
        const rect = player.getBoundingClientRect();
        chrome.storage.local.set({ playerPos: { x: rect.left, y: rect.top } });
    }
}, { capture: true });