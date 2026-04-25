/**
 * [src/CodeManager.js]
 * 기프트 코드 및 치트 코드를 검증하고 보상을 연결하는 관리자 클래스입니다.
 */
class CodeManager {
    constructor() {
        console.log("🎟️ [CodeManager] 코드 시스템이 활성화되었습니다.");
    }

    init() {
        // 전역에서 접근 가능하도록 함수 바인딩
        window.redeemGiftCode = this.redeemGiftCode.bind(this);
    }

    /**
     * 입력된 코드를 검증하고 통합 모듈을 통해 보상을 처리합니다.
     * ✨ [수정] 알 획득 성공 여부를 비동기로 확인하도록 async/await 적용
     */
    async redeemGiftCode() {
        const inputEl = document.getElementById('gift-code-input');
        if (!inputEl) return;

        const code = inputEl.value.trim();
        if (!code) return;

        // 일반 코드

        // 1. 중복 사용 및 데이터 구조 확인
        if (!window.masterData.usedCodes) window.masterData.usedCodes = [];
        if (window.masterData.usedCodes.includes(code)) {
            window.showToast("이미 사용된 코드입니다.", "error");
            return;
        }

        // 2. ✨ [캐릭터/알 코드] 통합 알 획득 모듈 호출
        const eggCodes = {
            "MY_NEW_FRIEND_01": "char_01",
            "MY_NEW_FRIEND_02": "char_02",
            "MY_NEW_FRIEND_04": "char_04",
            "MY_NEW_FRIEND_05": "char_05",
            "MY_NEW_FRIEND_06": "char_06",
            "MY_NEW_FRIEND_07": "char_07"
        };

        if (eggCodes[code]) {
            // ✨ [핵심 수정] 획득 성공 여부를 확인합니다.
            const success = await window.processNewEggAcquisition(eggCodes[code], 1800, 'code');
            
            // 성공했을 때만 사용 처리 및 성공 메시지 출력
            if (success) {
                this._finalizeRedemption(code, inputEl);
            }
            return;
        }

        // 특수 캐릭터 코드 처리 (ID: char_08 고슴도치 등)
        if (code === "My_lovely_hedgehog") {
            const success = await window.processNewEggAcquisition("char_08", 180, 'code');
            if (success) {
                this._finalizeRedemption(code, inputEl);
            }
            return;
        } else if (code === "MY_NEW_FRIEND_KKKota") {
            const success = await window.processNewEggAcquisition("char_10", 180, 'code');
            if (success) {
                this._finalizeRedemption(code, inputEl);
            }
            return;
        } else if (code === "MY_NEW_FRIEND_jwigjwig") {
            const success = await window.processNewEggAcquisition("char_12", 180, 'code');
            if (success) {
                this._finalizeRedemption(code, inputEl);
            }
            return;
        }

        // 3. ✨ [자산 보상 코드] 통합 자산 거래 모듈 호출
        const etherRewards = {
            "WELCOME_MOLIP": 3000,
            "ETHER_BOOST": 500,
            "TO_FRIEND": 5000,
            "reward_for_inviting_destiny": 10000,
            "reward_for_inviting_Season2": 10000,
            "reward_for_inviting_inception": 20000,
            "reward_for_inviting_FollowMe": 20000,
            "reward_for_inviting_igotoyou": 30000,
            "reward_for_inviting_Light": 30000,
            "reward_for_inviting_hugupjigup": 40000,
            "reward_for_inviting_Alone": 40000,
            "reward_for_inviting_umma": 50000,
            "reward_for_inviting_Memories": 50000
        };

        if (etherRewards[code]) {
            // 에테르 지급 성공 여부 확인
            const result = await window.processResourceTransaction({ ether: etherRewards[code] });
            
            if (result && result.success) {
                this._finalizeRedemption(code, inputEl, "보급품이 도착했습니다!");
            } else {
                window.showToast("보상 수령 중 에테르 흐름이 불안정합니다.", "error");
            }
            return;
        }

        // 4. 검증 실패 시
        window.showToast("유효하지 않은 코드입니다.", "error");


        // 특별 코드 데이터베이스 정의
        const specialVipCodes = {
            "JINAN_GIFT_CODE_0104": { charId: "char_hidden_0104", allowedUsers: ["7q7EUXaNgEqPQrGdglOt", "ZssWPRcPICGBAE6Xd9AF"] },
            "IAN_GIFT_CODE_0613": { charId: "char_hidden_0613", allowedUsers: ["7q7EUXaNgEqPQrGdglOt", "ZssWPRcPICGBAE6Xd9AF"] }
        };

        // 2. 입력된 코드가 특별 코드인지 확인
        if (specialVipCodes[code]) {
            const currentUserId = window.molipUserId; //
            const codeInfo = specialVipCodes[code];

            // 유저 ID 대조 검증
            if (!codeInfo.allowedUsers.includes(currentUserId)) {
                window.showToast("이 코드는 지정된 연구원만 사용할 수 있습니다.", "error");
                return;
            }

            // 중복 사용 체크
            if (!window.masterData.usedCodes) window.masterData.usedCodes = [];
            if (window.masterData.usedCodes.includes(code)) {
                window.showToast("이미 사용된 코드입니다.", "error");
                return;
            }

            // 조건 충족 시 알 지급
            const success = await window.processNewEggAcquisition(codeInfo.charId, 180, 'code');
            if (success) {
                this._finalizeRedemption(code, inputEl, "특별한 인연이 당신의 ID를 찾아왔습니다!");
            }
            return;
        }
    }

    /**
     * [내부 함수] 코드 사용 완료 처리 및 공통 후속 조치
     */
    _finalizeRedemption(code, inputEl, successMsg = "성공적으로 적용되었습니다!") {
        window.masterData.usedCodes.push(code); // 사용 목록 기록
        window.saveAllData(); // 변경 사항 영구 저장
        window.showToast(successMsg, "success"); // 성공 알림
        inputEl.value = ""; // 입력창 초기화
    }
}

module.exports = CodeManager;