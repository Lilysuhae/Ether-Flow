/**
 * [src/MolipMonitor.js]
 * 사용자의 활성 창과 키워드를 분석하여 현재 상태(몰입/딴짓/부재)를 결정하고 기록하는 엔진입니다.
 */
class MolipMonitor {
    constructor() {
        this.lastIdleState = false;
        this.awayStartTime = null;
    }

    async analyze(activeWin) {
        // 1. 시스템 기본 방어
        if (!window.masterData || window.isResetting) return false;

        const nowMolipDate = window.getMolipDate();
        const rawOwner = activeWin?.owner || "Ether Flow";
        const cleanedName = window.cleanAppName(rawOwner);
        const isSelf = this._checkIsSelf(cleanedName, rawOwner);

        // 2. UI 앱 이름 업데이트 (이게 실행되어야 "감지 중..."이 바뀝니다)
        this._updateAppNamesUI(isSelf, cleanedName);

        // 버튼 제어
        const workAddBtn = document.querySelector('#current-app-box .btn-add-current');
        const distractAddBtn = document.querySelector('#tab-content-distract .btn-add-current');
        if (workAddBtn) { workAddBtn.disabled = isSelf; workAddBtn.style.opacity = isSelf ? "0.5" : "1"; }
        if (distractAddBtn) { distractAddBtn.disabled = isSelf; distractAddBtn.style.opacity = isSelf ? "0.5" : "1"; }

        // 3. 파트너가 없으면 중단
        if (!window.currentPartner) return false;

        // 4. ✨ [핵심 수정] 상태 판정 및 변수 정의 (사용하기 전에 반드시 선언)
        const status = this._determineStatus(activeWin, isSelf);
        const isFocusing = status.isWorking && !window.isIdle && !status.isDistraction;

        window.isActuallyWorking = status.isWorking;
        window.isDistraction = status.isDistraction;

        // 5. 캐릭터 표정 및 상태별 대사 동기화
        this._syncCharacterState(isFocusing, window.isDistraction, window.isIdle);

        // 6. 데이터 실시간 기록
        if (isFocusing || window.isDistraction) {
            this._recordData(cleanedName, isFocusing, nowMolipDate, status.matchedKey);
        }

        // 7. 몰입 종료 시 즉시 저장
        if (window.lastKnownFocusState === true && isFocusing === false) {
            window.saveAllData();
        }
        window.lastKnownFocusState = isFocusing;

        return isFocusing;
    }

    _checkIsSelf(name, raw) {
        const forbidden = ["Ether Flow", "Electron", "내 연구실", "Molip", "에테르"];
        return forbidden.some(k => name.includes(k) || raw.includes(k));
    }

    _updateAppNamesUI(isSelf, name) {
        const appNameEl = document.getElementById('current-app-name');
        const distractNameEl = document.getElementById('current-distract-name');
        const displayName = isSelf ? "내 연구실" : name; 
        
        if (appNameEl) appNameEl.innerText = displayName;
        if (distractNameEl) distractNameEl.innerText = displayName;
    }

    _determineStatus(activeWin, isSelf) {
        if (isSelf) return { isWorking: false, isDistraction: false, matchedKey: null };

        const monitor = window.masterData.settings?.monitor || { workKeywords: [], distractKeywords: [] };
        const targetOwner = (activeWin?.owner || "").toLowerCase();
        const targetTitle = (activeWin?.title || "").toLowerCase();

        const matchedWorkKey = (monitor.workKeywords || []).find(k => targetOwner.includes(k.toLowerCase()) || targetTitle.includes(k.toLowerCase()));
        const matchedDistractKey = (monitor.distractKeywords || []).find(k => targetOwner.includes(k.toLowerCase()) || targetTitle.includes(k.toLowerCase()));

        const appMatchWork = (window.workApps || []).some(app => targetOwner.includes(app.toLowerCase()));
        const appMatchDistract = (window.distractionApps || []).some(app => targetOwner.includes(app.toLowerCase()));

        return {
            isWorking: appMatchWork || !!matchedWorkKey,
            isDistraction: appMatchDistract || !!matchedDistractKey,
            matchedKey: matchedWorkKey || matchedDistractKey
        };
    }

    _syncCharacterState(isFocusing, isDistraction, isIdle) {
        if (window.currentStage === 'egg' || !window.renderer) return;
        
        const exprKey = isFocusing ? 'working' : (isDistraction ? 'distracting' : (isIdle ? 'away' : 'good'));
        const dialogueKey = isFocusing ? 'work' : (isDistraction ? 'distract' : 'idle');

        if (window.lastCharacterState !== exprKey) {
            window.renderer.setExpression(exprKey);
            if (!isIdle || (isIdle && !this.lastIdleState)) window.showRandomDialogue(dialogueKey);
            window.lastCharacterState = exprKey;
            window.currentStatus = exprKey;
        }
    }

    _recordData(name, isFocusing, date, matchedKey) {
        const logName = matchedKey ? (isFocusing ? `🔑 ${matchedKey}` : `🚫 ${matchedKey}`) : name;
        if (window.logManager) window.logManager.recordLog(logName, isFocusing ? 'work' : 'distract');

        if (isFocusing) {
            if (window.currentPartner && window.currentStage !== 'egg') {
                window.charGrowthMap[window.currentPartner.id] = (window.charGrowthMap[window.currentPartner.id] || 0) + 1;
            }
            if (!window.dailyAppTimeMap[date]) window.dailyAppTimeMap[date] = {};
            window.dailyAppTimeMap[date][name] = (window.dailyAppTimeMap[date][name] || 0) + 1;
            
            if (window.progress) window.progress.recordFocus();
            if (window.progress && window.progress.totalFocusTime > 0 && window.progress.totalFocusTime % 60 === 0) {
                if (window.collection) window.collection.addPoints(1);
                window.saveAllData();
            }
        }
    }
}

module.exports = MolipMonitor;