// --- OFFSCREEN: CHỈ NHẬN LỆNH VÀ PHÁT NHẠC ---
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const audio = document.getElementById('bg-music');
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