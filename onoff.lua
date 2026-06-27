-- ==========================================
-- KHAI BÁO BIẾN TOÀN CỤC (Đã đồng bộ tên biến)
-- ==========================================
local draftBarrieLeft = nil
local draftBarrieRight = nil
local draftBarrieUp = nil
local draftBarrieDown = nil

local barrieDay1 = nil
local barrieDay2 = nil
local barrieDay3 = nil
local barrieDay4 = nil

local closeNight1 = nil
local closeNight2 = nil
local closeNight3 = nil
local closeNight4 = nil

local wasNight = nil

-- ==========================================
-- HÀM UPDATE
-- ==========================================
function script:update() 
    -- 1. KHỞI TẠO DỮ LIỆU
    if not draftBarrieLeft or not draftBarrieRight or not draftBarrieUp or not draftBarrieDown then
        draftBarrieLeft = Draft.getDraft("yinx.barrie.left")
        draftBarrieRight = Draft.getDraft("yinx.barrie.right")
        draftBarrieUp = Draft.getDraft("yinx.barrie.up")
        draftBarrieDown = Draft.getDraft("yinx.barrie.down")
        
        if draftBarrieLeft and draftBarrieRight and draftBarrieUp and draftBarrieDown then
            -- Lưu frame gốc của Barrie (Mở - Lấy ở slot 1)
            barrieDay1 = draftBarrieLeft:getFrame(1)
            barrieDay2 = draftBarrieRight:getFrame(1)
            barrieDay3 = draftBarrieUp:getFrame(1)
            barrieDay4 = draftBarrieDown:getFrame(1)
            
            -- Lưu frame của Close (Đóng - Lấy ở slot 2)
            closeNight1 = draftBarrieLeft:getFrame(2)
            closeNight2 = draftBarrieRight:getFrame(2)
            closeNight3 = draftBarrieUp:getFrame(2)
            closeNight4 = draftBarrieDown:getFrame(2)
        end
    end

    -- CHẶN LỖI THIẾU DỮ LIỆU
    if not draftBarrieLeft or not draftBarrieRight or not draftBarrieUp or not draftBarrieDown or not barrieDay1 or not closeNight1 then return end

    -- 2. LOGIC THỜI GIAN (GIỮ NGUYÊN 100%)
    local currentHour = TheoTown.daytime * 24
    local isNight = (currentHour < 4 or currentHour >= 17.5)


    -- 3. LOGIC THỰC THI CHUYỂN ĐỔI (GIỮ NGUYÊN 100%)
    if isNight ~= wasNight then
        wasNight = isNight
        
        if isNight then
            draftBarrieLeft:setFrame(1, closeNight1)
            draftBarrieRight:setFrame(1, closeNight2)
            draftBarrieUp:setFrame(1, closeNight3)
            draftBarrieDown:setFrame(1, closeNight4)
        else
            draftBarrieLeft:setFrame(1, barrieDay1)
            draftBarrieRight:setFrame(1, barrieDay2)
            draftBarrieUp:setFrame(1, barrieDay3)
            draftBarrieDown:setFrame(1, barrieDay4)
        end
    end
end