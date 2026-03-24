function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Sheet1");

  // --- 1. CẤU HÌNH CỘT ---
  var colMap = { "grab": 2, "timo": 3, "vi": 4 };
  var vnNames = { "grab": "Grab", "timo": "Timo", "vi": "Tiền mặt" };
  var COL_TOTAL_COMPARE = 9;  
  var COL_TOTAL_DISPLAY = 15; 
  var COL_LOG = 16;           
  
  var allParams = Object.keys(e.parameter);
  var allowedKeys = ["report", "readonly", "grab", "timo", "vi", "_", "traluon", "trasau", "chuyentien", "danhdau"];
  
  if (allParams.length === 0) return ContentService.createTextOutput("⚠️ Không có dữ liệu.").setMimeType(ContentService.MimeType.TEXT);

  // --- 2. BỘ LỌC BẢO MẬT (ĐÃ SIẾT CHẶT GIÁ TRỊ) ---
  for (var i = 0; i < allParams.length; i++) {
    var k = allParams[i].toLowerCase();
    var val = e.parameter[allParams[i]].toString().trim();
    if (allowedKeys.indexOf(k) === -1) return ContentService.createTextOutput("⚠️ LỖI: Tham số '" + k + "' không hợp lệ.").setMimeType(ContentService.MimeType.TEXT);
    if (val === "") return ContentService.createTextOutput("⚠️ LỖI: Giá trị của '" + k + "' không được để trống.").setMimeType(ContentService.MimeType.TEXT);
    
    // Chặn nghiêm ngặt giá trị của readonly, danhdau và report
    if (k === "readonly" && val !== "true") return ContentService.createTextOutput("⚠️ LỖI: Giá trị của 'readonly' chỉ được phép là 'true'.").setMimeType(ContentService.MimeType.TEXT);
    if (k === "report" && val !== "log" && val !== "loan" && val !== "last2") return ContentService.createTextOutput("⚠️ LỖI: Giá trị của 'report' chỉ được phép là 'log', 'loan' hoặc 'last2'.").setMimeType(ContentService.MimeType.TEXT);
    if (k === "danhdau" && val !== "true" && val !== "reset") return ContentService.createTextOutput("⚠️ LỖI: Giá trị của 'danhdau' chỉ được phép là 'true' hoặc 'reset'.").setMimeType(ContentService.MimeType.TEXT);

        if (colMap.hasOwnProperty(k) || k === 'traluon' || k === 'trasau' || k === 'chuyentien') {
      var rawNum = "";
      if (k === 'chuyentien') {
        rawNum = val.replace(/[^0-9]/g, ""); 
        if (rawNum.length < 3) return ContentService.createTextOutput("⚠️ LỖI: Cú pháp chuyentien quá ngắn.").setMimeType(ContentService.MimeType.TEXT);
      } else {
        // Cho phép thêm mã bí mật 51098 đi qua bộ lọc
        rawNum = val.replace('250198', '').replace('51098', '').replace(/[^0-9.-]/g, "");
      }

      
      if (rawNum === "" || isNaN(parseFloat(rawNum))) return ContentService.createTextOutput("⚠️ LỖI: Giá trị '" + val + "' không phải là số.").setMimeType(ContentService.MimeType.TEXT);
    }
  }

