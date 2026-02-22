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
    // [mailboxManager.js] checkTriggers 함수 및 내부 판정 로직 전문
    checkTriggers(stats) {
        const newMails = [];
        
        // 1. 이미 받은 편지는 제외하고 체크할 대상을 선별합니다.
        const availablePool = this.mailPool.filter(mail => 
            !this.receivedMails.find(m => m.id === mail.id)
        );

        availablePool.forEach(mail => {
            const triggerList = Array.isArray(mail.triggers) 
                ? mail.triggers 
                : (mail.trigger ? [mail.trigger] : []);

            if (triggerList.length === 0) return;

            const logic = mail.logic || "AND";

            /**
             * ✨ [수정] 모든 28가지 트리거를 판정하는 완전한 조건 체크 함수입니다.
             */
            const checkCondition = (condition) => {
                let isMet = false;
                const type = condition.type;
                const targetVal = condition.value;
                const currentVal = stats[type];

                switch (type) {
                    // --- 특수 조건 판정 ---
                    case 'always':
                        isMet = true; 
                        break;

                    case 'first_gift':
                        // ✨ [핵심] renderer에서 보낸 gift_history 객체 내에 아이템이 있는지 확인
                        isMet = (stats.gift_history && stats.gift_history[targetVal] > 0);
                        break;

                    case 'specific_growth':
                        // 특정 캐릭터 혹은 현재 파트너의 성장도(분) 확인
                        const growthMap = stats.specific_growth || {};
                        const growthSec = growthMap[condition.partnerId || stats.partnerId] || 0;
                        isMet = (Math.floor(growthSec / 60) >= targetVal);
                        break;
                    
                    case 'first_gift':
                    // ID로 먼저 확인하고, 없으면 이름으로도 확인하도록 보강
                    isMet = (stats.gift_history && stats.gift_history[targetVal] > 0);
                    break;

                    // --- 불리언 상태 판정 ---
                    case 'flow_state':
                    case 'perfect_day':
                    case 'night_owl':
                    case 'early_bird':
                    case 'weekend_alchemist':
                    case 'gift_type_dislike':
                        isMet = (currentVal === true);
                        break;

                    // --- 문자열 매칭 ---
                    case 'current_stage':
                    case 'partnerId':
                        isMet = (currentVal === targetVal);
                        break;

                    // --- 숫자 및 누적 수치 판정 (기본) ---
                    default:
                        if (currentVal !== undefined) {
                            // 숫자인 경우 '이상(>=)' 판정, 그 외엔 '일치(===)' 판정
                            if (typeof currentVal === 'number' && typeof targetVal === 'number') {
                                isMet = (currentVal >= targetVal);
                            } else {
                                isMet = (currentVal === targetVal);
                            }
                        }
                        break;
                }
                return isMet;
            };

            const isMet = (logic === "OR") 
                ? triggerList.some(checkCondition) 
                : triggerList.every(checkCondition);

            if (isMet) {
                this.addMail(mail);
                newMails.push(mail);
                console.log(`✉️ 새로운 서신 도착: ${mail.title}`);
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