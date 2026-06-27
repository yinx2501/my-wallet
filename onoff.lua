
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

function script:update() 
    if not draftBarrieLeft or not draftBarrieRight or not draftBarrieUp or not draftBarrieDown then
        draftBarrieLeft = Draft.getDraft("yinx.barrie.left")
        draftBarrieRight = Draft.getDraft("yinx.barrie.right")
        draftBarrieUp = Draft.getDraft("yinx.barrie.up")
        draftBarrieDown = Draft.getDraft("yinx.barrie.down")
        
        if draftBarrieLeft and draftBarrieRight and draftBarrieUp and draftBarrieDown then

            barrieDay1 = draftBarrieLeft:getFrame(1)
            barrieDay2 = draftBarrieRight:getFrame(1)
            barrieDay3 = draftBarrieUp:getFrame(1)
            barrieDay4 = draftBarrieDown:getFrame(1)
            

            closeNight1 = draftBarrieLeft:getFrame(2)
            closeNight2 = draftBarrieRight:getFrame(2)
            closeNight3 = draftBarrieUp:getFrame(2)
            closeNight4 = draftBarrieDown:getFrame(2)
        end
    end


    if not draftBarrieLeft or not draftBarrieRight or not draftBarrieUp or not draftBarrieDown or not barrieDay1 or not closeNight1 then return end


    local currentHour = TheoTown.daytime * 24
    local isNight = (currentHour < 3 or currentHour >= 17.5)



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
