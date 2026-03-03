/**
 * [src/UIComponentManager.js]
 * 토스트 알림, 모달, 툴팁, 아코디언 등 연구실의 공용 UI 컴포넌트의 동작을 관리합니다.
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

    /**
     * 기존 HTML onclick 및 외부 참조와의 호환성을 위해 전역 바인딩을 수행합니다.
     */
    setupWindowGlobals() {
        window.showToast = this.showToast.bind(this);
        window.showConfirm = this.showConfirm.bind(this);
        window.showTooltip = this.showTooltip.bind(this);
        window.hideTooltip = this.hideTooltip.bind(this);
        window.toggleAccordion = this.toggleAccordion.bind(this);
        window.applyAccordionStates = this.applyAccordionStates.bind(this);
        window.toggleSettings = this.toggleSettings.bind(this);
        window.closeAllModals = this.closeAllModals.bind(this);
    }

    /**
     * 마우스 추적 및 전역 UI 이벤트를 초기화합니다.
     */
    initEventListeners() {
        // 툴팁 위치 추적용 마우스 좌표 업데이트
        document.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
            const tooltip = document.getElementById('common-tooltip');
            if (tooltip && tooltip.style.display === 'block') {
                tooltip.style.left = `${this.mouseX}px`; 
                tooltip.style.top = `${this.mouseY + 25}px`; 
            }
        });

        // data-tooltip 속성을 가진 요소에 대한 자동 툴팁 처리
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

        // 모달 외각 클릭 시 닫기
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal-overlay')) {
                this.closeAllModals();
            }
        });
    }

    /**
     * 토스트 알림 표시
     */
    showToast(message, type = 'info') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        
        let icon = 'fa-info-circle';
        if (type === 'success') icon = 'fa-check-circle';
        if (type === 'achievement') icon = 'fa-trophy';
        if (type === 'error') icon = 'fa-exclamation-triangle';
        if (type === 'event') icon = 'fa-wand-magic-sparkles';

        toast.innerHTML = `<i class="fas ${icon}"></i> <span>${message}</span>`;
        container.appendChild(toast);
        
        setTimeout(() => toast.classList.add('show'), 50);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode === container) container.removeChild(toast);
            }, 400);
        }, 6000); 
    }

    /**
     * 공용 컨펌 모달 표시
     */
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

        newYesBtn.onclick = () => {
            modal.style.display = 'none';
            onConfirm(); 
        };

        newNoBtn.onclick = () => {
            modal.style.display = 'none';
        };

        modal.style.display = 'flex';
    }

    /**
     * 수동 툴팁 표시
     */
    showTooltip(e, text) {
        const tooltip = document.getElementById('common-tooltip');
        if (!tooltip) return;
        tooltip.innerText = text;
        tooltip.style.display = 'block';
        tooltip.style.left = `${e.clientX + 15}px`;
        tooltip.style.top = `${e.clientY + 15}px`;
    }

    hideTooltip() {
        const tooltip = document.getElementById('common-tooltip');
        if (tooltip) tooltip.style.display = 'none';
    }

    /**
     * 아코디언 토글 및 상태 저장
     */
    toggleAccordion(id) {
        const accordion = document.getElementById(id);
        if (accordion) {
            const isActive = accordion.classList.toggle('active');
            if (!window.masterData.settings.accordionStates) {
                window.masterData.settings.accordionStates = {};
            }
            window.masterData.settings.accordionStates[id] = isActive;
            if (window.saveAllData) window.saveAllData(); 
        }
    }

    /**
     * 저장된 아코디언 상태 복구
     */
    applyAccordionStates() {
        const states = window.masterData.settings?.accordionStates;
        if (!states) return;

        for (const [id, isActive] of Object.entries(states)) {
            const el = document.getElementById(id);
            if (el) {
                el.classList.toggle('active', !!isActive);
            }
        }
    }

    /**
     * 설정 모달 토글 및 UI 동기화
     */
    toggleSettings(show) {
        const modal = document.getElementById('settings-modal');
        if (!modal) return;

        modal.style.display = show ? 'flex' : 'none';
        
        if (show) {
            const s = window.masterData.settings || {};
            // UI 동기화 로직 수행
            if (document.getElementById('language-select')) document.getElementById('language-select').value = s.language || 'ko';
            if (document.getElementById('font-select')) document.getElementById('font-select').value = s.font || 'paperlogy';
            
            const currentTheme = s.currentTheme || 'DEFAULT_DARK'; 
            const themeRadio = document.querySelector(`input[name="theme-choice"][value="${currentTheme}"]`);
            if (themeRadio) themeRadio.checked = true;

            const autoStartToggle = document.getElementById('auto-start-toggle');
            if (autoStartToggle) autoStartToggle.classList.toggle('active', !!s.autoStart);

            const cylinderToggle = document.getElementById('cylinder-toast-toggle');
            if (cylinderToggle) cylinderToggle.classList.toggle('active', s.showCylinderToast !== false);

            if (document.getElementById('reset-hour-select')) document.getElementById('reset-hour-select').value = window.resetHour || 0;
            
            if (window.updateSoundUI) window.updateSoundUI();
            if (window.updatePastItemsUI) window.updatePastItemsUI();
            if (window.switchSettingsTab) window.switchSettingsTab('general'); 
        }
    }

    /**
     * 모든 모달 닫기
     */
    closeAllModals() {
        document.querySelectorAll('.modal-overlay, .alert-overlay').forEach(m => {
            m.style.display = 'none';
        });
    }
}

module.exports = UIComponentManager;