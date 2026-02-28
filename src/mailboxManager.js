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
                    case 'alchemist_level': // 연금술사 숙련도 레벨
                        // ✨ [수정] || 1 제거: 레벨 0인 유저가 레벨 1 서신을 미리 받는 현상 방지
                        isMet = ((stats.alchemistLevel || 0) >= targetVal); 
                        break;
                    case 'total_focus': // 누적 몰입 시간 (분 단위)
                        isMet = ((stats.totalFocusTime || 0) >= targetVal);
                        break;
                    case 'todo_count': // 누적 완료 과업 개수
                        isMet = ((stats.todoCount || 0) >= targetVal);
                        break;
                    case 'habit_master': // 연속 습관 수행 일수
                        isMet = ((stats.currentHabitStreak || 0) >= targetVal);
                        break;
                    case 'rich_alchemist': // 보유 에테르 포인트
                        // ✨ [수정] 데이터 경로 수정: currency?.ether -> collection?.points (실제 데이터 위치)
                        const currentPoints = window.masterData.collection?.points || 0;
                        isMet = (currentPoints >= targetVal);
                        break;
                    case 'failed_attempt_count': // 누적 실패/중단 횟수
                        isMet = ((stats.failedAttempts || 0) >= targetVal);
                        break;
                    case 'owned_count': // 보유한 호문클루스 개수
                        isMet = ((stats.ownedHomunculusCount || 0) >= targetVal);
                        break;
                    case 'adult_count': // 성체로 진화시킨 개수
                        isMet = ((stats.evolvedAdultCount || 0) >= targetVal);
                        break;

                    /* --- [교감 (Bond)] --- */
                    case 'intimacy_level': // 특정 캐릭터와의 호감도 레벨
                        if (window.currentPartner) {
                            const intimacy = (window.charIntimacyMap && window.charIntimacyMap[window.currentPartner.id]) || 0;
                            isMet = (intimacy >= targetVal);
                        }
                        break;
                    case 'daily_pet_limit': // 일일 쓰다듬기 횟수
                        isMet = ((stats.dailyPetCount || 0) >= targetVal);
                        break;
                    case 'gift_total_count': // 누적 선물 전달 횟수
                        isMet = ((stats.giftTotalCount || 0) >= targetVal);
                        break;
                    case 'gift_count_favorite': // 좋아하는 선물 전달 횟수
                        // ✨ [수정] 키 이름 불일치 해결: gift_count_favorite -> giftFavoriteCount (renderer.js와 동기화)
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

                    case 'gift_type_dislike': // 싫어하는 타입 선물 전달 (실시간 이벤트)
                        if (eventContext && eventContext.type === 'gift_dislike') {
                            isMet = (targetVal === true);
                        }
                        // ✨ [수정] break 위치를 조정하여 백업 체크 로직이 정상 작동하도록 수정
                        if (!isMet && stats.has_dislike_event) {
                            isMet = (targetVal === true);
                        }
                        break;
                    case 'gift_connoisseur': // 선물 종류 수집 또는 특정 조건
                        isMet = ((stats.uniqueGiftsCount || 0) >= targetVal);
                        break;

                    /* --- [몰입 및 환경] --- */
                    case 'marathon_focus': // 한 세션 연속 몰입 시간 (분)
                        isMet = ((stats.currentSessionFocusTime || 0) >= targetVal);
                        break;
                    case 'flow_state': // 초집중 진입 여부
                        // ✨ [수정] 전역 변수 대신 renderer가 넘겨준 실시간 stats.flow_state 사용
                        isMet = (stats.flow_state === targetVal);
                        break;
                    case 'night_owl': // 심야 시간대 (00~05시)
                        isMet = (stats.night_owl === targetVal);
                        break;
                    case 'early_bird': // 이른 아침 (05~09시)
                        isMet = (stats.early_bird === targetVal);
                        break;
                    case 'weekend_alchemist': // 주말 활동 여부
                        isMet = (stats.weekend_alchemist === targetVal);
                        break;
                    case 'perfect_day': // 하루 계획 완전 완수
                        isMet = (stats.isPerfectDay === targetVal);
                        break;
                    case 'inactive_days': // 미접속 기간
                        isMet = ((stats.inactiveDays || 0) >= targetVal);
                    case 'app_juggler': // 사용 중인 도구 개수
                        isMet = ((stats.activeAppCount || 0) >= targetVal);
                        break;

                    case 'low_efficiency_session':
                        isMet = (stats.low_efficiency_session === targetVal);
                        break;

                    /* --- [기타 (General)] --- */
                    case 'always': // 무조건 발생
                        isMet = true;
                        break;
                    case 'current_stage': // 현재 성장 단계 (egg, child, adult)
                        // ✨ [수정] 전역 변수 대신 stats.current_stage 사용
                        isMet = (stats.current_stage === targetVal);
                        break;
                    case 'specific_growth': // 특정 캐릭터 성장도 (함께한 분)
                        if (window.currentPartner) {
                            const growthSec = (window.charGrowthMap && window.charGrowthMap[window.currentPartner.id]) || 0;
                            // ✨ 2. 저장된 '초' 데이터를 '분'으로 변환하여 비교하거나, targetVal을 초로 계산
                            const growthMin = Math.floor(growthSec / 60);
                            isMet = (growthMin >= targetVal); 
                        }
                        break;
                    case 'partner_id': // 현재 선택된 파트너 ID
                        isMet = (stats.partnerId === targetVal);
                        break;
                    case 'previous_streak': // 끊기기 전 이전 연속 기록
                        isMet = ((stats.previousMaxStreak || 0) >= targetVal);
                        break;

                    default:
                        // 정의되지 않은 타입은 stats 내 직접 비교
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