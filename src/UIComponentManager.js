/**
 * [src/UIComponentManager.js]
 * 모든 모달의 열림/닫힘 상태와 데이터 동기화를 관리합니다.
 */
class UIComponentManager {
    constructor() {
        this.tooltipTimeout = null;
        this.mouseX = 0;
        this.mouseY = 0;
        this.TOOLTIP_DELAY = 250;
        
        this.setupWindowGlobals();
        this.initEventListeners();
    }

    setupWindowGlobals() {
        window.showToast = this.showToast.bind(this);
        window.showConfirm = this.showConfirm.bind(this);
        window.showTooltip = this.showTooltip.bind(this);
        window.hideTooltip = this.hideTooltip.bind(this);
        window.toggleAccordion = this.toggleAccordion.bind(this);
        window.applyAccordionStates = this.applyAccordionStates.bind(this);
        window.toggleSettings = this.toggleSettings.bind(this);
        window.toggleMusicSettings = this.toggleMusicSettings.bind(this);
        window.toggleAmbientSettings = this.toggleAmbientSettings.bind(this);
        window.closeAllModals = this.closeAllModals.bind(this);
    }

    initEventListeners() {
        document.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
            const tooltip = document.getElementById('common-tooltip');
            if (tooltip && tooltip.style.display === 'block') {
                tooltip.style.left = `${this.mouseX}px`; 
                tooltip.style.top = `${this.mouseY + 25}px`; 
            }
        });

        document.addEventListener('mouseover', (e) => {
            const target = e.target.closest('[data-tooltip]');
            const tooltip = document.getElementById('common-tooltip');
            if (target && tooltip) {
                const msg = target.getAttribute('data-tooltip');
                if (msg) {
                    if (this.tooltipTimeout) clearTimeout(this.tooltipTimeout);
                    this.tooltipTimeout = setTimeout(() => {
                        tooltip.innerText = msg;
                        tooltip.style.left = `${this.mouseX}px`;
                        tooltip.style.top = `${this.mouseY + 25}px`;
                        tooltip.style.display = 'block';
                        tooltip.style.opacity = '1';
                    }, this.TOOLTIP_DELAY);
                }
            }
        });

        document.addEventListener('mouseout', (e) => {
            const target = e.target.closest('[data-tooltip]');
            const tooltip = document.getElementById('common-tooltip');
            if (target && tooltip) {
                if (this.tooltipTimeout) clearTimeout(this.tooltipTimeout);
                tooltip.style.display = 'none';
                tooltip.style.opacity = '0';
            }
        });

        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                this.closeAllModals();
            }
        });
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        let icon = 'fa-info-circle';
        if (type === 'success') icon = 'fa-check-circle';
        if (type === 'achievement') icon = 'fa-trophy';
        if (type === 'error') icon = 'fa-exclamation-triangle';
        toast.innerHTML = `<i class="fas ${icon}"></i> <span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 50);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => { if (toast.parentNode === container) container.removeChild(toast); }, 400);
        }, 6000); 
    }

    showConfirm(title, message, onConfirm) {
        const modal = document.getElementById('confirm-modal');
        if (!modal) return;
        document.getElementById('confirm-title').innerText = title;
        document.getElementById('confirm-message').innerText = message;
        const yesBtn = document.getElementById('confirm-yes');
        const noBtn = document.getElementById('confirm-no');
        const newYesBtn = yesBtn.cloneNode(true);
        const newNoBtn = noBtn.cloneNode(true);
        yesBtn.parentNode.replaceChild(newYesBtn, yesBtn);
        noBtn.parentNode.replaceChild(newNoBtn, noBtn);
        newYesBtn.onclick = () => { modal.style.display = 'none'; onConfirm(); };
        newNoBtn.onclick = () => { modal.style.display = 'none'; };
        modal.style.display = 'flex';
    }

    showTooltip(e, text) {
        const tooltip = document.getElementById('common-tooltip');
        if (tooltip) {
            tooltip.innerText = text;
            tooltip.style.display = 'block';
            tooltip.style.left = `${e.clientX + 15}px`;
            tooltip.style.top = `${e.clientY + 15}px`;
        }
    }

    hideTooltip() {
        const tooltip = document.getElementById('common-tooltip');
        if (tooltip) tooltip.style.display = 'none';
    }

    toggleAccordion(id) {
        const accordion = document.getElementById(id);
        if (accordion) {
            const isActive = accordion.classList.toggle('active');
            if (!window.masterData.settings.accordionStates) window.masterData.settings.accordionStates = {};
            window.masterData.settings.accordionStates[id] = isActive;
            if (window.saveAllData) window.saveAllData(); 
        }
    }

    applyAccordionStates() {
        const states = window.masterData.settings?.accordionStates;
        if (!states) return;
        for (const [id, isActive] of Object.entries(states)) {
            const el = document.getElementById(id);
            if (el) el.classList.toggle('active', !!isActive);
        }
    }

    /**
     * ✨ [핵심 수정] 설정 모달을 열 때 모든 마스터 데이터를 UI에 강제 동기화합니다.
     */
    toggleSettings(show) {
        const modal = document.getElementById('settings-modal');
        if (!modal) return;

        modal.style.display = show ? 'flex' : 'none';
        
        if (show) {
            const s = window.masterData.settings || {}; //
            
            // 1. 일반 설정 (언어, 폰트)
            if (document.getElementById('language-select')) document.getElementById('language-select').value = s.language || 'ko';
            if (document.getElementById('font-select')) document.getElementById('font-select').value = s.font || 'paperlogy';
            
            // 2. 테마 라디오 버튼
            const currentTheme = s.currentTheme || 'DEFAULT_DARK'; 
            const themeRadio = document.querySelector(`input[name="theme-choice"][value="${currentTheme}"]`);
            if (themeRadio) themeRadio.checked = true;

            // 3. ✨ [추가] 화면 레이아웃 버튼 동기화 (가로/세로/미니)
            const currentMode = s.windowMode || 'horizontal'; //
            // 모든 레이아웃 버튼에서 active 클래스 제거
            document.querySelectorAll('.window-mode-btns button').forEach(btn => btn.classList.remove('active'));
            // 현재 모드에 해당하는 버튼에만 active 클래스 추가
            const modeBtn = document.getElementById(`btn-layout-${currentMode}`);
            if (modeBtn) modeBtn.classList.add('active');

            // 4. 시스템 및 알림 토글
            const autoStartToggle = document.getElementById('auto-start-toggle');
            if (autoStartToggle) autoStartToggle.classList.toggle('active', !!s.autoStart);

            const cylinderToggle = document.getElementById('cylinder-toast-toggle');
            if (cylinderToggle) cylinderToggle.classList.toggle('active', s.showCylinderToast !== false);

            // 5. 일과 관리 토글
            const hideCompToggle = document.getElementById('hide-completed-toggle');
            if (hideCompToggle) hideCompToggle.classList.toggle('active', !!s.hideCompleted);

            const showPastToggle = document.getElementById('show-past-toggle');
            if (showPastToggle) showPastToggle.classList.toggle('active', !!s.showPastCompleted);
            
            const autoDeleteToggle = document.getElementById('auto-delete-toggle');
            if (autoDeleteToggle) autoDeleteToggle.classList.toggle('active', !!s.autoDeleteOldTasks);

            // 6. 초기화 시간 및 사운드 UI
            if (document.getElementById('reset-hour-select')) document.getElementById('reset-hour-select').value = s.resetHour || 0;
            
            if (window.updateSoundUI) window.updateSoundUI(); 
            if (window.switchSettingsTab) window.switchSettingsTab('general'); 
        }
    }

    toggleMusicSettings(show) {
        const panel = document.getElementById('panel-music');
        if (!panel) return;
        const isActive = (show !== undefined) ? show : !panel.classList.contains('active');
        panel.classList.toggle('active', isActive);
        if (isActive) {
            if (window.updateSoundUI) window.updateSoundUI();
            if (window.soundManager) window.soundManager.refreshList('music');
        }
    }

    toggleAmbientSettings(show) {
        const panel = document.getElementById('panel-ambient');
        if (!panel) return;
        const isActive = (show !== undefined) ? show : !panel.classList.contains('active');
        panel.classList.toggle('active', isActive);
        if (isActive) {
            if (window.updateSoundUI) window.updateSoundUI();
            if (window.soundManager) window.soundManager.refreshList('ambient');
        }
    }

    // ❌ 하단에 있던 중복된 toggleSettings(show) { ... } 함수를 완전히 삭제했습니다.

    closeAllModals() {
        document.querySelectorAll('.modal-overlay, .alert-overlay').forEach(m => {
            m.style.display = 'none';
        });
        document.querySelectorAll('.player-panel').forEach(p => p.classList.remove('active'));
    }
}

module.exports = UIComponentManager;