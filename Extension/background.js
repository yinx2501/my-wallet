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