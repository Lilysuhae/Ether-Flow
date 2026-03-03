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
     * [핵심] 모든 서신 트리거 조건을 누락 없이 판정하여 조건 충족 시 즉시 발송합니다.
     * @param {Object} stats - masterData.stats (누적 통계 데이터)
     * @param {Object} eventContext - 실시간 발생 이벤트 (예: { type: 'gift_dislike', itemName: '손편지' })
     */
    checkTriggers(stats, eventContext = null) {
        // ✨ [핵심 추가] 알(egg) 상태일 때는 모든 서신 발송을 원천 차단합니다.
        // 이 코드가 최상단에 위치하므로 아래의 복잡한 판정 로직을 타지 않고 즉시 종료됩니다.
        if (stats && stats.current_stage === 'egg') {
            return [];
        }

        const newMails = [];
        const now = new Date();
        const currentHour = now.getHours();
        const currentDay = now.getDay(); // 0: 일, 6: 토

        // 1. 이미 받은 편지는 제외하고 체크할 대상을 선별
        const availablePool = this.mailPool.filter(mail => 
            !this.receivedMails.find(m => m.id === mail.id)
        );

        availablePool.forEach(mail => {
            const triggerList = Array.isArray(mail.triggers) ? mail.triggers : (mail.trigger ? [mail.trigger] : []);
            if (triggerList.length === 0) return;

            const logic = mail.logic || "AND";

            // 2. [절대 누락 금지] 모든 카테고리별 트리거 판정 로직
            const checkCondition = (condition) => {
                const { type, value: targetVal } = condition;
                let isMet = false;

                switch (type) {
                    /* --- [성취 (Achievement)] --- */
                    case 'alchemist_level': 
                        isMet = ((stats.alchemistLevel || 0) >= targetVal); 
                        break;
                    case 'total_focus': 
                        isMet = ((stats.totalFocusTime || 0) >= targetVal);
                        break;
                    case 'todo_count': 
                        isMet = ((stats.todoCount || 0) >= targetVal);
                        break;
                    case 'habit_master': 
                        isMet = ((stats.currentHabitStreak || 0) >= targetVal);
                        break;
                    case 'rich_alchemist': 
                        const currentPoints = window.masterData.collection?.points || 0;
                        isMet = (currentPoints >= targetVal);
                        break;
                    case 'failed_attempt_count': 
                        isMet = ((stats.failedAttempts || 0) >= targetVal);
                        break;
                    case 'owned_count': 
                        isMet = ((stats.ownedHomunculusCount || 0) >= targetVal);
                        break;
                    case 'adult_count': 
                        isMet = ((stats.evolvedAdultCount || 0) >= targetVal);
                        break;

                    /* --- [교감 (Bond)] --- */
                    case 'intimacy_level': 
                        if (window.currentPartner) {
                            const intimacy = (window.charIntimacyMap && window.charIntimacyMap[window.currentPartner.id]) || 0;
                            isMet = (intimacy >= targetVal);
                        }
                        break;
                    case 'daily_pet_limit': 
                        isMet = ((stats.dailyPetCount || 0) >= targetVal);
                        break;
                    case 'gift_total_count': 
                        isMet = ((stats.giftTotalCount || 0) >= targetVal);
                        break;
                    case 'gift_count_favorite': 
                        isMet = ((stats.giftFavoriteCount || 0) >= targetVal);
                        break;
                    case 'first_gift': 
                        if (eventContext && (eventContext.type === 'gift' || eventContext.type === 'gift_favorite')) {
                            isMet = (eventContext.itemName === targetVal);
                        }
                        if (!isMet && stats.gift_history) {
                            isMet = !!stats.gift_history[targetVal];
                        }
                        break;

                    case 'gift_type_dislike': 
                        if (eventContext && eventContext.type === 'gift_dislike') {
                            isMet = (targetVal === true);
                        }
                        if (!isMet && stats.has_dislike_event) {
                            isMet = (targetVal === true);
                        }
                        break;
                    case 'gift_connoisseur': 
                        isMet = ((stats.uniqueGiftsCount || 0) >= targetVal);
                        break;

                    /* --- [몰입 및 환경] --- */
                    case 'marathon_focus': 
                        isMet = ((stats.currentSessionFocusTime || 0) >= targetVal);
                        break;
                    case 'flow_state': 
                        isMet = (stats.flow_state === targetVal);
                        break;
                    case 'night_owl': 
                        isMet = (stats.night_owl === targetVal);
                        break;
                    case 'early_bird': 
                        isMet = (stats.early_bird === targetVal);
                        break;
                    case 'weekend_alchemist': 
                        isMet = (stats.weekend_alchemist === targetVal);
                        break;
                    case 'perfect_day': 
                        isMet = (stats.isPerfectDay === targetVal);
                        break;
                    case 'inactive_days': // 미접속 기간
                        isMet = ((stats.inactiveDays || 0) >= targetVal);
                        break; // ✨ [핵심 수정] break 추가로 아래 'app_juggler'와 섞이지 않도록 차단

                    case 'app_juggler': // 사용 중인 도구 개수
                        isMet = ((stats.activeAppCount || 0) >= targetVal);
                        break;
                    case 'low_efficiency_session':
                        isMet = (stats.low_efficiency_session === targetVal);
                        break;

                    /* --- [기타 (General)] --- */
                    case 'always': 
                        isMet = true;
                        break;
                    case 'current_stage': 
                        isMet = (stats.current_stage === targetVal);
                        break;
                    case 'specific_growth': 
                        if (window.currentPartner) {
                            const growthSec = (window.charGrowthMap && window.charGrowthMap[window.currentPartner.id]) || 0;
                            const growthMin = Math.floor(growthSec / 60);
                            isMet = (growthMin >= targetVal); 
                        }
                        break;
                    case 'partner_id': 
                        isMet = (stats.partnerId === targetVal);
                        break;
                    case 'previous_streak': 
                        isMet = ((stats.previousMaxStreak || 0) >= targetVal);
                        break;

                    default:
                        isMet = (stats[type] === targetVal);
                        break;
                }
                return isMet;
            };

            // 3. 논리 연산 처리 (AND/OR)
            const isMet = (logic === "OR") 
                ? triggerList.some(checkCondition) 
                : triggerList.every(checkCondition);

            // 4. 즉시 발송 및 중복 방지
            if (isMet) {
                this.addMail(mail);
                newMails.push(mail);
                console.log(`✉️ [Mailbox] 서신 조건 충족 발송: ${mail.title} (ID: ${mail.id})`);
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