// --- 2.5. XỬ LÝ ĐÁNH DẤU SHEET 2 (BẢN TỐI ƯU TỐC ĐỘ MAX) ---
  if (allParams.indexOf('danhdau') !== -1 || allParams.indexOf('danhDau') !== -1) {
    var sheet2 = ss.getSheetByName("Sheet2"); 
    var valDanhDau = e.parameter['danhdau'] ? e.parameter['danhdau'].toString().trim().toLowerCase() : "";
    
    // ---------------------------------------------------------
    // KỊCH BẢN 1: NẾU TRUYỀN LỆNH RESET -> TẠO 51 NGÀY MỚI
    // ---------------------------------------------------------
    if (valDanhDau === "reset") {
      var newDays = [];
      var baseDate = new Date(); 
      
      for (var j = 0; j <= 50; j++) {
        var tempD = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() + j);
        newDays.push([formatDateStr(tempD), false]); 
      }
      
      // Ghi đè trực tiếp lên 51 dòng
      sheet2.getRange(2, 1, 51, 2).setValues(newDays);
      
      // [THAY ĐỔI TẠI ĐÂY]: Rút ngày cuối cùng từ mảng ra để in thông báo
      var endDateStr = newDays[newDays.length - 1][0];
      
      var thongBao = "🔄 ĐÃ RESET CHU KỲ\n" +
                 "────────────────\n" + 
                 "📅 Bắt đầu: " + formatDateStr(baseDate) + "\n" +
                 "🏁 Kết thúc: " + endDateStr + "\n" +
                 "🚀 Hệ thống đã sẵn sàng!";

  return ContentService.createTextOutput(thongBao)
    .setMimeType(ContentService.MimeType.TEXT);
}
    // ---------------------------------------------------------
    // KỊCH BẢN 2: NẾU TRUYỀN LỆNH TRUE -> ĐÁNH DẤU NGÀY HÔM NAY
    // ---------------------------------------------------------
    if (valDanhDau === "true") {
      // [TỐI ƯU TỐC ĐỘ]: Chỉ kéo dữ liệu 2 cột A và B (52 dòng) lên RAM
      var data2 = sheet2.getRange("A1:B52").getDisplayValues(); 
      var foundRow = -1;
      
      var now = new Date();
      var todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      
      for (var r = 1; r < data2.length; r++) { 
        if (!data2[r][0]) continue; // Bỏ qua nếu là dòng trống
        var d = parseDate(data2[r][0]);
        if (d && d.getTime() === todayStart) {
          foundRow = r + 1;
          break;
        }
      }
      
      if (foundRow === -1) {
        return ContentService.createTextOutput("⚠️ Vượt quá thời gian, vui lòng kiểm tra thủ công").setMimeType(ContentService.MimeType.TEXT);
      }
      
      var isAlreadyChecked = (data2[foundRow - 1][1].toString().toUpperCase() === 'TRUE');
      if (isAlreadyChecked) {
        return ContentService.createTextOutput("⚠️ CẢNH BÁO: Hôm nay bạn đã đánh dấu rồi!\nVui lòng vào trực tiếp file MyWallet (Sheet2) để chỉnh sửa thủ công nếu cần.").setMimeType(ContentService.MimeType.TEXT);
      } else {
        sheet2.getRange(foundRow, 2).setValue(true); 
      }
      
      SpreadsheetApp.flush(); 
      var summaryVals = sheet2.getRange("C2:F2").getDisplayValues()[0];
      
      var responseMsg = "✅ ĐÃ GHI LẠI THÀNH CÔNG\n──────────────\n" +
                        "💰 Tổng tiền đã gửi: " + summaryVals[1] + "\n" +
                        "📅 Tổng ngày đã gửi: " + summaryVals[0] + "\n" +
                        "⏳ Tổng ngày còn lại: " + summaryVals[2] + "\n" +
                        "📉 Tổng tiền còn lại: " + summaryVals[3];
      
      var otherParams = allParams.filter(function(k) { return k !== '_' && k.toLowerCase() !== 'danhdau'; });
      if (otherParams.length === 0) {
        return ContentService.createTextOutput(responseMsg).setMimeType(ContentService.MimeType.TEXT);
      }
    }
  }

  // --- 3. LOGIC BÙ NGÀY & LUÂN CHUYỂN NỢ ---
  autoDeleteOldData(sheet);
  var now = new Date();
  var todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  
  var row = -1;
  var lastRow = sheet.getLastRow();
  var lastDateObj = null;
  var sampleRowIdx = -1;

  if (lastRow > 0) {
    var colA = sheet.getRange(1, 1, lastRow).getDisplayValues();
    for (var i = lastRow - 1; i >= 0; i--) {
      var d = parseDate(colA[i][0]);
      if (d) {
        var dTime = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
        if (dTime === todayStart) { row = i + 1; break; }
        if (!lastDateObj) {
          lastDateObj = new Date(d.getTime());
          sampleRowIdx = i + 1;
        }
      }
    }
  }

  if (parseInt(row) === -1) {
    var runner;
    if (lastDateObj) {
      runner = new Date(lastDateObj.getTime());
      runner.setDate(runner.getDate() + 1);
    } else {
      runner = new Date();
      runner.setDate(runner.getDate() - 1);
      sampleRowIdx = (lastRow > 0) ? lastRow : 0;
    }

    var safety = 0;
    var isNewRowCreated = false;
    while (new Date(runner.getFullYear(), runner.getMonth(), runner.getDate()).getTime() <= todayStart && safety < 32) {
      var dateStr = formatDateStr(runner);
      sheet.appendRow([dateStr]);
      var newRow = sheet.getLastRow();
      
      if (sampleRowIdx > 0) {
        sheet.getRange(sampleRowIdx, 2, 1, 14).copyTo(sheet.getRange(newRow, 2));
        
        var prevVals = sheet.getRange(newRow - 1, 2, 1, 12).getValues()[0];
        var prevB = Number(prevVals[0]) || 0;  // Giá trị cột B (Grab B) hôm qua (Index 0)
        var prevE = Number(prevVals[3]) || 0;      // Giá trị cột E hôm qua (Index 3)
        var prevJ = Number(prevVals[8]) || 0;      // Giá trị cột J hôm qua (Index 8)
        var prevK = Number(prevVals[9]) || 0;      // Giá trị cột K hôm qua (Index 9)
        var prevM = Number(prevVals[11]) || 0;     // Giá trị cột M hôm qua (Index 11)
          
        sheet.getRange(newRow, 2).setValue(prevB - prevK); // B hôm nay = Grab B hôm qua - K hôm qua
        sheet.getRange(newRow, 5).setValue(prevE - prevK);     // E hôm nay = E hôm qua - K hôm qua
        sheet.getRange(newRow, 10).setValue(prevJ - prevK); 
        sheet.getRange(newRow, 11).setValue(prevM);      
      }
      
      if (new Date(runner.getFullYear(), runner.getMonth(), runner.getDate()).getTime() === todayStart) row = newRow;
      runner.setDate(runner.getDate() + 1);
      safety++;
      isNewRowCreated = true;
    }
    
    if (isNewRowCreated) {
      if (row > 3) sheet.getRange(2, COL_LOG, row - 3, 1).clearContent();
      SpreadsheetApp.flush(); 
    }
  }

  // --- 4. XỬ LÝ XEM ---
  if (e.parameter.report === "log") return ContentService.createTextOutput("📝 NHẬT KÝ\n" + (sheet.getRange(row, COL_LOG).getValue() || "Trống")).setMimeType(ContentService.MimeType.TEXT);
  if (e.parameter.report === "loan") {
    var sheet2 = ss.getSheetByName("Sheet2");
    var summaryVals = sheet2.getRange("C2:F2").getDisplayValues()[0];
    return ContentService.createTextOutput(
      "📊 THỐNG KÊ KHOẢN GỬI\n──────────────\n" +
      "💰 Tổng tiền đã gửi: " + summaryVals[1] + "\n" +
      "📅 Tổng ngày đã gửi: " + summaryVals[0] + "\n" +
      "⏳ Tổng ngày còn lại: " + summaryVals[2] + "\n" +
      "📉 Tổng tiền còn lại: " + summaryVals[3]
    ).setMimeType(ContentService.MimeType.TEXT);
  }
