// src/mailboxManager.js
class MailboxManager {
    constructor(initialData, poolData) {
        // initialData: masterData.mailbox (저장된 수신 목록)
        // poolData: mailbox_pool.json (전체 편지 템플릿)
        this.receivedMails = initialData || [];
        this.mailPool = poolData || [];
    }

    /**
     * 트리거가 충족된 편지를 수신함(receivedMails)에 공식적으로 추가합니다.
     */
    addMail(mail) {
        const newEntry = {
            ...mail,
            receivedDate: new Date().toISOString(),
            isRead: false,
            isRewardClaimed: false
        };
        this.receivedMails.unshift(newEntry);
    }

    /**
     * 렌더러로부터 받은 현재 통계(stats)를 바탕으로 편지 수신 조건을 체크합니다.
     */
    checkTriggers(stats) {
        const newMails = [];
        // 이미 받은 편지는 제외하고 체크
        const availablePool = this.mailPool.filter(mail => 
            !this.receivedMails.find(m => m.id === mail.id)
        );

        availablePool.forEach(mail => {
            const triggerList = Array.isArray(mail.triggers) ? mail.triggers : (mail.trigger ? [mail.trigger] : []);
            if (triggerList.length === 0) return;

            const logic = mail.logic || "AND"; // 기본값은 모든 조건 충족(AND)

            const checkCondition = (condition) => {
                const currentVal = stats[condition.type];
                if (currentVal === undefined && condition.type !== 'always') return false;

                // 1. 숫자형 데이터 공통 판정: '이상(>=)'으로 비교 (부동 소수점 및 초과 달성 대응)
                if (typeof condition.value === 'number' && typeof currentVal === 'number') {
                    // 시간대 체크(early_bird 등)가 아닌 일반 수치형 데이터일 때만 적용
                    if (!['early_bird', 'night_owl', 'weekend_alchemist', 'currentHour'].includes(condition.type)) {
                        return currentVal >= condition.value;
                    }
                }

                // 2. 개별 트리거 타입별 상세 판정 로직
                let isMet = false;
                switch (condition.type) {
                    // --- [성취 및 통계] ---
                    case 'total_focus':
                        isMet = (stats.totalTime >= condition.value);
                        break;
                    case 'owned_count':
                        isMet = (stats.ownedCount >= condition.value);
                        break;
                    case 'todo_count':
                        isMet = (stats.todoCount >= condition.value);
                        break;
                    case 'alchemist_level':
                        isMet = (stats.level >= condition.value);
                        break;
                    case 'rich_alchemist':
                        isMet = (stats.points >= condition.value);
                        break;

                    // --- [관계 및 캐릭터 상태] ---
                    case 'partnerId': // 특정 캐릭터가 파트너인지 체크
                        isMet = (stats.partnerId === condition.value);
                        break;
                    case 'intimacy_level': // 현재 파트너의 호감도 체크
                        isMet = (stats.intimacy_level >= condition.value);
                        break;
                    case 'current_stage': // 현재 파트너의 성장 단계 체크 ('egg', 'child', 'adult')
                        isMet = (stats.current_stage === condition.value);
                        break;
                    case 'specific_growth': // 특정 캐릭터의 개별 성장도(분) 체크
                        const growthSec = stats.all_growth ? (stats.all_growth[condition.charId] || 0) : 0;
                        isMet = (growthSec / 60) >= condition.value;
                        break;
                    case 'intimacy_milestone':
                        isMet = (stats.maxIntimacy >= condition.value);
                        break;

                    // --- [상호작용 및 습관] ---
                    case 'daily_pet_limit':
                        isMet = (stats.dailyPetCount >= condition.value);
                        break;
                    case 'gift_connoisseur':
                        isMet = (stats.giftVariety >= condition.value);
                        break;
                    case 'marathon_focus':
                        isMet = (stats.continuousMinutes >= condition.value);
                        break;
                    case 'app_juggler':
                        isMet = (stats.toolUsageCount >= condition.value);
                        break;
                    case 'habit_master':
                        isMet = (stats.maxHabitStreak >= condition.value);
                        break;

                    // --- [환경 및 기타] ---
                    case 'flow_state':
                        isMet = (stats.isFlowActive === condition.value);
                        break;
                    case 'perfect_day':
                        isMet = (stats.isPerfectDay === true);
                        break;
                    case 'early_bird':
                        isMet = (stats.currentHour >= 6 && stats.currentHour <= 9);
                        break;
                    case 'night_owl':
                        isMet = (stats.currentHour >= 0 && stats.currentHour < 5);
                        break;
                    case 'weekend_alchemist':
                        isMet = (stats.currentDay === 0 || stats.currentDay === 6);
                        break;
                    case 'always':
                        isMet = true;
                        break;
                    default:
                        // 정의되지 않은 타입은 일반 일치 비교
                        isMet = (currentVal === condition.value);
                }
                return isMet;
            };

            // 3. AND/OR 논리 연산 수행
            const isMet = (logic === "OR") ? triggerList.some(checkCondition) : triggerList.every(checkCondition);

            if (isMet) {
                this.addMail(mail);
                newMails.push(mail);
            }
        });
        return newMails;
    }

    getUnreadCount() {
        return this.receivedMails.filter(m => !m.isRead).length;
    }

    markAsRead(mailId) {
        const mail = this.receivedMails.find(m => m.id === mailId);
        if (mail) mail.isRead = true;
    }

    claimReward(mailId) {
        const mail = this.receivedMails.find(m => m.id === mailId);
        if (mail && !mail.isRewardClaimed) {
            mail.isRewardClaimed = true;
            return mail.reward;
        }
        return null;
    }

    getSaveData() {
        return this.receivedMails;
    }
}

module.exports = MailboxManager;