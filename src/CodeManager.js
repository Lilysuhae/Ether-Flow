/**
 * [src/CodeManager.js]
 * 기프트 코드 및 치트 코드를 전문적으로 처리하는 관리자 클래스
 */
class CodeManager {
    constructor() {
        console.log("🎟️ [CodeManager] 코드 시스템이 활성화되었습니다.");
    }

    init() {
        window.redeemGiftCode = this.redeemGiftCode.bind(this);
    }

    /**
     * 입력된 코드를 검증하고 보상을 처리합니다.
     */
    redeemGiftCode() {
        const inputEl = document.getElementById('gift-code-input');
        if (!inputEl) return;

        const code = inputEl.value.trim();
        const currentId = window.molipUserId;

        if (!code) return;

        // 1. 중복 사용 확인
        if (!window.masterData.usedCodes) window.masterData.usedCodes = [];
        if (window.masterData.usedCodes.includes(code)) {
            window.showToast("이미 사용된 코드입니다.", "error");
            return;
        }

        let rewardMail = null;

        // 2. 코드 및 대상 검증 분기
        if (code === "WELCOME_MOLIP" && currentId === "7kX9pZ2mN5qL1vR8jW3n") {
            rewardMail = {
                id: `gift_${Date.now()}`,
                title: "🧪 특별 보급품: 연구 지원금",
                sender: "학회 지부장",
                content: "연금술사님, 아티스트님의 복귀를 환영하며 특별 연구 지원금을 보냅니다.",
                receivedDate: new Date().toISOString(),
                isRead: false,
                isRewardClaimed: false,
                reward: { type: 'point', value: 3000 }
            };
        } 
        else if (code === "ETHER_BOOST") {
            rewardMail = {
                id: `gift_${Date.now()}`,
                title: "⚡ 긴급 에테르 보급",
                sender: "에테르 관리국",
                content: "실린더 농도 유지를 위한 긴급 에테르 보급품입니다.",
                receivedDate: new Date().toISOString(),
                isRead: false,
                isRewardClaimed: false,
                reward: { type: 'point', value: 500 }
            };
        }
        else if (code === "TO_FRIEND") {
            rewardMail = {
                id: `gift_${Date.now()}`,
                title: "⚡ 긴급 에테르 보급",
                sender: "에테르 관리국",
                content: "실린더 농도 유지를 위한 긴급 에테르 보급품입니다.",
                receivedDate: new Date().toISOString(),
                isRead: false,
                isRewardClaimed: false,
                reward: { type: 'point', value: 5000 }
            };
        } 
        // --- 캐릭터 선물 코드 구역 ---
        else if (code === "MY_NEW_FRIEND_01") {
            this.processEggGift(code, "char_01", 1800);
            inputEl.value = "";
            return;
        }
        else if (code === "MY_NEW_FRIEND_02") {
            this.processEggGift(code, "char_02", 1800);
            inputEl.value = "";
            return;
        }
        else if (code === "MY_NEW_FRIEND_04") {
            this.processEggGift(code, "char_04", 1800);
            inputEl.value = "";
            return;
        }
        else if (code === "MY_NEW_FRIEND_05") {
            this.processEggGift(code, "char_05", 1800);
            inputEl.value = "";
            return;
        }
        else if (code === "MY_NEW_FRIEND_06") {
            this.processEggGift(code, "char_06", 1800);
            inputEl.value = "";
            return;
        }
        else if (code === "MY_NEW_FRIEND_07") {
            this.processEggGift(code, "char_07", 1800);
            inputEl.value = "";
            return;
        }
        else if (code === "My_lovely_hedgehog") {
            this.processEggGift(code, "char_08", 1800);
            inputEl.value = "";
            return;
        }

        // 3. 서신 형태의 보상 처리
        if (rewardMail) {
            window.mailbox.receivedMails.unshift(rewardMail);
            window.masterData.usedCodes.push(code);
            
            window.saveAllData(); 
            window.updateMailNotification();
            if (window.renderMailList) window.renderMailList();
            
            window.showToast("서신함으로 보급품이 도착했습니다!", "success");
            inputEl.value = "";
        } else {
            window.showToast("유효하지 않은 코드이거나 대상자가 아닙니다.", "error");
        }
    }

    /**
     * 알(Egg) 형태의 보상을 공통으로 처리하는 헬퍼 메서드
     */
    processEggGift(code, targetCharId, hatchTime) {
        const targetChar = window.charData.characters.find(c => c.id === targetCharId);
        if (!targetChar) return;

        const isOwned = window.collection.ownedIds.includes(targetCharId);
        const isHatching = window.collection.activeEgg && window.collection.activeEgg.type === targetCharId;

        if (isOwned || isHatching) {
            window.showToast("이미 연구실에 존재하거나 부화 중인 생명입니다.", "warning");
            return;
        }

        window.collection.activeEgg = {
            type: targetCharId,
            progress: 0,
            target: hatchTime,
            date: new Date().toISOString()
        };

        window.currentPartner = targetChar;
        window.masterData.usedCodes.push(code);
        window.saveAllData();
        
        if (window.triggerSupernovaEffect) window.triggerSupernovaEffect(targetChar);
        window.showToast(`${targetChar.egg_name}을(를) 선물 받았습니다!`, "success");
    }
}

module.exports = CodeManager;