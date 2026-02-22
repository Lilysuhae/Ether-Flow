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
        
        // 이미 받은 편지는 제외하고 체크할 대상을 선별합니다.
        const availablePool = this.mailPool.filter(mail => 
            !this.receivedMails.find(m => m.id === mail.id)
        );

        availablePool.forEach(mail => {
            // 단일 trigger 또는 다중 triggers 배열 모두 대응합니다.
            const triggerList = Array.isArray(mail.triggers) 
                ? mail.triggers 
                : (mail.trigger ? [mail.trigger] : []);

            if (triggerList.length === 0) return;

            // logic 필드가 없으면 기본값으로 "AND"를 사용합니다.
            const logic = mail.logic || "AND";

            /**
             * 개별 조건이 충족되었는지 판정하는 내부 헬퍼 함수입니다.
             */
            const checkCondition = (condition) => {
                let isMet = false;
                const type = condition.type;
                const targetVal = condition.value;

                // [핵심] JSON의 조건 타입(Snake_case)과 시스템 데이터(CamelCase)를 연결합니다.
                switch (type) {
                    case 'adultCount':
                        // 성체 진화 횟수 체크
                        isMet = (stats.adultCount >= targetVal);
                        break;

                    case 'owned_count':
                        // 보유 캐릭터 수 체크 (Snake/Camel 대응)
                        const currentOwned = stats.owned_count !== undefined ? stats.owned_count : stats.ownedCount;
                        isMet = (currentOwned >= targetVal);
                        break;

                    case 'rich_alchemist':
                        // 보유 에테르 체크 (Snake/Camel 대응)
                        const currentPoints = stats.rich_alchemist !== undefined ? stats.rich_alchemist : stats.points;
                        isMet = (currentPoints >= targetVal);
                        break;

                    case 'app_juggler':
                        // 사용 도구 수 체크 (Snake/Camel 대응)
                        const currentApps = stats.app_juggler !== undefined ? stats.app_juggler : stats.uniqueAppsCount;
                        isMet = (currentApps >= targetVal);
                        break;

                    case 'marathon_focus':
                        // 연속 집중 시간 체크 (Snake/Camel 대응)
                        const currentFocus = stats.marathon_focus !== undefined ? stats.marathon_focus : stats.maxContinuousFocus;
                        isMet = (currentFocus >= targetVal);
                        break;

                    case 'weekend_alchemist':
                        // 주말 판정 (일요일: 0, 토요일: 6)
                        isMet = (stats.currentDay === 0 || stats.currentDay === 6);
                        break;

                    default:
                        // 정의되지 않은 기타 조건은 stats 객체에서 직접 필드명을 찾아 비교합니다.
                        const genericVal = stats[type];
                        if (typeof genericVal === 'number' && typeof targetVal === 'number') {
                            isMet = (genericVal >= targetVal);
                        } else {
                            isMet = (genericVal === targetVal);
                        }
                }
                return isMet;
            };

            // 3. 설정된 로직(AND/OR)에 따라 최종 수신 여부를 결정합니다.
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