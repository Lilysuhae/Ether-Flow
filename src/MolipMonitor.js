const { ipcRenderer } = require('electron');

/**
 * [src/MolipMonitor.js]
 * 사용자의 활성 창과 키워드를 분석하여 현재 상태(몰입/딴짓/부재)를 결정하고 기록하는 엔진입니다.
 */
class MolipMonitor {
    constructor() {
        this.lastIdleState = false;
        this.awayStartTime = null;
    }

    /**
     * 메인 분석 엔진: renderer.js에서 1초마다 호출됩니다.
     */
    async analyze(activeWin) {
        // 1. 시스템 기본 방어
        if (!window.masterData || window.isResetting) return false;

        const nowMolipDate = window.getMolipDate();
        const rawOwner = activeWin?.owner || "Ether Flow";
        const cleanedName = window.cleanAppName(rawOwner);
        
        // ✨ [수리] 자기 자신(연구실 앱) 여부 판정 (강화된 필터링)
        const isSelf = this._checkIsSelf(cleanedName, rawOwner);

        // 2. UI 앱 이름 업데이트 (이게 실행되어야 "감지 중..."이 바뀝니다)
        this._updateAppNamesUI(isSelf, cleanedName);

        // 3. 부재(Idle) 판정
        const idleTime = await ipcRenderer.invoke('get-idle-time');
        const idleLimit = window.idleLimit || 300; // renderer.js의 설정값 참조
        const isIdle = (idleTime > idleLimit);

        // 4. ✨ [핵심 수정] 외부 함수 대신 내부의 _determineStatus를 호출하여 판정합니다.
        // _determineStatus 내부에서 isSelf가 true면 무조건 working: false를 반환합니다.
        const status = this._determineStatus(activeWin, isSelf);
        const isFocusing = status.isWorking;
        const isDistraction = status.isDistraction;

        // 5. 전역 상태 업데이트 (renderer.js의 배지가 이 변수들을 봅니다)
        // !isIdle 조건과 결합하여 부재 중일 때는 집중 상태가 되지 않도록 방어합니다.
        // isFocusing이 false이면 renderer.js 배지는 '대기 중'으로 떨어집니다.
        window.isActuallyWorking = isFocusing && !isIdle;
        window.isIdle = isIdle;
        window.isDistraction = isDistraction && !isIdle;

        // 6. 캐릭터 상태(표정/대사) 업데이트
        this._updateCharacterState(isIdle, isFocusing, isDistraction);

        // 7. 데이터 기록 (부재 중이 아닐 때만 실행)
        if (!isIdle) {
            this._recordData(cleanedName, isFocusing, nowMolipDate, status.matchedKey);
        }

        this.lastIdleState = isIdle;
        return true;
    }

    /**
     * ✨ [수리] 자기 자신(연구실 앱) 판정 로직
     * 파일 하단에 중복 정의되었던 코드를 삭제하고 이 종합 버전 하나만 남겼습니다.
     */
    _checkIsSelf(name, raw) {
        // 모든 한국어/영어 명칭을 포함합니다.
        const forbidden = ["ether flow", "electron", "내 연구실", "molip", "에테르", "연구실"];
        const lowerName = (name || "").toLowerCase();
        const lowerRaw = (raw || "").toLowerCase();
        
        // 이름이나 원본 프로세스명에 금지어가 하나라도 포함되어 있으면 true를 반환합니다.
        return forbidden.some(k => lowerName.includes(k) || lowerRaw.includes(k));
    }

    /**
     * UI의 앱 이름 표시줄 업데이트
     */
    _updateAppNamesUI(isSelf, name) {
        const appNameEl = document.getElementById('current-app-name');
        const distractNameEl = document.getElementById('current-distract-name');
        
        // 자기 자신일 때는 "연구 기록 중..."으로 표시하여 유저 혼동을 방지합니다.
        const displayName = isSelf ? "내 연구실" : name; 
        
        if (appNameEl) appNameEl.innerText = displayName;
        if (distractNameEl) distractNameEl.innerText = displayName;

        // 버튼 제어 (자기 자신 앱일 때는 도구 추가 버튼 비활성화)
        const workAddBtn = document.querySelector('#current-app-box .btn-add-current');
        const distractAddBtn = document.querySelector('#tab-content-distract .btn-add-current');
        if (workAddBtn) { 
            workAddBtn.disabled = isSelf; 
            workAddBtn.style.opacity = isSelf ? "0.5" : "1"; 
        }
        if (distractAddBtn) { 
            distractAddBtn.disabled = isSelf; 
            distractAddBtn.style.opacity = isSelf ? "0.5" : "1"; 
        }
    }

