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
     */
    redeemGiftCode() {
        const inputEl = document.getElementById('gift-code-input');
        if (!inputEl) return;

        const code = inputEl.value.trim();
        if (!code) return;

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
            // 통합 모듈이 백업, 등록, UI 갱신을 모두 처리합니다.
            window.processNewEggAcquisition(eggCodes[code], 1800, 'code');
            this._finalizeRedemption(code, inputEl);
            return;
        }

        // 특수 캐릭터 코드 처리
        if (code === "My_lovely_hedgehog") {
            window.processNewEggAcquisition("char_08", 180, 'code');
            this._finalizeRedemption(code, inputEl);
            return;
        }

        // 3. ✨ [자산 보상 코드] 통합 자산 거래 모듈 호출
        const etherRewards = {
            "WELCOME_MOLIP": 3000,
            "ETHER_BOOST": 500,
            "TO_FRIEND": 5000
        };

        if (etherRewards[code]) {
            // 통합 모듈이 에테르 가산 및 실시간 UI 반영을 처리합니다.
            window.processResourceTransaction({ ether: etherRewards[code] });
            this._finalizeRedemption(code, inputEl, "보급품이 도착했습니다!");
            return;
        }

        // 4. 검증 실패 시
        window.showToast("유효하지 않은 코드입니다.", "error");
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