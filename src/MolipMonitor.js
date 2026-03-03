/* ============================================================
   [src/MolipMonitor.js]
   사용자의 활성 창 분석, 5분 부재중 감지, 캐릭터 표정/대사 제어,
   상단 배지 UI 업데이트 및 연구 시간을 집계하는 핵심 분석 엔진입니다.
   ============================================================ */

const { ipcRenderer } = require('electron'); // 시스템 유휴 시간 및 메인 프로세스 통신용

class MolipMonitor {
    constructor() {
        // [상태 관리 변수]
        this.lastIdleState = false;   // 이전 루프의 부재 상태
        this.lastStateKey = null;     // 이전 루프의 표정 키 (window.lastCharacterState와 동기화)
        
        // [트래킹 보호막] 찰나의 감지 누락이나 펜 타블렛 포커스 튐 현상을 방지합니다.
        this.lastValidOwner = null;   // 마지막으로 확인된 유효 앱 이름
        this.lastValidTitle = null;   // 마지막으로 확인된 유효 창 제목
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
           [STEP 1] 시스템 부재중(Away) 여부 최우선 판정
           5분(300초) 이상 입력이 없을 때 발동하며, 모든 작업 판정보다 우선합니다.
           ------------------------------------------------------------ */
        const systemIdleSeconds = await ipcRenderer.invoke('get-idle-time'); //
        const idleLimit = window.idleLimit || 300; //
        const isNowIdle = (systemIdleSeconds >= idleLimit); //

        // 전역 부재 상태 업데이트 및 동기화
        window.isIdle = isNowIdle;

        const nowMolipDate = window.getMolipDate(); //
        
        /* ------------------------------------------------------------
           [STEP 2] 활성 창 분석 및 감지 연속성 보호 (3초 트래킹 버그 수리)
           감지가 잠깐 끊겨도 '내 연구실'로 오해하지 않고 이전 상태를 유지합니다.
           ------------------------------------------------------------ */
        let currentOwner = activeWin?.owner; //
        let currentTitle = activeWin?.title;

        if (!currentOwner) {
            // 감지가 안 될 때 최대 5초간은 이전 앱 정보를 유지하여 트래킹 연속성을 보장합니다.
            this.nullCounter++;
            if (this.nullCounter <= 5 && this.lastValidOwner) {
                currentOwner = this.lastValidOwner;
                currentTitle = this.lastValidTitle;
            } else {
                currentOwner = (window.isIdle ? "Away" : "Waiting...");
                currentTitle = "";
            }
        } else {
            this.nullCounter = 0; // 감지 성공 시 카운터 리셋
            this.lastValidOwner = currentOwner; // 유효한 앱 이름을 백업
            this.lastValidTitle = currentTitle;
        }

        const cleanedName = window.cleanAppName(currentOwner); //
        const isSelf = this._checkIsSelf(cleanedName, currentOwner); //

        // 2. UI 앱 이름 업데이트 (부재 시에는 "부재 중" 메시지 표시)
        this._updateAppNamesUI(isSelf, cleanedName);

        // UI 버튼 제어: 우리 앱일 때는 리스트 추가 버튼 비활성화
        const workAddBtn = document.querySelector('#current-app-box .btn-add-current'); //
        const distractAddBtn = document.querySelector('#tab-content-distract .btn-add-current'); //
        if (workAddBtn) { workAddBtn.disabled = isSelf; workAddBtn.style.opacity = isSelf ? "0.5" : "1"; }
        if (distractAddBtn) { distractAddBtn.disabled = isSelf; distractAddBtn.style.opacity = isSelf ? "0.5" : "1"; }

        // 3. 파트너가 없으면 중단
        if (!window.currentPartner) return false;

        /* ------------------------------------------------------------
           [STEP 3] 상태 판정 로직
           부재 중일 경우 모든 작업 판정을 무효화하며, 버퍼링된 데이터를 사용합니다.
           ------------------------------------------------------------ */
        const status = this._determineStatus({ owner: currentOwner, title: currentTitle }, isSelf); //
        
        // 집중 판정: 부재 중 아님 && 자기 자신 아님 && 작업 도구임 && 딴짓 아님
        const isFocusing = !window.isIdle && !isSelf && status.isWorking && !status.isDistraction;
        // 딴짓 판정: 부재 중 아님 && 자기 자신 아님 && 딴짓 도구임
        const isActuallyDistraction = !window.isIdle && !isSelf && status.isDistraction;

        window.isActuallyWorking = isFocusing; //
        window.isDistraction = isActuallyDistraction; //

        /* ------------------------------------------------------------
           [STEP 4] 캐릭터 외형, 대사 및 상단 배지 UI 동기화 (통합 제어)
           이미지 키: working, distracting, good, away (characters.json 규격)
           배지 클래스: working, distracting, waiting, away
           ------------------------------------------------------------ */
        // A. 캐릭터 이미지 및 대사 업데이트
        this._syncCharacterState(isFocusing, isActuallyDistraction, window.isIdle);

        // B. ✨ [신규 통합] 상단 상태 배지 UI 업데이트
        this._updateStatusBadge(isFocusing, isActuallyDistraction, window.isIdle);

        // 5. 데이터 실시간 기록 (부재 중이 아닐 때만 집계)
        if (!window.isIdle && (isFocusing || isActuallyDistraction)) {
            this._recordData(cleanedName, isFocusing, nowMolipDate, status.matchedKey);
        }

        // 6. 상태 변화 트리거: 몰입 종료 시 즉시 데이터 저장
        if (window.lastKnownFocusState === true && isFocusing === false) {
            window.saveAllData(); //
        }
        window.lastKnownFocusState = isFocusing; //

        this.lastIdleState = window.isIdle; //

        return isFocusing;
    }

