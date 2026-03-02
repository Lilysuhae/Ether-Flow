/* ============================================================
   [src/MolipMonitor.js]
   사용자의 활성 창 분석, 5분 부재중 감지, 캐릭터 표정 및 대사 제어, 
   그리고 연구 시간 집계를 총괄하는 연구실의 핵심 분석 엔진입니다.
   ============================================================ */

const { ipcRenderer } = require('electron'); // 시스템 유휴 시간 및 메인 프로세스 통신용

class MolipMonitor {
    constructor() {
        // [상태 관리 변수]
        this.lastIdleState = false;   // 이전 루프의 부재 상태
        this.lastStateKey = null;     // 이전 루프의 표정 키 (window.lastCharacterState와 동기화)
        
        // [트래킹 버퍼] 찰나의 감지 누락이나 펜 타블렛 포커스 튐 현상을 방지합니다.
        this.lastValidOwner = null;   // 마지막으로 확인된 유효 앱 이름
        this.nullCounter = 0;         // 감지 실패(null) 연속 횟수 카운터
    }

    /**
     * 메인 분석 엔진: renderer.js의 updateLoop에서 1초마다 호출됩니다.
     * @param {Object} activeWin - 메인 프로세스로부터 전달받은 활성 창 정보
     */
    async analyze(activeWin) {
        // 1. 시스템 기본 방어: 데이터 미로드 혹은 리셋 중에는 작동하지 않습니다.
        if (!window.masterData || window.isResetting) return false;

        /* ------------------------------------------------------------
           [STEP 1] 시스템 부재중(Away) 판정
           5분(300초) 이상 키보드/마우스/펜 입력이 없을 때 발동합니다.
           ------------------------------------------------------------ */
        const systemIdleSeconds = await ipcRenderer.invoke('get-idle-time');
        const idleLimit = window.idleLimit || 300; 
        const isNowIdle = (systemIdleSeconds >= idleLimit);

        // 전역 부재 상태 업데이트 및 동기화
        if (window.isIdle !== isNowIdle) {
            window.isIdle = isNowIdle;
        }

        const nowMolipDate = window.getMolipDate();
        
        /* ------------------------------------------------------------
           [STEP 2] 활성 창 분석 및 감지 연속성 보호 (3초 트래킹 버그 수리)
           감지가 잠깐 끊겨도 '내 연구실'로 오해하지 않고 이전 상태를 유지합니다.
           ------------------------------------------------------------ */
        let rawOwner = activeWin?.owner;

        if (!rawOwner) {
            // 감지가 안 될 때 최대 5초간은 이전 앱(예: 포토샵)을 사용 중인 것으로 간주하여 기록을 보존합니다.
            this.nullCounter++;
            if (this.nullCounter <= 5 && this.lastValidOwner) {
                rawOwner = this.lastValidOwner;
            } else {
                rawOwner = (window.isIdle ? "Away" : "Waiting...");
            }
        } else {
            this.nullCounter = 0; // 감지 성공 시 카운터 리셋
            this.lastValidOwner = rawOwner; // 유효한 앱 이름을 백업
        }

        const cleanedName = window.cleanAppName(rawOwner);
        const isSelf = this._checkIsSelf(cleanedName, rawOwner);

        // 2. UI 앱 이름 업데이트 (부재 시에는 부재중 메시지 우선 표시)
        this._updateAppNamesUI(isSelf, cleanedName);

        // UI 버튼 제어: 우리 앱일 때는 리스트 추가 버튼 비활성화
        const workAddBtn = document.querySelector('#current-app-box .btn-add-current');
        const distractAddBtn = document.querySelector('#tab-content-distract .btn-add-current');
        if (workAddBtn) { workAddBtn.disabled = isSelf; workAddBtn.style.opacity = isSelf ? "0.5" : "1"; }
        if (distractAddBtn) { distractAddBtn.disabled = isSelf; distractAddBtn.style.opacity = isSelf ? "0.5" : "1"; }

        // 3. 파트너가 없으면(계약 전) 중단
        if (!window.currentPartner) return false;

        /* ------------------------------------------------------------
           [STEP 3] 상태 판정 로직
           부재 중일 경우 모든 작업 판정을 무효화하여 기록 오염을 막습니다.
           ------------------------------------------------------------ */
        const status = this._determineStatus(activeWin, isSelf);
        
        // 집중 판정: 부재 중 아님 && 작업 도구임 && 딴짓 아님 && 자기 자신 아님
        const isFocusing = !window.isIdle && !isSelf && status.isWorking && !status.isDistraction;
        // 딴짓 판정: 부재 중 아님 && 딴짓 도구임 && 자기 자신 아님
        const isActuallyDistraction = !window.isIdle && !isSelf && status.isDistraction;

        window.isActuallyWorking = isFocusing;
        window.isDistraction = isActuallyDistraction;

        /* ------------------------------------------------------------
           [STEP 4] 캐릭터 표정 및 대사 동기화 (MolipMonitor 단독 제어)
           이미지(Expression) 키: working, distracting, good, away (JSON 규격 일치)
           대사(Dialogue) 키: work, distract, idle, return
           ------------------------------------------------------------ */
        this._syncCharacterState(isFocusing, isActuallyDistraction, window.isIdle);

        // 5. 데이터 실시간 기록 (기록 누락을 막기 위해 판정 결과를 엄격히 따릅니다)
        if (isFocusing || isActuallyDistraction) {
            this._recordData(cleanedName, isFocusing, nowMolipDate, status.matchedKey);
        }

        // 6. 상태 변화 트리거: 몰입이 끝나는 순간 즉시 데이터 저장
        if (window.lastKnownFocusState === true && isFocusing === false) {
            window.saveAllData();
        }
        window.lastKnownFocusState = isFocusing;

        // 부재 상태 기록 업데이트 (다음 루프의 복귀 대사 판정용)
        this.lastIdleState = window.isIdle;

        return isFocusing;
    }

