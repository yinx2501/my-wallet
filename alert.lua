local activeSelection = nil 
local yinx_alertStations = {}
local tick = 0

-- Cấu hình thiết bị (GIỮ NGUYÊN)
local deviceConfig = {
    ["yinx.alert1"] = 0, ["yinx.alert2"] = 0, ["yinx.alert3"] = 0, ["yinx.alert4"] = 0,
    ["yinx.alert5"] = 2, ["yinx.alert6"] = 2, ["yinx.alert7"] = 2, ["yinx.alert8"] = 2
}

-- (GIỮ NGUYÊN)
local strings = {
    select_device = "Alert Board: Select device: {1}_{2}. Select road tile![vi]Alert Board: Chọn thiết bị: {1}_{2}. Chọn ô đường![zh]Alert Board: 选择设备: {1}_{2}. 选择道路格子![in]Alert Board: Pilih perangkat: {1}_{2}. Pilih ubin jalan",
    device_lost = "Alert Board: Device lost, cleaning memory.[vi]Alert Board: Phát hiện thiết bị mất, xóa tọa độ.[zh]Alert Board: 检测到设备丢失，正在清理内存。[in]Alert Board: Perangkat hilang, membersihkan memori.",
    assigned = "Alert Board: Assigned: {1}. Monitoring: {2}_{3}[vi]Alert Board: Đã gán: {1}. Đang quét: {2}_{3}[zh]Alert Board: 已分配: {1}. 正在扫描: {2}_{3}[in]Alert Board: Ditugaskan: {1}. Memantau: {2}_{3}"
}

-- (GIỮ NGUYÊN)
local function yinx_getText(key, val1, val2, val3, val4)
    local text = strings[key] or key
    if val1 then text = string.gsub(text, "{1}", tostring(val1)) end
    if val2 then text = string.gsub(text, "{2}", tostring(val2)) end
    if val3 then text = string.gsub(text, "{3}", tostring(val3)) end
    if val4 then text = string.gsub(text, "{4}", tostring(val4)) end
    return TheoTown.translateInline(text)
end

-- (GIỮ NGUYÊN)
local function yinx_getStorage()
    return Util.optStorage(City.getStorage(), "yinx.alert.device.data")
end

-- ĐÃ THAY ĐỔI: Bỏ load lastCount từ file save
local function yinx_initStation(x, y)
    local id = x .. "_" .. y
    if not yinx_alertStations[id] then
        local storage = yinx_getStorage()
        local savedStr = storage[id]
        
        if savedStr then
            -- Mẹo tương thích ngược: String match vẫn đọc được save cũ (bỏ qua thông số thứ 4)
            local tx, ty, lvl = string.match(savedStr, "([^_]+)_([^_]+)_([^_]+)")
            if tx and ty then
                yinx_alertStations[id] = {
                    x = x, y = y,
                    tx = tonumber(tx), ty = tonumber(ty), 
                    lvl = tonumber(lvl) or 0,
                    lastCount = 0,       -- Luôn set bằng 0 khi load lại RAM
                    resetTime = 0,       
                    isTriggered = false  
                }
            end
        end
    end
end

-- Quét danh sách thiết bị khi vào game để nạp vào RAM (GIỮ NGUYÊN)
function script:init()
    local storage = yinx_getStorage()
    for id, _ in pairs(storage) do
        local sx, sy = string.match(id, "([^_]+)_([^_]+)")
        if sx and sy then
            yinx_initStation(tonumber(sx), tonumber(sy))
        end
    end
end

function script:build(x, y) yinx_initStation(x, y) end
function script:daily(x, y) yinx_initStation(x, y) end

-- (GIỮ NGUYÊN)
function script:click(x, y, level)
    local building = Tile.getBuildingDraft(x, y)
    local id = building and building:getId()
    
    if id and deviceConfig[id] then
        local scanLevel = deviceConfig[id]
        activeSelection = {x = x, y = y, level = level}
        Debug.toast(yinx_getText("select_device", x, y))
        return true
    end
    return true
end

-- ĐÃ THAY ĐỔI: Không lưu số lượng xe (lastCount) xuống storage nữa
function script:earlyTap(tileX, tileY, x, y)
    if activeSelection ~= nil then
        local id = activeSelection.x .. "_" .. activeSelection.y
        local building = Tile.getBuildingDraft(activeSelection.x, activeSelection.y)
        local idDraft = building and building:getId()
        
        if idDraft and deviceConfig[idDraft] then
            local scanLevel = deviceConfig[idDraft]
            
            Tile.setBuildingFrame(activeSelection.x, activeSelection.y, 0)
            
            local storage = yinx_getStorage()
            -- Bỏ format 4 tham số, chỉ giữ lại 3 (x, y, level)
            storage[id] = string.format("%s_%s_%s", tostring(tileX), tostring(tileY), tostring(scanLevel))
            
            yinx_alertStations[id] = nil
            yinx_initStation(activeSelection.x, activeSelection.y)
            
            Debug.toast(yinx_getText("assigned", id, tileX, tileY))
        end
        
        activeSelection = nil
        return false 
    end
    return true
end

-- ĐÃ THAY ĐỔI: Loại bỏ hoàn toàn needSave và phần ghi storage
function script:update()
    tick = tick + 1
    if tick % 20 ~= 0 then return end 
    
    local currentTime = City.getTime()
    local storage = yinx_getStorage()
    local isHeavyCheckCycle = (tick % 200 == 0) 

    for id, station in pairs(yinx_alertStations) do
        local isValid = true
        
        if isHeavyCheckCycle then
            local building = Tile.getBuildingDraft(station.x, station.y)
            local idDraft = building and building:getId()
            if not (idDraft and deviceConfig[idDraft]) then
                isValid = false
            end
        end

        if isValid then
            local currentCount = Tile.getRoadCarCount(station.tx, station.ty, station.lvl) or 0
            if currentCount ~= station.lastCount then
                if currentCount > station.lastCount then
                    local randomFrame = math.random(1, 2)
                    Tile.setBuildingFrame(station.x, station.y, randomFrame)
                    station.resetTime = currentTime + 11000
                    station.isTriggered = true
                end
                -- Chỉ lưu lastCount trên RAM, không gọi xuống ổ cứng
                station.lastCount = currentCount
            end

            if station.isTriggered and currentTime >= station.resetTime then
                Tile.setBuildingFrame(station.x, station.y, 0)
                station.isTriggered = false
            end

        else
            Tile.setBuildingFrame(station.x, station.y, 0)
            yinx_alertStations[id] = nil
            storage[id] = nil 
            Debug.toast(yinx_getText("device_lost"))
        end
    end
end