    /**
     * 우리 앱(내 연구실)인지 확인하는 내부 메서드
     */
    _checkIsSelf(name, raw) {
        const forbidden = ["Ether Flow", "Electron", "내 연구실", "Molip", "에테르"]; //
        return forbidden.some(k => name.includes(k) || raw.includes(k)); //
    }

    /**
     * 상단 및 설정창의 앱 이름 표시 UI를 업데이트합니다.
     */
    _updateAppNamesUI(isSelf, name) {
        const appNameEl = document.getElementById('current-app-name'); //
        const distractNameEl = document.getElementById('current-distract-name'); //
        
        let displayName = isSelf ? "내 연구실" : name; //
        if (window.isIdle) displayName = "부재 중 (연구 중단)"; //
        else if (name === "Waiting...") displayName = "활성 창 감지 중..."; //
        
        if (appNameEl) appNameEl.innerText = displayName; //
        if (distractNameEl) distractNameEl.innerText = displayName; //
    }

    /**
     * 작업 및 딴짓 여부를 결정하는 알고리즘
     */
    _determineStatus(winInfo, isSelf) {
        if (isSelf || !winInfo.owner || winInfo.owner === "Waiting...") {
            return { isWorking: false, isDistraction: false, matchedKey: null };
        }

        const monitor = window.masterData.settings?.monitor || { workKeywords: [], distractKeywords: [] }; //
        const targetOwner = winInfo.owner.toLowerCase(); //
        const targetTitle = (winInfo.title || "").toLowerCase(); //

        const matchedWorkKey = (monitor.workKeywords || []).find(k => targetOwner.includes(k.toLowerCase()) || targetTitle.includes(k.toLowerCase())); //
        const matchedDistractKey = (monitor.distractKeywords || []).find(k => targetOwner.includes(k.toLowerCase()) || targetTitle.includes(k.toLowerCase())); //

        const appMatchWork = (window.workApps || []).some(app => targetOwner.includes(app.toLowerCase())); //
        const appMatchDistract = (window.distractionApps || []).some(app => targetOwner.includes(app.toLowerCase())); //

        return {
            isWorking: appMatchWork || !!matchedWorkKey,
            isDistraction: appMatchDistract || !!matchedDistractKey,
            matchedKey: matchedWorkKey || matchedDistractKey
        };
    }