    /**
     * 우리 앱(내 연구실)인지 확인하는 내부 메서드
     */
    _checkIsSelf(name, raw) {
        const forbidden = ["Ether Flow", "Electron", "내 연구실", "Molip", "에테르"];
        return forbidden.some(k => name.includes(k) || raw.includes(k));
    }

    /**
     * 상단 및 설정창의 앱 이름 표시 UI를 업데이트합니다.
     */
    _updateAppNamesUI(isSelf, name) {
        const appNameEl = document.getElementById('current-app-name');
        const distractNameEl = document.getElementById('current-distract-name');
        
        let displayName = isSelf ? "내 연구실" : name; 
        if (window.isIdle) displayName = "부재 중 (연구 중단)";
        else if (name === "Waiting...") displayName = "활성 창 감지 중...";
        
        if (appNameEl) appNameEl.innerText = displayName;
        if (distractNameEl) distractNameEl.innerText = displayName;
    }

    /**
     * 작업 및 딴짓 여부를 결정하는 알고리즘
     */
    _determineStatus(activeWin, isSelf) {
        if (isSelf || !activeWin) return { isWorking: false, isDistraction: false, matchedKey: null };

        const monitor = window.masterData.settings?.monitor || { workKeywords: [], distractKeywords: [] };
        const targetOwner = (activeWin.owner || "").toLowerCase();
        const targetTitle = (activeWin.title || "").toLowerCase();

        // 키워드 대조
        const matchedWorkKey = (monitor.workKeywords || []).find(k => targetOwner.includes(k.toLowerCase()) || targetTitle.includes(k.toLowerCase()));
        const matchedDistractKey = (monitor.distractKeywords || []).find(k => targetOwner.includes(k.toLowerCase()) || targetTitle.includes(k.toLowerCase()));

        // 앱 이름 대조
        const appMatchWork = (window.workApps || []).some(app => targetOwner.includes(app.toLowerCase()));
        const appMatchDistract = (window.distractionApps || []).some(app => targetOwner.includes(app.toLowerCase()));

        return {
            isWorking: appMatchWork || !!matchedWorkKey,
            isDistraction: appMatchDistract || !!matchedDistractKey,
            matchedKey: matchedWorkKey || matchedDistractKey
        };
    }

    /**
     * [핵심] 캐릭터 표정과 대사를 이미지 키값에 맞춰 완벽하게 동기화합니다.
     */
    _syncCharacterState(isFocusing, isDistraction, isIdle) {
        if (window.currentStage === 'egg' || !window.renderer) return;
        
        // 🎨 캐릭터 이미지 키 결정 (characters.json의 expressions 키값과 100% 일치시킴)
        const exprKey = isIdle ? 'away' : (isFocusing ? 'working' : (isDistraction ? 'distracting' : 'good'));
        
        // 💬 대사 카테고리 결정
        const dialogueKey = isFocusing ? 'work' : (isDistraction ? 'distract' : 'idle');

        // 상태가 실제로 변했을 때만 실행하여 리소스 낭비와 깜빡임을 방지합니다.
        if (window.lastCharacterState !== exprKey) {
            // A. 이미지(Expression) 변경 명령 전달
            if (window.renderer.setExpression) {
                window.renderer.setExpression(exprKey);
            }
            
            // B. 대사 출력 (부재에서 돌아올 때는 'return' 대사 우선)
            if (!isIdle && this.lastIdleState) {
                if (window.showRandomDialogue) window.showRandomDialogue('return');
            } else if (!isIdle || (isIdle && !this.lastIdleState)) {
                if (window.showRandomDialogue) window.showRandomDialogue(dialogueKey);
            }

            // C. 상태 기록 동기화
            window.lastCharacterState = exprKey;
            window.currentStatus = exprKey;
        }
    }

    /**
     * 연구 성과(집중 시간, 성장도, 통계)를 기록하는 로직
     */
    _recordData(name, isFocusing, date, matchedKey) {
        // 실시간 로그 기록
        const logName = matchedKey ? (isFocusing ? `🔑 ${matchedKey}` : `🚫 ${matchedKey}`) : name;
        if (window.logManager) window.logManager.recordLog(logName, isFocusing ? 'work' : 'distract');

        if (isFocusing) {
            // 1. 캐릭터 성장도 반영
            if (window.currentPartner && window.currentStage !== 'egg') {
                window.charGrowthMap[window.currentPartner.id] = (window.charGrowthMap[window.currentPartner.id] || 0) + 1;
            }
            
            // 2. 일일 통계 업데이트
            if (!window.dailyAppTimeMap[date]) window.dailyAppTimeMap[date] = {};
            window.dailyAppTimeMap[date][name] = (window.dailyAppTimeMap[date][name] || 0) + 1;
            
            // 3. 전체 집중 기록 및 1분당 포인트 지급
            if (window.progress) window.progress.recordFocus();
            if (window.progress && window.progress.totalFocusTime > 0 && window.progress.totalFocusTime % 60 === 0) {
                if (window.collection) window.collection.addPoints(1);
                window.saveAllData(); // 1분마다 정기 저장
            }
        }
    }
}

// 모듈 내보내기
module.exports = MolipMonitor;