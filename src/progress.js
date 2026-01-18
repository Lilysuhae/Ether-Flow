// [progress.js] 전체 코드 수정

class ProgressManager {
    constructor(initialData) {
        // [교정] renderer.js의 getMolipDate와 동일한 로직으로 현재 날짜 계산
        const now = new Date();
        const rHour = (typeof window !== 'undefined' && window.resetHour) ? window.resetHour : 0;
        if (now.getHours() < rHour) now.setDate(now.getDate() - 1);
        
        // 형식을 'en-CA' (YYYY-MM-DD)로 통일하여 비교 오류 방지
        const today = now.toLocaleDateString('en-CA');
        
        const data = initialData || {
            level: 1,
            currentXP: 0,
            totalFocusTime: 0,
            todayFocusTime: 0,
            lastDate: today
        };

        this.level = data.level;
        this.currentXP = data.currentXP || data.exp || 0;
        this.totalFocusTime = data.totalFocusTime || 0;
        this.todayFocusTime = data.todayFocusTime || 0;
        this.lastDate = data.lastDate;

        // 저장된 날짜와 현재 기준 날짜가 다를 때만 리셋
        if (this.lastDate !== today) {
            this.todayFocusTime = 0;
            this.lastDate = today;
        }
        
        this.xpToNextLevel = this.level * 100;
    }

    recordFocus() {
        this.totalFocusTime++;
        this.todayFocusTime++; // 오늘 작업 시간 누적
        
        // 10초마다 1 XP 추가
        if (this.totalFocusTime % 10 === 0) {
            return this.addXP(1);
        }
        return false;
    }

    getSaveData() {
        return {
            level: this.level,
            currentXP: this.currentXP,
            totalFocusTime: this.totalFocusTime,
            todayFocusTime: this.todayFocusTime, // 이 값이 파일에 저장됩니다.
            lastDate: this.lastDate
        };
    }

    getProgressData() {
        return {
            level: this.level,
            xp: this.currentXP,
            nextXP: this.xpToNextLevel,
            percent: (this.currentXP / this.xpToNextLevel) * 100,
            todayTime: this.todayFocusTime,
            totalTime: this.totalFocusTime
        };
    }

    addXP(amount) {
        this.currentXP += amount;
        let leveledUp = false;
        while (this.currentXP >= this.xpToNextLevel) {
            this.currentXP -= this.xpToNextLevel;
            this.level++;
            this.xpToNextLevel = this.level * 100;
            leveledUp = true;
        }
        return leveledUp;
    }
}

module.exports = ProgressManager;