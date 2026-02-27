// src/LogManager.js
const { ipcRenderer } = require('electron');

class LogManager {
    constructor() {
        this.logViewDate = this.getLogicalDate(); // 생성 시점에도 논리적 날짜 사용
        this.currentLogTab = 'list';   
    }

    init() {
        window.openDailyLog = this.openDailyLog.bind(this);
        window.closeDailyLog = this.closeDailyLog.bind(this);
        window.changeLogDate = this.changeLogDate.bind(this);
        window.switchLogTab = this.switchLogTab.bind(this);
        window.renderDailyLogContent = this.renderDailyLogContent.bind(this);
        window.updateLogChart = this.updateLogChart.bind(this);
        window.saveLogAsReceipt = this.saveLogAsReceipt.bind(this);

        console.log("✅ [LogManager] 기록 및 통계 시스템 연결 완료");
    }

    formatDate(date) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
    }

    /**
     * [핵심 추가] 초기화 시간(resetHour)을 고려한 '논리적 현재 날짜' 객체 반환
     * 예: 초기화가 04시이고 현재가 02시라면, 날짜 객체는 '어제'를 반환함.
     */
    getLogicalDate() {
        const now = new Date();
        const resetHour = window.resetHour || 0;
        
        // 현재 시각이 리셋 시간보다 이전이면 '하루 전'으로 취급
        if (now.getHours() < resetHour) {
            now.setDate(now.getDate() - 1);
        }
        return now;
    }

    // [LogManager.js] recordLog 함수 수정
    recordLog(owner, type) {
        const today = window.getMolipDate();
        if (!window.masterData.logs) window.masterData.logs = {};
        if (!window.masterData.logs[today]) window.masterData.logs[today] = [];

        const logs = window.masterData.logs[today];
        const lastLog = logs[logs.length - 1];
        const cleanedOwner = window.cleanAppName(owner);

        // ✨ [개선] 앱 이름이 같고 타입이 같으면 1초씩 더함
        // 만약 타입이 'etc'인 짧은 공백(1~2초)이 생겨도 기존 흐름을 유지하도록 보정할 수 있습니다.
        if (lastLog && lastLog.owner === cleanedOwner && lastLog.type === type) {
            lastLog.duration = (lastLog.duration || 0) + 1;
        } else {
            const nowTime = new Date().toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit' });
            logs.push({
                time: nowTime,
                owner: cleanedOwner,
                type: type,
                duration: 1
            });
        }
    }

    openDailyLog() {
        // [수정] 단순 new Date()가 아니라 논리적 날짜를 가져옴
        this.logViewDate = this.getLogicalDate(); 
        this.currentLogTab = 'list';
        
        const modal = document.getElementById('daily-log-modal');
        if (modal) {
            modal.style.display = 'flex';
            
            const tabs = modal.querySelectorAll('.shop-tab-re');
            tabs.forEach((btn, idx) => {
                if (idx === 0) btn.classList.add('active'); 
                else btn.classList.remove('active');        
            });

            const listArea = document.getElementById('daily-log-list');
            const chartArea = document.getElementById('daily-log-chart-area');
            if (listArea) listArea.style.display = 'block';
            if (chartArea) chartArea.style.display = 'none';
        }

        this.renderDailyLogContent();
    }

    closeDailyLog() {
        const modal = document.getElementById('daily-log-modal');
        if (modal) modal.style.display = 'none';
    }

    changeLogDate(offset) {
        const nextDate = new Date(this.logViewDate);
        nextDate.setDate(nextDate.getDate() + offset);
        
        // [수정] 미래로 가는 것을 막을 때도 '논리적 오늘'을 기준으로 함
        const todayLogical = this.getLogicalDate();
        todayLogical.setHours(0, 0, 0, 0);
        
        const nextComp = new Date(nextDate);
        nextComp.setHours(0, 0, 0, 0);
        
        if (nextComp > todayLogical) return; 
        
        this.logViewDate = nextDate;
        this.renderDailyLogContent();
    }

    switchLogTab(tab, btn) {
        this.currentLogTab = tab;

        document.querySelectorAll('.shop-tab-re').forEach(b => {
            if (b.closest('#daily-log-modal')) b.classList.remove('active');
        });
        if (btn) btn.classList.add('active');

        const listArea = document.getElementById('daily-log-list');
        const chartArea = document.getElementById('daily-log-chart-area');

        // ✨ [핵심] 어떤 탭이든 본문 내용을 먼저 갱신하여 날짜 라벨 등을 동기화합니다.
        if (tab === 'list') {
            if (listArea) listArea.style.display = 'block';
            if (chartArea) chartArea.style.display = 'none';
            this.renderDailyLogContent(); 
        } else {
            if (listArea) listArea.style.display = 'none';
            if (chartArea) chartArea.style.display = 'block';
            // 통계 탭으로 전환 시 차트 강제 갱신
            this.renderDailyLogContent(); 
        }
    }

    renderDailyLogContent() {
        const list = document.getElementById('daily-log-list');
        const dateDisplay = document.getElementById('log-date-display');
        if (!list) return;

        if (dateDisplay) {
            // [수정] '오늘' 표시 여부도 논리적 날짜와 비교
            const todayStr = this.getLogicalDate().toLocaleDateString('en-CA');
            const viewStr = this.logViewDate.toLocaleDateString('en-CA');
            const isToday = todayStr === viewStr;
            
            dateDisplay.innerText = `${this.logViewDate.toLocaleDateString()} ${isToday ? '(오늘)' : ''}`;
        }

        const dateStr = this.logViewDate.toLocaleDateString('en-CA');
        const dailyLogs = window.masterData.logs?.[dateStr] || [];

        if (dailyLogs.length === 0) {
            list.innerHTML = `<div class="empty-log-msg" style="text-align:center; padding:30px; color:rgba(255,255,255,0.2); font-size:0.75rem;">기록 없음</div>`;
            this.updateLogChart([]); 
            return;
        }

        const maxDuration = Math.min(1800, Math.max(...dailyLogs.map(log => log.duration || 0), 60)); 

        list.innerHTML = dailyLogs.map(log => {
            const isWork = log.type === 'work';
            const durationSec = log.duration || 0;
            const durationMin = Math.floor(durationSec / 60);
            const durationRestSec = durationSec % 60;
            const barPercent = Math.max(5, Math.min(100, (durationSec / maxDuration) * 100));
            
            const typeClass = isWork ? 'work' : 'distract';
            const barColor = isWork ? '#a0c4ff' : '#ff6b6b';

            let displayOwner = log.owner || 'Unknown';
            if (displayOwner.startsWith('🔑 ') || displayOwner.startsWith('🚫 ')) {
                displayOwner = displayOwner.substring(2); 
            }

            return `
                <div class="log-item-card">
                    <div class="log-time">${log.time}</div>
                    <div class="log-badge ${typeClass}">${isWork ? '집중' : '딴짓'}</div>
                    <div class="log-owner">${displayOwner}</div>
                    <div class="log-progress-container">
                        <div class="log-progress-fill" style="width: ${barPercent}%; background: ${barColor};"></div>
                    </div>
                    <div class="log-duration">
                        ${durationMin > 0 ? `${durationMin}m` : `${durationRestSec}s`}
                    </div>
                </div>
            `;
        }).join('');

        if (this.currentLogTab !== 'list') {
            this.updateLogChart(dailyLogs);
        }
    }

    updateLogChart(logs) {
        const workBar = document.getElementById('stat-bar-work');
        const distractBar = document.getElementById('stat-bar-distract');
        const workPercentText = document.getElementById('stat-work-percent');
        const distractPercentText = document.getElementById('stat-distract-percent');
        const detailList = document.getElementById('stat-detail-list');
        const distractDetailList = document.getElementById('stat-distract-detail-list');

        if (!workBar || !distractBar || !detailList || !distractDetailList) return;

        let totalWork = 0;
        let totalDistract = 0;
        const workAppStats = {};     
        const distractAppStats = {}; 

        logs.forEach(log => {
            const duration = log.duration || 0;
            let appName = log.owner;
            
            if (appName.startsWith('🔑 ') || appName.startsWith('🚫 ')) {
                appName = appName.substring(2); 
            } else {
                appName = window.cleanAppName ? window.cleanAppName(appName) : appName;
            }
            
            if (log.type === 'work') {
                totalWork += duration;
                workAppStats[appName] = (workAppStats[appName] || 0) + duration;
            } else if (log.type === 'distract') {
                totalDistract += duration;
                distractAppStats[appName] = (distractAppStats[appName] || 0) + duration;
            }
        });

        const totalTime = totalWork + totalDistract;

        if (totalTime === 0) {
            workBar.style.width = "50%"; 
            distractBar.style.width = "50%";
            if (workPercentText) workPercentText.innerText = "0%";
            if (distractPercentText) distractPercentText.innerText = "0%";
            
            const noRecordHTML = `<div class="empty-log-msg" style="text-align:center; padding:15px; color:rgba(255,255,255,0.1); font-size:0.7rem;">기록 없음</div>`;
            detailList.innerHTML = noRecordHTML;
            distractDetailList.innerHTML = noRecordHTML;
            return;
        }

        const workRatio = (totalWork / totalTime) * 100;
        workBar.style.width = `${workRatio}%`;
        distractBar.style.width = `${100 - workRatio}%`;
        if (workPercentText) workPercentText.innerText = `${Math.round(workRatio)}%`;
        if (distractPercentText) distractPercentText.innerText = `${Math.round(100 - workRatio)}%`;

        const createStatListHTML = (stats, total, color) => {
            const sorted = Object.entries(stats).sort((a, b) => b[1] - a[1]);
            if (sorted.length === 0) return `<div class="empty-log-msg" style="text-align:center; padding:15px; color:rgba(255,255,255,0.1); font-size:0.7rem;">기록 없음</div>`;
            
            return sorted.map(([name, time]) => {
                const mins = (time / 60).toFixed(1);
                const percent = ((time / total) * 100).toFixed(1);
                return `
                    <div class="stat-detail-item" style="border-left: 3px solid ${color};">
                        <div class="stat-app-name">${name}</div>
                        <div class="stat-app-info">
                            <span class="stat-min">${mins}m</span>
                            <span class="stat-percent" style="color: ${color};">${percent}%</span>
                        </div>
                    </div>
                `;
            }).join('');
        };

        detailList.innerHTML = createStatListHTML(workAppStats, totalWork, '#a0c4ff');
        distractDetailList.innerHTML = createStatListHTML(distractAppStats, totalDistract, '#ff6b6b');
    }

    async saveLogAsReceipt() {
        if (window.saveAllData) await window.saveAllData(); 

        const dailyAppTimeMap = window.dailyAppTimeMap || {};
        
        // [수정] 영수증 출력 시에도 '논리적 날짜'를 우선 사용
        // 현재 보고 있는 뷰 날짜(logViewDate)를 우선으로 하되, fallback 시 논리적 오늘을 사용
        let targetDate = this.logViewDate || this.getLogicalDate();
        let viewDateKey = targetDate.toLocaleDateString('en-CA');
        let rawAppData = dailyAppTimeMap[viewDateKey];

        console.log(`[영수증] 조회: "${viewDateKey}" -> ${rawAppData ? '성공' : '실패'}`);

        if (!rawAppData) {
            const todayKey = window.getMolipDate(); // renderer.js 함수 사용
            if (dailyAppTimeMap[todayKey]) {
                viewDateKey = todayKey;
                rawAppData = dailyAppTimeMap[todayKey];
                // 날짜 객체도 동기화 (단순 new Date()가 아님)
                targetDate = this.getLogicalDate();
            }
        }

        if (!rawAppData || Object.keys(rawAppData).length === 0) {
            if (window.showToast) window.showToast("저장된 몰입 기록이 없습니다.", "warning");
            return;
        }

        const focusApps = Object.keys(rawAppData);
        focusApps.sort((a, b) => a.localeCompare(b));

        const receiptNo = document.getElementById('receipt-no');
        const receiptDate = document.getElementById('receipt-date');
        const receiptChar = document.getElementById('receipt-char-name');
        
        if (receiptNo) receiptNo.innerText = `#${Math.floor(Math.random() * 9000) + 1000}`;
        
        // 영수증 날짜 표시
        if (receiptDate) {
            const y = targetDate.getFullYear();
            const m = String(targetDate.getMonth() + 1).padStart(2, '0');
            const d = String(targetDate.getDate()).padStart(2, '0');
            
            // 결과 예시: "2026. 02. 05" (연도와 월 사이 점 포함)
            receiptDate.innerText = `${y}. ${m}. ${d}`; 
        }
        
        // 파트너 이름 표시
        if (receiptChar) {
            let partnerName = "Focus Dot";
            if (window.currentPartner && window.currentPartner.name) {
                partnerName = window.currentPartner.name;
            } else if (window.masterData && window.masterData.character && window.charData) {
                const pid = window.masterData.character.selectedPartnerId;
                const charObj = window.charData.characters.find(c => c.id === pid);
                if (charObj) partnerName = charObj.name;
            }
            receiptChar.innerText = partnerName;
        }
        
        let totalSeconds = 0;
        const itemsHtml = focusApps.map(name => { 
            const time = rawAppData[name];
            totalSeconds += time; 

            let displayName = name;
            if (displayName.startsWith('🔑 ') || displayName.startsWith('🚫 ')) {
                displayName = displayName.substring(2);
            }

            return `
                <div class="receipt-item">
                    <span class="name">${displayName}</span>
                    <span class="dots"></span>
                    <span class="time">${this.formatReceiptTime(time)}</span>
                </div>`; 
        }).join('');
        
        document.getElementById('receipt-items').innerHTML = itemsHtml;
        document.getElementById('receipt-total-time').innerText = this.formatReceiptTime(totalSeconds);

        const wrapper = document.getElementById('receipt-wrapper');
        const receiptArea = document.getElementById('focus-receipt');
        
        if (!wrapper || !receiptArea) return;

        wrapper.style.display = "flex";
        setTimeout(() => {
            const rect = receiptArea.getBoundingClientRect(); 
            ipcRenderer.send('save-log-image', { 
                x: 0, y: 0, width: Math.ceil(rect.width), height: Math.ceil(rect.height) 
            });
            setTimeout(() => { wrapper.style.display = "none"; }, 1000);
        }, 500);
    }

    formatReceiptTime(s) {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        return h > 0 ? `${h}h ${m}m` : (m > 0 ? `${m}m ${sec}s` : `${sec}s`);
    }
}

module.exports = LogManager;