    /**
     * ✨ [수리] 집중/딴짓 정밀 판정 로직
     * 상호 포함 확인(Bidirectional Match)을 적용하여 포토샵 등 이름 오차를 해결합니다.
     */
    _determineStatus(activeWin, isSelf) {
        // ✨ [핵심] 자기 자신(연구실 앱)이면 무조건 집중/딴짓 아님(false)으로 즉시 반환합니다.
        if (isSelf) return { isWorking: false, isDistraction: false, matchedKey: null };

        const monitor = window.masterData.settings?.monitor || { workKeywords: [], distractKeywords: [] };
        const targetOwner = (activeWin?.owner || "").toLowerCase().trim();
        const targetTitle = (activeWin?.title || "").toLowerCase().trim();

        // 1. 키워드 검사 (제목이나 프로세스명에 키워드 포함 여부)
        const matchedWorkKey = (monitor.workKeywords || []).find(k => 
            targetOwner.includes(k.toLowerCase()) || targetTitle.includes(k.toLowerCase())
        );
        const matchedDistractKey = (monitor.distractKeywords || []).find(k => 
            targetOwner.includes(k.toLowerCase()) || targetTitle.includes(k.toLowerCase())
        );

        // 2. 앱 리스트 검사 (상호 포함 확인: photoshop <-> Adobe Photoshop)
        const appMatchWork = (window.workApps || []).some(app => {
            const reg = app.toLowerCase().trim();
            return reg && (targetOwner.includes(reg) || reg.includes(targetOwner));
        });
        const appMatchDistract = (window.distractionApps || []).some(app => {
            const reg = app.toLowerCase().trim();
            return reg && (targetOwner.includes(reg) || reg.includes(targetOwner));
        });

        return {
            isWorking: appMatchWork || !!matchedWorkKey,
            isDistraction: appMatchDistract || !!matchedDistractKey,
            matchedKey: matchedWorkKey || matchedDistractKey
        };
    }

    /**
     * 캐릭터의 상태(표정)를 업데이트합니다.
     */
    _updateCharacterState(isIdle, isFocusing, isDistraction) {
        if (!window.renderer) return;

        const exprKey = isIdle ? 'away' : (isFocusing ? 'work' : (isDistraction ? 'distract' : 'good'));
        const dialogueKey = isFocusing ? 'work' : (isDistraction ? 'distract' : 'idle');

        if (window.lastCharacterState !== exprKey) {
            if (window.renderer.setExpression) {
                window.renderer.setExpression(exprKey);
            }
            
            // 부재에서 돌아왔거나 상태가 변했을 때만 대사를 출력합니다.
            if (!isIdle || (isIdle && !this.lastIdleState)) {
                if (window.showRandomDialogue) window.showRandomDialogue(dialogueKey);
            }
            window.lastCharacterState = exprKey;
            window.currentStatus = exprKey;
        }
    }

    /**
     * 캐릭터 대사 및 상태 동기화 레거시 (하위 호환 유지용)
     */
    _syncCharacterState(isFocusing, isDistraction, isIdle) {
        this._updateCharacterState(isIdle, isFocusing, isDistraction);
    }

    /**
     * 데이터 기록 로직
     */
    _recordData(name, isFocusing, date, matchedKey) {
        // LogManager에는 매칭된 키워드나 정제된 이름을 전달합니다.
        const logName = matchedKey || name;
        if (window.logManager) {
            window.logManager.recordLog(logName, isFocusing ? 'work' : 'distract');
        }

        if (isFocusing) {
            // 1. 호문클루스 성장도 반영 (알 상태가 아닐 때만)
            if (window.currentPartner && window.currentStage !== 'egg') {
                const pId = window.currentPartner.id;
                window.charGrowthMap[pId] = (window.charGrowthMap[pId] || 0) + 1;
            }

            // 2. 일일 앱 사용 시간 통계 기록 (stats 경로 안전성 확보)
            const stats = window.masterData.settings || window.masterData;
            if (!stats.dailyAppTimeMap) stats.dailyAppTimeMap = {};
            if (!stats.dailyAppTimeMap[date]) stats.dailyAppTimeMap[date] = {};
            
            stats.dailyAppTimeMap[date][name] = (stats.dailyAppTimeMap[date][name] || 0) + 1;
            
            // 3. 전체 집중 시간 및 경험치 반영
            if (window.progress) {
                window.progress.recordFocus(); 
            }

            // 4. 장기 세션 보호를 위한 5분마다 자동 저장 트리거
            if (window.progress && window.progress.totalFocusTime % 300 === 0) {
                if (window.saveAllData) window.saveAllData();
            }
        }
    }
}

module.exports = MolipMonitor;