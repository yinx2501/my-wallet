// 1. TẠO GIAO DIỆN CHÈN VÀO TRANG WEB
const player = document.createElement('div');
player.id = 'mw-floating-player';
player.innerHTML = `
  <div id="mw-drag-handle">🎵 Khúc Nhạc Thư Giãn</div>
  <div id="mw-controls">
    <button id="mw-play-btn">▶</button>
    <input type="range" id="mw-volume-slider" min="0" max="100" value="15">
    <button id="mw-unlock-btn" title="Mở khóa chuột phải & Copy">🔓</button>
  </div>
`;
document.body.appendChild(player);

// 2. LẤY CÁC PHẦN TỬ (Sau khi đã chèn vào Body)
const btnUnlock = document.getElementById('mw-unlock-btn');
const btnPlay = document.getElementById('mw-play-btn');
const sliderVol = document.getElementById('mw-volume-slider');
const dragHandle = document.getElementById('mw-drag-handle');

let isUnlockActive = false;
let isPlaying = false;

// --- PHẦN 2: LOGIC MỞ KHÓA ---
const unlockHandler = (e) => {
    e.stopPropagation();
    e.stopImmediatePropagation();
    return true;
};

function toggleUnlock() {
    isUnlockActive = !isUnlockActive;
    
    if (isUnlockActive) {
        btnUnlock.style.background = "rgba(76, 175, 80, 0.5)"; 
        btnUnlock.innerText = "🔒";
        
        ["contextmenu", "copy", "paste", "selectstart", "mousedown", "mouseup"].forEach(type => {
            document.addEventListener(type, unlockHandler, true);
        });

        if (!document.getElementById('mw-unlock-css')) {
            const style = document.createElement('style');
            style.id = 'mw-unlock-css';
            style.innerHTML = `
                * { 
                    -webkit-user-select: text !important; 
                    -moz-user-select: text !important; 
                    -ms-user-select: text !important; 
                    user-select: text !important; 
                    cursor: auto !important; 
                }
            `;
            document.head.appendChild(style);
        }
    } else {
        btnUnlock.style.background = "rgba(255, 255, 255, 0.1)";
        btnUnlock.innerText = "🔓";

        ["contextmenu", "copy", "paste", "selectstart", "mousedown", "mouseup"].forEach(type => {
            document.removeEventListener(type, unlockHandler, true);
        });

        const style = document.getElementById('mw-unlock-css');
        if (style) style.remove();
    }
}

// Kiểm tra an toàn trước khi gán sự kiện
if (btnUnlock) btnUnlock.onclick = toggleUnlock;

// --- PHẦN 3: LOGIC NHẠC & ĐỒNG BỘ ---

function updatePlayButtonUI(playing) {
    isPlaying = playing;
    btnPlay.innerText = playing ? "⏸" : "▶";
    btnPlay.style.background = playing ? "#f44336" : "#4caf50";
}

chrome.storage.local.get(['isPlaying', 'userVolume', 'playerPos'], (res) => {
    if (res.userVolume !== undefined) sliderVol.value = res.userVolume;
    isPlaying = res.isPlaying || false;
    updatePlayButtonUI(isPlaying);

    if (res.playerPos) {
        player.style.bottom = 'auto';
        player.style.right = 'auto';
        player.style.left = res.playerPos.x + 'px';
        player.style.top = res.playerPos.y + 'px';
    }
});

btnPlay.onclick = () => {
    const newState = !isPlaying;
    chrome.storage.local.set({ isPlaying: newState, isManuallyPaused: !newState });
    chrome.runtime.sendMessage({ from: 'content', action: 'toggle', isPausing: !newState });
};

sliderVol.oninput = (e) => {
    const val = e.target.value;
    chrome.storage.local.set({ userVolume: val });
    chrome.runtime.sendMessage({ from: 'content', action: 'volume', value: val / 100 });
};

chrome.storage.onChanged.addListener((changes) => {
    if (changes.isPlaying) updatePlayButtonUI(changes.isPlaying.newValue);
    if (changes.userVolume) sliderVol.value = changes.userVolume.newValue;
    if (changes.playerPos) {
        player.style.left = changes.playerPos.newValue.x + 'px';
        player.style.top = changes.playerPos.newValue.y + 'px';
    }
});

// --- PHẦN 4: KÉO THẢ (Dùng pointerdown) ---
let isDragging = false;
let startMouseX = 0, startMouseY = 0;
let startPlayerX = 0, startPlayerY = 0;

dragHandle.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    isDragging = true;
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
    e.stopPropagation(); 
}, { capture: true });

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