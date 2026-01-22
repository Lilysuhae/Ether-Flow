// themes.js

const THEMES = {
    // 1. 기본 생산성 테마 (기존 다크 모드)
    DEFAULT_DARK: {
        id: "DEFAULT_DARK",
        name: "기본 연구실",
        variables: {
            "--text-primary": "#f5f5f7",
            "--text-secondary": "#a1a1a6",
            "--text-dark": "#1d1d1f",
            "--ios-blue": "#4d7398",
            "--ios-gray": "#98989d",
            "--danger-red": "#ff453a",
            "--primary-gold": "#bd8f62",
            "--glass-bg": "rgba(30, 30, 32, 0.975)",
            "--glass-surface-light": "rgba(255, 255, 255, 0.1)",
            "--glass-modal-bg": "rgba(40, 40, 45, 0.98)",
            "--glass-border": "rgba(255, 255, 255, 0.15)",
            "--radius-main": "1em",
            "--radius-modal": "0.9em",
            "--shadow-blue" : "0 0 10px rgba(10, 132, 255, 0.3)",
            "--shadow-gold" : "0 0 15px rgba(255, 213, 73, 0.2)",
            "--shadow-deep": "0 20px 50px rgba(0, 0, 0, 0.7), 0 0 15px rgba(255, 255, 255, 0.05)",
            "--frame-border": "url('assets/images/border_flask.png')",    // 플라스크 테두리
            "--panel-bg" : "url('assets/images/btn_game.png')",
            "--panel-bg-long" : "url('assets/images/btn_focus.png')"
        }
    },

    // 2. 기본 생산성 테마 (기존 라이트 모드)
    DEFAULT_LIGHT: {
        id: "DEFAULT_LIGHT",
        name: "기본 연구실",
        variables: {
            "--text-primary": "#333",
            "--text-secondary": "#4b4b4b",
            "--text-dark": "#1d1d1f",
            "--ios-blue": "#47a3ff",
            "--ios-gray": "#98989d",
            "--danger-red": "#ff453a",
            "--primary-gold": "#d4a26f",
            "--glass-bg": "#F2F2F7",
            "--glass-surface-light": "rgba(36, 39, 53, 0.03)",
            "--glass-modal-bg": "#F2F2F7",
            "--glass-border": "#c4c4ce",
            "--radius-main": "1em",
            "--radius-modal": "0.9em",
            "--shadow-blue" : "0 0 10px rgba(10, 132, 255, 0.3)",
            "--shadow-gold" : "0 0 15px rgba(255, 213, 73, 0.2)",
            "--shadow-deep": "0 20px 50px rgba(0, 0, 0, 0.7), 0 0 15px rgba(255, 255, 255, 0.05)",
            "--frame-border": "url('assets/images/border_flask.png')",    // 플라스크 테두리
            "--panel-bg" : "url('assets/images/btn_game.png')",
            "--panel-bg-long" : "url('assets/images/btn_focus.png')"
        }
    },

    // 3. 연금술 연구실 테마 (보라색 & 에테르 컨셉)
    ALCHEMY_LAB: {
        id: "alchemy-lab",
        name: "연금술 연구실",
        variables: {
            // [색상 변경] 전체적인 톤을 보라색과 녹색 계열로 변경
            "--text-primary": "#ffffff",
            "--text-secondary": "#65696b",
            "--text-dark": "#333",
            "--ios-blue": "#c08350",       // 강조색: 에테르 보라색
            "--ios-gray": "#7f8c8d",
            "--danger-red": "#e74c3c",
            "--primary-gold": "#c08350",    // 포인트: 연금술 금색
            "--glass-bg": "url('assets/images/bg_alchemy_lab.png')", // 배경: 어두운 보랏빛 유리
            "--glass-surface-light": "rgba(255, 255, 255, 0.1)",
            "--glass-modal-bg": "#1a1a1a",
            "--glass-border": "rgba(255, 255, 255, 0.16)",
            "--radius-main": "1em",
            "--radius-modal": "0.9em",
            "--shadow-blue" : "0 0 10px rgba(180, 149, 47, 0.3)",
            "--shadow-gold" : "0 0 15px rgba(212, 175, 55, 0.2)",
            "--shadow-deep": "0 20px 60px rgba(0, 0, 0, 0.8), 0 0 20px rgba(155, 89, 182, 0.2)",
            "--game-view-bg": "url('assets/images/bg_alchemy_lab.png')", // 연구실 배경
            "--frame-border": "url('assets/images/border_flask.png')",    // 플라스크 테두리
            "--panel-bg" : "url('assets/images/btn_game.png')",
            "--panel-bg-long" : "url('assets/images/btn_focus.png')"
        }
    }
};

module.exports = { THEMES };