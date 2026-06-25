local WEATHER_FRAME_MAP = {
    [290373] = 0, 
    [849711] = 1, 
    [622697] = 2  
}

local billboardList = {}

local weatherNames = {
    [290373] = "Beautiful Sunny[vi]Trời Nắng Đẹp[in]Cuaca Cerah",
    [849711] = "Light Rain[vi]Có Mưa Nhỏ[in]Hujan Ringan",
    [622697] = "Thunder[vi]Mưa Bão Sấm Sét[in]Badai Petir"
}

local fogNames = {
    [0] = "No Fog[vi]Không Sương Mù[in]Tanpa Kabut",
    [1] = "Fog[vi]Có Sương Mù[in]Berkabut"
}

local strings = {
    forecast = "Upcoming weather forecast: {1} & {2} in {3} days![vi]Dự báo thời tiết sắp tới: {1} & {2} trong {3} ngày![in]Prakiraan cuaca mendatang: {1} & {2} dalam {3} hari!",
}

local currentWeatherTime = 290373 
local currentFog = 0              
local daysPassed = 0              
local changeInterval = 2 
local lastUpdatedDay = -1 
local nextWeatherTime = 290373
local nextFog = 0
local nextChangeInterval = 5

local function yinx_trans(key, val1, val2, val3)
    local str = strings[key] or key
    if val1 then str = string.gsub(str, "{1}", tostring(val1)) end
    if val2 then str = string.gsub(str, "{2}", tostring(val2)) end
    if val3 then str = string.gsub(str, "{3}", tostring(val3)) end
    return TheoTown.translateInline(str)
end

local function forceUpdateBillboard(x, y, frame)
    Tile.setBuildingFrame(x, y, frame)
end

function script:build(x, y) 
    local building = Tile.getBuildingDraft(x, y)
    if building and building:getId() == "weather.billboard" then
        billboardList[x .. "_" .. y] = {x = x, y = y}
        forceUpdateBillboard(x, y, WEATHER_FRAME_MAP[currentWeatherTime])
    end
end

function script:daily(x, y) 
    local building = Tile.getBuildingDraft(x, y)
    if building and building:getId() == "weather.billboard" then
        billboardList[x .. "_" .. y] = {x = x, y = y}
        forceUpdateBillboard(x, y, WEATHER_FRAME_MAP[currentWeatherTime])
    end
end

function script:enterCity()
    currentWeatherTime = 290373
    currentFog = 0
    changeInterval = 2 
    daysPassed = 0     
    
    City.setFunVar("weatherLocked", 1) 
    City.setFunVar("weatherTime", currentWeatherTime)
    City.setFunVar("weatherFog", currentFog)
    
    lastUpdatedDay = -1 

    for id, station in pairs(billboardList) do
        local building = Tile.getBuildingDraft(station.x, station.y)
        if building and building:getId() == "weather.billboard" then
            forceUpdateBillboard(station.x, station.y, 0)
        else
            billboardList[id] = nil
        end
    end
    
    local randWeather = math.random(1, 100)
    if randWeather <= 70 then nextWeatherTime = 290373
    else nextWeatherTime = 849711 end
    
    nextFog = (math.random(1, 100) <= 20) and 1 or 0
    nextChangeInterval = math.random(5, 20)
    
end

function script:nextDay()
    local currentDay = City.getDay()
    if lastUpdatedDay == currentDay then return end
    lastUpdatedDay = currentDay

    daysPassed = daysPassed + 1
    
    if daysPassed == changeInterval - 1 then
        Debug.toast(yinx_trans("forecast", TheoTown.translateInline(weatherNames[nextWeatherTime]), TheoTown.translateInline(fogNames[nextFog]), nextChangeInterval))
    end
    
    if daysPassed >= changeInterval then
        currentWeatherTime = nextWeatherTime
        currentFog = nextFog
        changeInterval = nextChangeInterval
        
        City.setFunVar("weatherTime", currentWeatherTime)
        City.setFunVar("weatherFog", currentFog)
        
        local targetFrame = WEATHER_FRAME_MAP[currentWeatherTime]
        
        for id, station in pairs(billboardList) do
            local building = Tile.getBuildingDraft(station.x, station.y)
            if building and building:getId() == "weather.billboard" then
                forceUpdateBillboard(station.x, station.y, targetFrame)
            else
                billboardList[id] = nil
            end
        end
        
        local randWeather = math.random(1, 100)
        if randWeather <= 70 then nextWeatherTime = 290373
        elseif randWeather <= 98 then nextWeatherTime = 849711
        else nextWeatherTime = 622697 end
        
        nextFog = (math.random(1, 100) <= 20) and 1 or 0
        nextChangeInterval = (nextWeatherTime == 622697) and 2 or math.random(7, 25)
        
        daysPassed = 0
    end
end