    /**
     * 캐릭터 표정과 대사를 이미지 키값에 맞춰 완벽하게 동기화합니다.
     */
    _syncCharacterState(isFocusing, isDistraction, isIdle) {
        if (window.currentStage === 'egg' || !window.renderer) return; //
        
        // 🎨 캐릭터 이미지 키 결정 (characters.json 규격 일치)
        const exprKey = isIdle ? 'away' : (isFocusing ? 'working' : (isDistraction ? 'distracting' : 'good'));
        const dialogueKey = isFocusing ? 'work' : (isDistraction ? 'distract' : 'idle'); //

        if (window.lastCharacterState !== exprKey) {
            if (window.renderer.setExpression) {
                window.renderer.setExpression(exprKey); //
            }
            
            if (!isIdle && this.lastIdleState) {
                if (window.showRandomDialogue) window.showRandomDialogue('return'); //
            } else if (!isIdle || (isIdle && !this.lastIdleState)) {
                if (window.showRandomDialogue) window.showRandomDialogue(dialogueKey); //
            }

            window.lastCharacterState = exprKey; //
            window.currentStatus = exprKey; //
        }
    }

    /**
     * [✨ 신규 통합] 판정된 상태에 맞춰 상단 배지 UI(아이콘, 텍스트)를 갱신합니다.
     */
    _updateStatusBadge(isFocusing, isDistraction, isIdle) {
        const badgeEl = document.getElementById('status-badge'); //
        if (!badgeEl) return;

        let statusClass = "";
        let icon = "";
        let text = "";

        // 우선순위: 부재 > 딴짓 > 집중 > 대기
        if (isIdle) { 
            statusClass = "away";
            icon = '<i class="fas fa-moon"></i>';
            text = "부재 중";
        } else if (isDistraction) {
            statusClass = "distracting";
            icon = '<i class="fas fa-ghost"></i>';
            text = "딴짓 중";
        } else if (isFocusing) {
            statusClass = "working";
            icon = '<i class="fas fa-fire"></i>';
            text = "집중 중";
        } else {
            statusClass = "waiting";
            icon = '<i class="fas fa-hourglass-start"></i>';
            text = "대기 중";
        }

        // 기존 상태 클래스 제거 및 신규 상태 적용
        const allStates = ["away", "distracting", "working", "waiting"];
        badgeEl.classList.remove(...allStates);
        badgeEl.classList.add(statusClass);
        
        badgeEl.innerHTML = `${icon} ${text}`; //
    }

    /**
     * 연구 성과(집중 시간, 성장도, 통계)를 기록하는 로직
     */
    _recordData(name, isFocusing, date, matchedKey) {
        const logName = matchedKey ? (isFocusing ? `🔑 ${matchedKey}` : `🚫 ${matchedKey}`) : name; //
        if (window.logManager) window.logManager.recordLog(logName, isFocusing ? 'work' : 'distract'); //

        if (isFocusing) {
            if (window.currentPartner && window.currentStage !== 'egg') {
                const pId = window.currentPartner.id;
                window.charGrowthMap[pId] = (window.charGrowthMap[pId] || 0) + 1; //
            }
            if (!window.dailyAppTimeMap[date]) window.dailyAppTimeMap[date] = {}; //
            window.dailyAppTimeMap[date][name] = (window.dailyAppTimeMap[date][name] || 0) + 1; //
            
            if (window.progress) window.progress.recordFocus(); //
            if (window.progress && window.progress.totalFocusTime > 0 && window.progress.totalFocusTime % 60 === 0) {
                if (window.collection) window.collection.addPoints(1); //
                window.saveAllData(); // 1분마다 정기 저장
            }
        }
    }
}

module.exports = MolipMonitor;