if (e.parameter.report === "last2") {
    var lRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();
    if (lRow < 2) return ContentService.createTextOutput("⚠️ Dữ liệu trống.").setMimeType(ContentService.MimeType.TEXT);
    
    var startRow = Math.max(2, lRow - 1); 
    var numRows = lRow - startRow + 1;
    
    // Lấy tiêu đề và dữ liệu
    var headers = sheet.getRange(1, 1, 1, lastCol).getDisplayValues()[0];
    var dataRows = sheet.getRange(startRow, 1, numRows, lastCol).getDisplayValues();
    
    // Danh sách các cột CẦN LOẠI BỎ (Số thứ tự cột: E=5, F=6, H=8, P=16)
    var excludeCols = [5, 6, 8, 16];
    
    var html = "📊 <b>CHI TIẾT 2 DÒNG CUỐI (Đã lọc)</b><br><br>";
    html += "<div style='overflow-x:auto; border-radius: 8px;'><table style='width:100%; border-collapse: collapse; font-size: 12px; text-align: center;'>";
    
    // Tạo Header (Bỏ qua cột E, F, H, P)
    html += "<tr style='background-color: #1b5e20; color: white;'>";
    for (var c = 0; c < headers.length; c++) {
      if (excludeCols.indexOf(c + 1) !== -1) continue; // Bỏ qua cột trong danh sách loại trừ
      html += "<th style='border: 1px solid #444; padding: 8px; white-space: nowrap;'>" + (headers[c] || "-") + "</th>";
    }
    html += "</tr>";
    
    // Tạo Dữ liệu (Bỏ qua cột E, F, H, P)
    for (var r = 0; r < dataRows.length; r++) {
      html += "<tr>";
      for (var c = 0; c < dataRows[r].length; c++) {
        if (excludeCols.indexOf(c + 1) !== -1) continue; // Bỏ qua cột trong danh sách loại trừ
        var cellVal = dataRows[r][c];
        html += "<td style='border: 1px solid #444; padding: 8px; white-space: nowrap; color: #00e676;'>" + cellVal + "</td>";
      }
      html += "</tr>";
    }
    html += "</table></div><br><small style='color:#888'>* Đã ẩn cột E, F, H, P để tối ưu hiển thị.</small>";
    
    return ContentService.createTextOutput(html).setMimeType(ContentService.MimeType.TEXT);
  }
  if (e.parameter.readonly === "true" || e.parameter.readOnly === "true") {
    var rowVals = sheet.getRange(row, 1, 1, COL_TOTAL_DISPLAY).getValues()[0];
    var rowDisps = sheet.getRange(row, 1, 1, COL_TOTAL_DISPLAY).getDisplayValues()[0];
    
    var diffVal = Number(rowVals[COL_TOTAL_COMPARE - 1]) || 0;
    var displayTotal = rowDisps[COL_TOTAL_DISPLAY - 1];
    var totalBook = rowDisps[6]; 
    
    var valK = rowDisps[10]; 
    var valL = rowDisps[11]; 
    var valN = rowDisps[13]; 
    
    return ContentService.createTextOutput(
      "💰 SỐ DƯ\n" +
      "🚗 Grab: " + rowDisps[1] + "\n" +
      "💳 Timo: " + rowDisps[2] + "\n" +
      "💵 Ví: " + rowDisps[3] + "\n" +
      "──────────────\n" +
      "💎 TỔNG: " + displayTotal + formatDiff(diffVal) + "\n" +
      "📔 Tổng tiền sổ sách: " + totalBook + "\n" +
      "──────────────\n" +
      "💸 Cần trả mai: " + valK + "\n" +
      "📊 Còn lại mai: " + valL + "\n" +
      "⏳ Còn cần: " + valN
    ).setMimeType(ContentService.MimeType.TEXT);
  }

