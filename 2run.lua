local yinx_radarStations = {}

local function yinx_getStorage()
    return Util.optStorage(City.getStorage(), "yinx.radar.vertical.data")
end

-- Hàm hỗ trợ hiển thị đa ngôn ngữ
local strings = {
    title = "Radar Settings[vi]Cài đặt Radar[zh]雷达设置[in]Pengaturan Radar",
    -- Sử dụng {1} và {2} làm placeholder để thay thế giá trị sau này
    desc = "Current scan range is {1} tiles.\nDo you want to change it to {2} tiles?[vi]Khoảng cách quét hiện tại là {1} ô.\nBạn có muốn đổi thành {2} ô không?[zh]当前扫描范围为 {1} 格。\n你想把它改成 {2} 格吗？[in]Jangkauan pindai saat ini adalah {1} ubin.\nApakah Anda ingin mengubahnya menjadi {2} ubin?",
    btn_cancel = "Cancel[vi]Hủy[zh]取消[in]Batal",
    btn_change = "Change[vi]Thay đổi[zh]更改[in]Ubah",
    toast_success = "Scan range changed to: {1} tiles[vi]Đã chuyển khoảng cách quét: {1} ô[zh]扫描范围已更改为：{1} 格[in]Jangkauan pindai diubah menjadi: {1} ubin",
    toast_error = "Unknown error: Cannot load station![vi]Lỗi không xác định: Không thể nạp trạm![zh]未知错误：无法加载雷达站！[in]Kesalahan tidak diketahui: Tidak dapat memuat stasiun!"
}
local function yinx_getText(key, val1, val2)
    local text = strings[key] or key
    
    -- Tự động thay thế {1} bằng val1 và {2} bằng val2 nếu có
    if val1 then text = string.gsub(text, "{1}", tostring(val1)) end
    if val2 then text = string.gsub(text, "{2}", tostring(val2)) end
    
    return TheoTown.translateInline(text)
end

local function yinx_initStation(x, y)
    local id = x .. "_" .. y
    if not yinx_radarStations[id] then
        local storage = yinx_getStorage()
        local savedOffsetX = storage[id] or 1
        
        yinx_radarStations[id] = { 
            x = x, y = y, 
            lastCount = {up = 0, down = 0}, 
            resetTime = 0, 
            isTriggered = false,
            offsetX = savedOffsetX 
        }
    end
end

function script:build(x, y) yinx_initStation(x, y) end
function script:daily(x, y) yinx_initStation(x, y) end

function script:remove(x, y)
    local id = x .. "_" .. y
    yinx_radarStations[id] = nil
    
    local storage = yinx_getStorage()
    storage[id] = nil
end

function script:click(x, y, level)
    local rootX, rootY = Tile.getBuildingXY(x, y)
    rootX = rootX or x
    rootY = rootY or y
    
    local id = rootX .. "_" .. rootY
    
    if not yinx_radarStations[id] then
        yinx_initStation(rootX, rootY)
    end
    
    local station = yinx_radarStations[id]
    
    if station then
        local nextOffsetX = station.offsetX + 1
        if nextOffsetX > 4 then
            nextOffsetX = 1
        end
        
        local dialog
        dialog = GUI.createDialog{
            title = yinx_getText("title"),
            text = yinx_getText("desc", station.offsetX, nextOffsetX),
            actions = {
                {
                    text = yinx_getText("btn_cancel"),
                    onClick = function()
                        if dialog then dialog:close() end
                    end
                },
                {
                    text = yinx_getText("btn_change"),
                    onClick = function()
                        station.offsetX = nextOffsetX
                        
                        local storage = yinx_getStorage()
                        storage[id] = station.offsetX
                        
                        Debug.toast(yinx_getText("toast_success", station.offsetX))
                        if dialog then dialog:close() end
                    end
                }
            }
        }
        
    else
        Debug.toast(yinx_getText("toast_error"))
    end
    
    return false
end

local yinx_tickCounter = 0

function script:update()
    yinx_tickCounter = yinx_tickCounter + 1
    if yinx_tickCounter % 10 ~= 0 then 
        return 
    end
    local currentTime = City.getTime() 

    for id, station in pairs(yinx_radarStations) do
        
        local roadX = station.x - station.offsetX
        
        local countUp = Tile.getRoadCarCount(roadX, station.y - 3, 2) or 0
        local countDown = Tile.getRoadCarCount(roadX, station.y + 3, 2) or 0

        if countUp ~= station.lastCount.up or countDown ~= station.lastCount.down then
            
            if countUp > station.lastCount.up or countDown > station.lastCount.down then
                Tile.setBuildingFrame(station.x, station.y, math.random(1, 2))
                station.resetTime = currentTime + 10000
                station.isTriggered = true
            else
                if countUp == 0 and countDown == 0 then
                    Tile.setBuildingFrame(station.x, station.y, 0)
                end
            end

            station.lastCount.up = countUp
            station.lastCount.down = countDown
            
        end

        if station.isTriggered and currentTime >= station.resetTime then
            Tile.setBuildingFrame(station.x, station.y, 0) 
            station.isTriggered = false             
        end
    end
end
