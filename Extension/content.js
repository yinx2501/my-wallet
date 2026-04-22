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

// 5. CHỨC NĂNG KÉO THẢ TỰ DO (ĐÃ FIX LỖI TRÔI NHANH)
let isDragging = false;
let startMouseX = 0, startMouseY = 0;
let startPlayerX = 0, startPlayerY = 0;

dragHandle.addEventListener("mousedown", (e) => {
    isDragging = true;
    
    // Ghi nhận vị trí con trỏ chuột lúc bắt đầu bấm
    startMouseX = e.clientX;
    startMouseY = e.clientY;
    
    // Lấy tọa độ thực tế của khung nhạc ngay lúc đó
    const rect = player.getBoundingClientRect();
    startPlayerX = rect.left;
    startPlayerY = rect.top;
    
    // Ép khung nhạc chuyển sang dùng left/top tuyệt đối ngay lập tức
    player.style.bottom = 'auto';
    player.style.right = 'auto';
    player.style.left = startPlayerX + 'px';
    player.style.top = startPlayerY + 'px';
});

document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    e.preventDefault(); // Ngăn bôi đen chữ trên web khi đang kéo
    
    // Tính toán khoảng cách chuột đã di chuyển
    const dx = e.clientX - startMouseX;
    const dy = e.clientY - startMouseY;
    
    // Cộng khoảng cách đó vào tọa độ ban đầu của khung
    player.style.left = (startPlayerX + dx) + "px";
    player.style.top = (startPlayerY + dy) + "px";
});

document.addEventListener("mouseup", () => {
    if (isDragging) {
        isDragging = false;
        
        // Lưu lại vị trí cuối cùng vào bộ nhớ để mở tab mới nó nằm đúng chỗ
        const rect = player.getBoundingClientRect();
        chrome.storage.local.set({ playerPos: { x: rect.left, y: rect.top } });
    }
});