const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbx3H6ZBP77KEwMXfqdBgmpImVufFgQSAx8MtMrPxdGgp0pRYaHgvoaCji_HfvDbBMuuHQ/exec";

document.addEventListener("DOMContentLoaded", function() {
    const resultBox = document.getElementById("resultBox");
    const loader = document.getElementById("loader");

    // 1. LẤY DỮ LIỆU TỪ STORAGE NGAY LẬP TỨC
    chrome.storage.local.get(["walletData", "lastUpdate"], (res) => {
        if (res.walletData) {
            resultBox.innerHTML = res.walletData + `\n\n<small style="color:#aaa">(Cập nhật cuối: ${res.lastUpdate})</small>`;
        }
    });

    // --- TAB LOGIC ---
    const tabBtns = document.querySelectorAll(".tab-btn");
    const tabContents = document.querySelectorAll(".tab-content");

    tabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            tabBtns.forEach(b => b.classList.remove("active"));
            tabContents.forEach(c => c.classList.remove("active"));
            btn.classList.add("active");
            document.getElementById(btn.getAttribute("data-tab")).classList.add("active");
        });
    });

    // --- API LOGIC ---
    function sendReq(queryString) {
        loader.style.display = "block";
        fetch(SCRIPT_URL + "?" + queryString, { method: "GET", redirect: "follow" })
            .then(res => res.text())
            .then(text => {
                loader.style.display = "none";
                resultBox.innerHTML = text;
                // Nếu là thao tác ghi dữ liệu, ta nên cập nhật lại storage luôn
                chrome.storage.local.set({ walletData: text, lastUpdate: new Date().toLocaleTimeString() });
                clearInputs();
            })
            .catch(err => {
                loader.style.display = "none";
                resultBox.innerHTML = "❌ Lỗi: " + err;
            });
    }

    function clearInputs() {
        document.querySelectorAll('input[type="number"]').forEach(input => input.value = "");
    }

    // --- EVENT LISTENERS ---
    document.getElementById("btn-sodu").onclick = () => sendReq("readonly=true");
    document.getElementById("btn-nhatky").onclick = () => sendReq("report=log");
    document.getElementById("btn-khoanvay").onclick = () => sendReq("report=loan");
    document.getElementById("btn-xembang").onclick = () => sendReq("report=last2");
    
    document.getElementById("btn-danhdau").onclick = () => sendReq("danhdau=true");
    document.getElementById("btn-reset").onclick = () => {
        if(confirm("Xác nhận reset chu kỳ 50 ngày?")) sendReq("danhdau=reset");
    };

    document.getElementById("btn-chotso").onclick = () => {
        let q = [];
        let g = document.getElementById("inpGrab").value;
        let t = document.getElementById("inpTimo").value;
        let v = document.getElementById("inpVi").value;
        if(g) q.push("grab="+encodeURIComponent(g));
        if(t) q.push("timo="+encodeURIComponent(t));
        if(v) q.push("vi="+encodeURIComponent(v));
        q.length ? sendReq(q.join("&")) : alert("Hãy nhập ít nhất một ví!");
    };

    document.getElementById("btn-chuyen").onclick = () => {
        let f = document.getElementById("selFrom").value;
        let t = document.getElementById("selTo").value;
        let a = document.getElementById("inpChuyenTien").value;
        if(!a || f==t) return alert("Kiểm tra ví và số tiền!");
        sendReq("chuyentien="+encodeURIComponent(f+t+a));
    };

    document.getElementById("btn-ketoan").onclick = () => {
        let q = [];
        let tl = document.getElementById("inpTraLuon").value;
        let ts = document.getElementById("inpTraSau").value;
        if(tl) q.push("traluon="+encodeURIComponent(tl));
        if(ts) q.push("trasau="+encodeURIComponent(ts));
        q.length ? sendReq(q.join("&")) : alert("Nhập số liệu nợ!");
    };
});