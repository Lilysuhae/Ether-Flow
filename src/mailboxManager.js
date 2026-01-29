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

            // [mailboxManager.js] 시간 관련 비교 로직을 모두 분(Min) 단위로 통일
            const checkCondition = (condition) => {
                // 1. '항상 수신' 조건 처리
                if (condition.type === 'always') return true;

                let isMet = false;
                switch (condition.type) {
                    // --- [시간 관련: 모두 분(Min) 단위로 변환하여 비교] ---
                    
                    case 'total_focus':
                        // 누적 몰입 시간: (초 / 60) >= JSON에 적힌 분
                        isMet = (stats.totalTime / 60) >= condition.value;
                        break;

                    case 'marathon_focus':
                        // 연속 몰입 시간: (초 / 60) >= JSON에 적힌 분
                        // stats.marathonTime은 renderer.js에서 넘겨줘야 합니다.
                        isMet = (stats.marathonTime / 60) >= condition.value;
                        break;

                    case 'specific_growth':
                        // 특정 캐릭터 성장도: (초 / 60) >= JSON에 적힌 분
                        const growthSec = stats.all_growth ? (stats.all_growth[condition.charId] || 0) : 0;
                        isMet = (growthSec / 60) >= condition.value;
                        break;

                    case 'growth_level':
                        // 현재 파트너 성장도: (초 / 60) >= JSON에 적힌 분
                        const currentGrowthSec = stats.all_growth ? (stats.all_growth[stats.partnerId] || 0) : 0;
                        isMet = (currentGrowthSec / 60) >= condition.value;
                        break;

                    // --- [수치 및 상태 관련: 기존 유지] ---
                    case 'owned_count':
                        isMet = (stats.ownedCount >= condition.value);
                        break;
                    case 'todo_count':
                        isMet = (stats.todoCount >= condition.value);
                        break;
                    case 'alchemist_level':
                        isMet = (stats.alchemist_level >= condition.value);
                        break;
                    case 'rich_alchemist':
                        isMet = (stats.points >= condition.value);
                        break;
                    case 'partnerId':
                        isMet = (stats.partnerId === condition.value);
                        break;
                    case 'intimacy_level':
                        isMet = (stats.intimacy_level >= condition.value);
                        break;
                    case 'current_stage':
                        isMet = (stats.current_stage === condition.value);
                        break;
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
                    default:
                        if (typeof stats[condition.type] === 'number' && typeof condition.value === 'number') {
                            isMet = (stats[condition.type] >= condition.value);
                        } else {
                            isMet = (stats[condition.type] === condition.value);
                        }
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