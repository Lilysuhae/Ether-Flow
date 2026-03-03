/**
 * [src/ThemeFontManager.js]
 * 연구실의 테마, 폰트, 레이아웃 모드(가로/세로/미니) 등 시각적 설정을 관리합니다.
 */
const { ipcRenderer } = require('electron');
const path = require('path');
const { THEMES } = require(path.join(__dirname, '..', 'themes.js'));

class ThemeFontManager {
    constructor() {
        this.setupWindowGlobals();
    }

    /**
     * 기존 renderer.js와의 호환성을 위해 전역 window 객체에 함수들을 바인딩합니다.
     */
    setupWindowGlobals() {
        window.applyTheme = this.applyTheme.bind(this);
        window.changeTheme = this.changeTheme.bind(this);
        window.changeFont = this.changeFont.bind(this);
        window.applySavedFont = this.applySavedFont.bind(this);
        window.changeWindowMode = this.changeWindowMode.bind(this);
        window.applyWindowMode = this.applyWindowMode.bind(this);
        window.setLayoutMode = this.setLayoutMode.bind(this);
        window.toggleHorizontalMode = this.toggleHorizontalMode.bind(this);
        window.applyHorizontalMode = this.applyHorizontalMode.bind(this);
    }

    /**
     * 테마 실시간 적용
     */
    applyTheme(themeId) {
        const theme = THEMES[themeId];
        if (!theme) {
            console.error(`[테마 에러] ${themeId}를 찾을 수 없어 기본 테마를 적용합니다.`);
            return this.applyTheme('DEFAULT_DARK');
        }

        const root = document.documentElement;
        const app = document.getElementById('app');
        
        // CSS 변수 주입
        Object.entries(theme.variables).forEach(([key, value]) => {
            root.style.setProperty(key, value);
        });

        // 테마 전용 클래스 교체
        if (app) {
            const toRemove = Array.from(app.classList).filter(c => c.startsWith('theme-'));
            app.classList.remove(...toRemove);
            app.classList.add(`theme-${theme.id}`);
        }
        
        document.body.setAttribute('data-theme', theme.id);
    }

    /**
     * 테마 변경 및 저장
     */
    changeTheme(themeKey) {
        console.log(`[테마] 사용자가 "${themeKey}" 선택`);
        this.applyTheme(themeKey);
        
        if (window.masterData && window.masterData.settings) {
            window.masterData.settings.currentTheme = themeKey;
            if (window.saveAllData) window.saveAllData(); 
        }
        
        localStorage.setItem('ether-flow-theme', themeKey); // 백업 저장
    }

    /**
     * 폰트 변경
     */
    changeFont(fontName, needSave = true) {
        const root = document.documentElement;
        
        const fontMapping = {
            'Pretendard': "'Pretendard', sans-serif",
            'Galmuri11': "'Galmuri11', sans-serif",
            'NanumSquareNeo': "'NanumSquareNeo', sans-serif",
            'paperlogy': "'Paperlogy', sans-serif",
            'okticon': "'okticon', sans-serif",
            'MemomentKkukkukk': "'MemomentKkukkukk', sans-serif"
        };

        const selectedFont = fontMapping[fontName] || fontMapping['paperlogy'];
        root.style.setProperty('--main-font', selectedFont); // CSS 변수 반영

        if (window.masterData && window.masterData.settings) {
            window.masterData.settings.font = fontName;
            if (needSave && window.saveAllData) {
                window.saveAllData();
                console.log(`[설정] 폰트 변경: ${fontName}`);
            }
        }
    }

    /**
     * 저장된 폰트 불러오기
     */
    applySavedFont() {
        if (window.masterData && window.masterData.settings && window.masterData.settings.font) {
            const savedFont = window.masterData.settings.font;
            this.changeFont(savedFont, false); 
        }
    }

    /**
     * 창 모드 변경 (가로/세로/미니)
     */
    changeWindowMode(mode) {
        if (!window.masterData.settings) window.masterData.settings = {};
        
        window.masterData.settings.windowMode = mode;
        this.applyWindowMode();
        
        if (window.saveAllData) window.saveAllData();
        
        if (mode === 'mini' && typeof window.toggleSettings === 'function') {
            window.toggleSettings(false); 
        } else {
            const btnGroup = document.querySelector('.window-mode-btns');
            if (btnGroup) {
                btnGroup.querySelectorAll('button').forEach(btn => {
                    const isActive = btn.getAttribute('onclick').includes(`'${mode}'`);
                    btn.classList.toggle('active', isActive);
                });
            }
        }
        
        const modeName = mode === 'mini' ? '미니 위젯' : (mode === 'horizontal' ? '가로' : '세로');
        if (window.showToast) window.showToast(`${modeName} 모드로 전환합니다.`, "info");
    }

    /**
     * 창 모드 실제 적용 (CSS 및 메인 프로세스 통신)
     */
    applyWindowMode() {
        const mode = window.masterData.settings.windowMode || 'horizontal';
        const app = document.getElementById('app');

        if (app) {
            app.classList.remove('mode-horizontal', 'mode-vertical', 'mode-mini');
            app.classList.add(`mode-${mode}`);
            
            if (mode === 'horizontal') app.classList.add('horizontal-mode');
            else app.classList.remove('horizontal-mode');
        }

        ipcRenderer.send('set-window-mode', mode); //
    }

    /**
     * 레이아웃 설정 (라디오 버튼 연동)
     */
    setLayoutMode(isHorizontal) {
        window.isHorizontalMode = isHorizontal;
        this.applyHorizontalMode(); 
        if (window.saveAllData) window.saveAllData();
    }

    /**
     * 가로 모드 토글 (레거시 지원)
     */
    toggleHorizontalMode() {
        window.isHorizontalMode = !window.isHorizontalMode;
        this.applyHorizontalMode();
        if (window.saveAllData) window.saveAllData();
    }

    /**
     * 가로 모드 클래스 적용
     */
    applyHorizontalMode() { 
        const app = document.getElementById('app'); 
        if (app) {
            if (window.isHorizontalMode) app.classList.add('horizontal-mode');
            else app.classList.remove('horizontal-mode');
        }
    }
}

module.exports = ThemeFontManager;