// --- 5. CẬP NHẬT VÍ & KẾ TOÁN (PHIÊN BẢN TỐI ƯU TỐC ĐỘ) ---
  var walletParams = allParams.filter(function(k) { return colMap.hasOwnProperty(k.toLowerCase()); });
  var debtParams = allParams.filter(function(k) { return k.toLowerCase() === 'traluon' || k.toLowerCase() === 'trasau'; });
  var transferParams = allParams.filter(function(k) { return k.toLowerCase() === 'chuyentien'; });

  if (walletParams.length > 0 || debtParams.length > 0 || transferParams.length > 0 || moveDayParams.length > 0) {
    var timeStr = "[" + Utilities.formatDate(now, "GMT+7", "HH:mm") + "]";
    var logMsgArr = [], actionHistory = [];
    
    // [TỐI ƯU TỐC ĐỘ]: Đọc 1 lần toàn bộ dữ liệu dòng hiện tại vào RAM (từ cột 1 đến 14)
    var ramRowData = sheet.getRange(row, 1, 1, 14).getValues()[0];

        if (walletParams.length > 0) {
      walletParams.forEach(function(key) {
        var k = key.toLowerCase(), inputStr = e.parameter[key].toString().trim();
        var isSetMode = inputStr.startsWith('250198') || inputStr.startsWith('-250198');
        var isPrevDayMode = inputStr.startsWith('51098') || inputStr.startsWith('-51098');
        
        if (isPrevDayMode) {
          var valAmount = Number(inputStr.replace('51098', '').replace(/[^0-9.-]/g, ""));
          if (valAmount !== 0 && row > 2) {
            var yesterdayVal = Number(sheet.getRange(row - 1, colMap[k]).getValue()) || 0;
            sheet.getRange(row - 1, colMap[k]).setValue(yesterdayVal - valAmount);
            
            var msg = "⏪ Đã bù ngày " + vnNames[k] + ": Trừ " + Math.abs(valAmount).toLocaleString('vi-VN') + " vào hôm qua!";
            logMsgArr.push(msg);
            actionHistory.push(msg);
          }
        } else {
          var valAmount = Number(inputStr.replace('250198', '').replace(/[^0-9.-]/g, ""));
          var oldVal = Number(ramRowData[colMap[k] - 1]) || 0; 
          var finalVal = isSetMode ? valAmount : oldVal + valAmount;
          var diff = finalVal - oldVal;
          
          if (diff !== 0) {
            sheet.getRange(row, colMap[k]).setValue(finalVal); 
            ramRowData[colMap[k] - 1] = finalVal; 
            logMsgArr.push((isSetMode ? "📍 " : (diff >= 0 ? "➕ " : "➖ ")) + vnNames[k] + ": " + finalVal.toLocaleString('vi-VN') + formatDiff(diff));
            actionHistory.push((isSetMode ? "📍 " : (diff >= 0 ? "➕ " : "➖ ")) + vnNames[k] + ": " + Math.abs(diff).toLocaleString('vi-VN'));
          }
        }
      });
    }


    if (debtParams.length > 0) {
      // Trích xuất từ RAM
      var currentE = Number(ramRowData[4]) || 0; 
      var currentJ = Number(ramRowData[9]) || 0; 
      var currentK = Number(ramRowData[10]) || 0; 

      debtParams.forEach(function(key) {
        var k = key.toLowerCase(), inputStr = e.parameter[key].toString().trim();
        var valAmount = Number(inputStr.replace('250198', '').replace(/[^0-9.-]/g, ""));
        
        if (valAmount !== 0) {
          currentE += valAmount;
          currentJ += valAmount;
          
          var prefix = valAmount >= 0 ? "➕ " : "➖ ";
          var displayNum = Math.abs(valAmount).toLocaleString('vi-VN');

          if (k === 'traluon') {
            currentK += valAmount;
            logMsgArr.push(prefix + "Trả luôn: " + displayNum);
            actionHistory.push(prefix + "Trả luôn: " + displayNum);
          } else if (k === 'trasau') {
            logMsgArr.push(prefix + "Trả sau: " + displayNum);
            actionHistory.push(prefix + "Trả sau: " + displayNum);
          }
        }
      });

      sheet.getRange(row, 5).setValue(currentE);
      sheet.getRange(row, 10).setValue(currentJ);
      sheet.getRange(row, 11).setValue(currentK); 
      // Cập nhật lại RAM
      ramRowData[4] = currentE; ramRowData[9] = currentJ; ramRowData[10] = currentK;
    }

    if (transferParams.length > 0) {
      var mapLoai = { "1": "grab", "2": "timo", "3": "vi" };
      
      transferParams.forEach(function(key) {
        var valStr = e.parameter[key].toString().trim();
        var cleanStr = valStr.replace(/[^0-9]/g, ""); 
        
        if (cleanStr.length >= 3) {
          var fromCode = cleanStr.charAt(0);
          var toCode = cleanStr.charAt(1);
          
          if (mapLoai[fromCode] && mapLoai[toCode] && fromCode !== toCode) {
            var amount = Number(cleanStr.substring(2));
            if (amount > 0) {
              var fromKey = mapLoai[fromCode];
              var toKey = mapLoai[toCode];
              
              // Trích xuất từ RAM thay vì chọc vào Sheet
              var fromVal = Number(ramRowData[colMap[fromKey] - 1]) || 0;
              var toVal = Number(ramRowData[colMap[toKey] - 1]) || 0;
              
              sheet.getRange(row, colMap[fromKey]).setValue(fromVal - amount);
              sheet.getRange(row, colMap[toKey]).setValue(toVal + amount);
              
              // Cập nhật lại RAM
              ramRowData[colMap[fromKey] - 1] = fromVal - amount;
              ramRowData[colMap[toKey] - 1] = toVal + amount;
              
              var msg = "🔄 Chuyển " + amount.toLocaleString('vi-VN') + " từ " + vnNames[fromKey] + " ➔ " + vnNames[toKey];
              logMsgArr.push(msg);
              actionHistory.push(msg);
            }
          }
        }
      });
    }
    
    if (logMsgArr.length === 0) return ContentService.createTextOutput("ℹ️ Không có thay đổi nào được thực hiện.").setMimeType(ContentService.MimeType.TEXT);

    SpreadsheetApp.flush(); 
    
    var finalVals = sheet.getRange(row, 1, 1, COL_LOG).getValues()[0];
    var finalDisps = sheet.getRange(row, 1, 1, COL_TOTAL_DISPLAY).getDisplayValues()[0];
    
    var existingLog = finalVals[COL_LOG - 1] || "";
    sheet.getRange(row, COL_LOG).setValue((existingLog ? existingLog + "\n" : "") + timeStr + " " + actionHistory.join(", "));

    if (walletParams.length === 0 && transferParams.length === 0 && debtParams.length > 0) {
      return ContentService.createTextOutput("✅ ĐÃ GHI NHẬN KẾ TOÁN\n" + logMsgArr.join("\n")).setMimeType(ContentService.MimeType.TEXT);
    } else {
      var finalTotalDisplay = finalDisps[COL_TOTAL_DISPLAY - 1];
      var finalDiffVal = Number(finalVals[COL_TOTAL_COMPARE - 1]) || 0;
      var finalTotalBook = finalDisps[6]; 
      return ContentService.createTextOutput("✅ ĐÃ CẬP NHẬT\n" + logMsgArr.join("\n") + "\n──────────────\n💎 TỔNG: " + finalTotalDisplay + formatDiff(finalDiffVal) + "\n📔 Tổng tiền sổ sách: " + finalTotalBook).setMimeType(ContentService.MimeType.TEXT);
    }
  }
}

// --- HÀM HỖ TRỢ ---
function parseDate(cell) {
  if (!cell || cell === "") return null;
  var str = cell.toString();
  var parts = str.match(/\d+/g); 
  if (parts && parts.length >= 3) {
    var d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function formatDateStr(date) {
  var days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  var dd = date.getDate(), mm = date.getMonth() + 1, yyyy = date.getFullYear();
  return days[date.getDay()] + ", " + (dd < 10 ? '0' : '') + dd + "/" + (mm < 10 ? '0' : '') + mm + "/" + yyyy;
}

function autoDeleteOldData(sheet) {
  if (new Date().getDate() === 1) {
    var lastRow = sheet.getLastRow();
    if (lastRow > 16) sheet.deleteRows(2, lastRow - 16);
  }
}

function formatDiff(num) {
  if (!num || Math.abs(num) < 1) return ""; 
  return (num > 0 ? " (↑ " : " (↓ ") + Math.abs(Math.round(num)).toLocaleString('vi-VN') + ")";
}
