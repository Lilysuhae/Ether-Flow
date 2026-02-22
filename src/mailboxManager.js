/**
 * [MailboxManager.js] 
 * 서신 시스템의 핵심 로직을 담당하는 매니저 클래스입니다.
 * 모든 트리거 조건을 누락 없이 판정하며 데이터 정합성을 유지합니다.
 */
class MailboxManager {
    constructor(initialData, poolData) {
        // initialData: masterData.mailbox (저장된 수신 목록)
        // poolData: mailbox_pool.json (전체 편지 템플릿)
        this.receivedMails = initialData || [];
        this.mailPool = poolData || [];
    }

    /**
     * 조건이 충족된 편지를 수신함에 추가합니다.
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
     * 렌더러로부터 받은 통계(stats)를 바탕으로 모든 서신 트리거를 체크합니다.
     */
    checkTriggers(stats) {
        const newMails = [];
        
        // 1. 이미 받은 편지는 제외하고 체크할 대상을 선별합니다.
        const availablePool = this.mailPool.filter(mail => 
            !this.receivedMails.find(m => m.id === mail.id)
        );

        availablePool.forEach(mail => {
            // 2. 단일 trigger 또는 다중 triggers 배열 모두 대응합니다.
            const triggerList = Array.isArray(mail.triggers) 
                ? mail.triggers 
                : (mail.trigger ? [mail.trigger] : []);

            if (triggerList.length === 0) return;

            // 서신 데이터에 logic이 없으면 기본적으로 "AND"를 사용합니다.
            const logic = mail.logic || "AND";

            /**
             * [내부 헬퍼] 개별 조건을 판정합니다. (28개 트리거 전원 대응)
             */
            const checkCondition = (condition) => {
                let isMet = false;
                const type = condition.type;
                const targetVal = condition.value;
                const currentVal = stats[type];

                switch (type) {
                    // --- [기타 및 특수 조건] ---
                    case 'always':
                        isMet = true; 
                        break;

                    case 'first_gift':
                        // 특정 아이템(targetVal)을 선물한 기록이 있는지 확인
                        isMet = (stats.gift_history && stats.gift_history[targetVal] > 0);
                        break;

                    case 'specific_growth':
                        // 특정 캐릭터의 성장도(분) 확인 (성체 진화 등)
                        const growthMap = stats.specific_growth || {};
                        const growthSec = growthMap[condition.partnerId || stats.partnerId] || 0;
                        isMet = (Math.floor(growthSec / 60) >= targetVal);
                        break;

                    // --- [상태 및 환경 (Boolean)] ---
                    case 'night_owl':
                    case 'early_bird':
                    case 'weekend_alchemist':
                    case 'perfect_day':
                    case 'flow_state':
                    case 'gift_type_dislike':
                        // renderer에서 판정된 true/false 값을 그대로 확인
                        isMet = (currentVal === true);
                        break;

                    // --- [문자열 매칭] ---
                    case 'current_stage':
                    case 'partnerId':
                        isMet = (currentVal === targetVal);
                        break;

                    // --- [누적 수치 및 레벨 (Numeric)] ---
                    // 성취: alchemist_level, total_focus, todo_count, habit_master, rich_alchemist, failed_attempt_count, owned_count, adultCount
                    // 교감: intimacy_level, daily_pet_limit, gift_total_count, gift_connoisseur, gift_count_favorite
                    // 몰입: marathon_focus, app_juggler, inactive_days
                    // 기타: previous_streak
                    default:
                        if (currentVal !== undefined) {
                            if (typeof currentVal === 'number' && typeof targetVal === 'number') {
                                isMet = (currentVal >= targetVal); // 기준치 이상이면 충족
                            } else {
                                isMet = (currentVal === targetVal);
                            }
                        }
                        break;
                }
                return isMet;
            };

            // 3. AND/OR 논리 연산 수행 후 최종 수신 결정
            const isMet = (logic === "OR") 
                ? triggerList.some(checkCondition) 
                : triggerList.every(checkCondition);

            if (isMet) {
                this.addMail(mail);
                newMails.push(mail);
                console.log(`✉️ [Mailbox] 새로운 서신 도착: ${mail.title}`);
            }
        });

        return newMails;
    }

    /**
     * 읽지 않은 서신 개수를 반환합니다.
     */
    getUnreadCount() {
        return this.receivedMails.filter(m => !m.isRead).length;
    }

    /**
     * 특정 서신을 읽음 처리합니다.
     */
    markAsRead(mailId) {
        const mail = this.receivedMails.find(m => m.id === mailId);
        if (mail) {
            mail.isRead = true;
        }
    }

    /**
     * 보상을 수령 처리합니다.
     */
    claimReward(mailId) {
        const mail = this.receivedMails.find(m => m.id === mailId);
        if (mail && !mail.isRewardClaimed) {
            mail.isRewardClaimed = true;
            return mail.reward;
        }
        return null;
    }

    /**
     * 세이브 데이터에 저장할 수신 목록 배열을 반환합니다.
     */
    getSaveData() {
        return this.receivedMails;
    }
}

// 모듈 내보내기 (CommonJS 환경 대응)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MailboxManager;
}