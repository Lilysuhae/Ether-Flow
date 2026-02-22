/**
 * [src/AchievementManager.js]
 * 연구실의 모든 업적 데이터와 해금 로직을 관리하는 모듈입니다.
 */
class AchievementManager {
    constructor() {
        // 세션 내 중복 알림 방지용 셋
        this.sessionUnlockedAchievements = new Set();
        
        /**
         * 🏆 전체 업적 데이터베이스
         */
        this.list = [
            // 0. 연금술 레벨
            { id: 'rank_novice_1', name: '연금술 입문', icon: 'assets/images/achievements/achievement_alchemy.png', desc: '연금술의 세계에 첫 발을 내디뎠습니다.', hint: '진리의 문을 살짝 두드려봅니다.' },
            { id: 'rank_apprentice_5', name: '수습 연금술사', icon: 'assets/images/achievements/achievement_alchemy.png', desc: '기초 연성법을 익히고 가능성을 증명했습니다.', hint: '실습생의 티를 서서히 벗어냅니다.' },
            { id: 'rank_regular_10', name: '정식 연금술사', icon: 'assets/images/achievements/achievement_alchemy.png', desc: '능숙한 도구 사용으로 정식 대원이 되었습니다.', hint: '길드에서 당신의 이름을 기억하기 시작합니다.' },
            { id: 'rank_expert_15', name: '전문 연금술사', icon: 'assets/images/achievements/achievement_alchemy.png', desc: '고도화된 지식과 실무 능력을 겸비했습니다.', hint: '이론과 실기 중 어느 하나 소홀히 하지 않습니다.' },
            { id: 'rank_senior_20', name: '상급 연금술사', icon: 'assets/images/achievements/achievement_alchemy.png', desc: '길드 내에서 존경받는 상급 연구자의 자리에 올랐습니다.', hint: '동료 연금술사들의 선망 어린 시선을 즐깁니다.' },
            { id: 'rank_veteran_25', name: '노련한 연금술사', icon: 'assets/images/achievements/achievement_alchemy.png', desc: '수많은 경험을 통해 노련한 통찰력을 갖추었습니다.', hint: '수많은 연성로의 불꽃을 보아온 눈을 증명합니다.' },
            { id: 'rank_master_30', name: '연금술 명장', icon: 'assets/images/achievements/achievement_alchemy.png', desc: '에테르 연성을 예술의 경지로 끌어올린 명장입니다.', hint: '기술이 예술의 경지에 닿는 찰나를 경험합니다.' },
            { id: 'rank_harmonizer_35', name: '원소의 조율자', icon: 'assets/images/achievements/achievement_alchemy.png', desc: '사대 원소의 균형을 완벽하게 다스리는 조율자입니다.', hint: '사대 원소 사이의 완벽한 균형점을 찾아냅니다.' },
            { id: 'rank_guardian_40', name: '지혜의 파수꾼', icon: 'assets/images/achievements/achievement_alchemy.png', desc: '심연의 지식을 수호하고 금기를 다스리는 파수꾼입니다.', hint: '금지된 서가의 문턱을 넘을 자격을 갖춥니다.' },
            { id: 'rank_interpreter_45', name: '비전의 해석자', icon: 'assets/images/achievements/achievement_alchemy.png', desc: '고대의 비전과 비밀스러운 공식을 완벽히 해석했습니다.', hint: '고대의 문자들이 당신에게 속삭이는 소리를 듣습니다.' },
            { id: 'rank_truth_50', name: '진리의 도달자', icon: 'assets/images/achievements/achievement_alchemy.png', desc: '인간의 한계를 넘어 진리의 문턱에 도달한 탐구자입니다.', hint: '한계를 넘어선 자만이 볼 수 있는 풍경을 마주합니다.' },
            { id: 'rank_lord_55', name: '에테르의 군주', icon: 'assets/images/achievements/achievement_alchemy.png', desc: '세상의 모든 에테르 흐름을 지배하는 위대한 군주입니다.', hint: '에테르의 파동이 당신의 맥박과 함께 뜁니다.' },
            { id: 'rank_legend_60', name: '전설의 연금술사', icon: 'assets/images/achievements/achievement_alchemy.png', desc: '연금술 역사에 영원히 기록될 신화적인 존재가 되었습니다.', hint: '역사가 당신의 이름을 기록하는 방식을 지켜봅니다.' },

            // 1. 몰입 및 시간 관련 업적
            { id: 'guild_focus_20h', name: '몰입의 싹', icon: 'assets/images/achievements/achievement_focus.png', desc: '누적 20시간의 몰입을 달성하여 새로운 가능성의 싹을 틔웠습니다.', hint: '갓 피어난 몰입의 싹이 거대한 나무가 되기를 기대합니다.' },
            { id: 'guild_focus_40h', name: '고요한 습관', icon: 'assets/images/achievements/achievement_focus.png', desc: '누적 40시간의 몰입을 달성하여 고요한 집중을 흔들림 없는 습관으로 만들었습니다.', hint: '연성로 앞을 지키는 고요한 시간이 습관으로 자리 잡았습니다.' },
            { id: 'guild_focus_60h', name: '단단한 토대', icon: 'assets/images/achievements/achievement_focus.png', desc: '누적 60시간의 몰입을 달성하여 위대한 연금술사가 되기 위한 굳건한 토대를 다졌습니다.', hint: '흔들리지 않는 단단한 토대 위에 위대한 성취가 쌓입니다.' },
            { id: 'guild_focus_80h', name: '궤도에 오른 자', icon: 'assets/images/achievements/achievement_focus.png', desc: '누적 80시간의 몰입을 달성하여 연구를 가장 안정적인 궤도에 올려놓았습니다.', hint: '흔들림 없는 집중력이 당신을 안정적인 궤도로 이끌었습니다.' },
            { id: 'guild_focus_100h', name: '백 시간의 증명', icon: 'assets/images/achievements/achievement_focus.png', desc: '누적 100시간의 몰입을 달성하여 연금술을 향한 꺼지지 않는 열정을 공식적으로 증명했습니다.', hint: '백 시간의 땀방울이 당신의 진정한 열정을 증명합니다.' },
            { id: 'guild_focus_120h', name: '숙련된 집중', icon: 'assets/images/achievements/achievement_focus.png', desc: '누적 120시간의 몰입을 달성하여 한층 더 능숙하고 깊이 있는 집중력을 보여주었습니다.', hint: '반복된 헌신이 당신의 집중을 한 차원 더 능숙하게 만들었습니다.' },
            { id: 'guild_focus_140h', name: '식지 않는 열기', icon: 'assets/images/achievements/achievement_focus.png', desc: '누적 140시간의 몰입을 달성하여 연성로 앞에서의 멈추지 않는 꾸준함을 보여주었습니다.', hint: '연성로의 불꽃보다 뜨거운 당신의 꾸준함을 응원합니다.' },
            { id: 'guild_focus_160h', name: '인내의 가치', icon: 'assets/images/achievements/achievement_focus.png', desc: '누적 160시간의 몰입을 달성하여 고독한 사투 끝에 인내의 진정한 가치를 깨달았습니다.', hint: '고독을 견뎌낸 자만이 인내의 진정한 가치를 알 수 있습니다.' },
            { id: 'guild_focus_180h', name: '심화된 탐구', icon: 'assets/images/achievements/achievement_focus.png', desc: '누적 180시간의 몰입을 달성하여 초보적인 단계를 벗어나 본격적이고 심화된 탐구에 접어들었습니다.', hint: '깊이를 더해가는 탐구가 짙은 에테르를 뿜어냅니다.' },
            { id: 'guild_focus_200h', name: '길드의 유망주', icon: 'assets/images/achievements/achievement_focus.png', desc: '누적 200시간의 몰입을 달성하여 연금술 길드가 가장 주목하는 최고의 유망주로 성장했습니다.', hint: '위대한 현자가 되기 위한 당신의 여정을 길드가 주목하고 있습니다.' },

            { id: 'focus_depth_5000', name: '몰입의 심연', icon: 'assets/images/achievements/achievement_task.png', desc: '누적 5,000분의 몰입을 달성하여 심연의 끝에 도달했습니다.', hint: '침묵 속에서 쌓인 시간의 힘을 믿습니다.' },
            { id: 'marathon_king_180', name: '불굴의 집중력', icon: 'assets/images/achievements/achievement_task.png', desc: '한 번의 흐트러짐 없이 180분간 연성로의 불꽃을 지켜냈습니다.', hint: '눈 한번 깜빡이지 않고 진리를 쫓는 인내를 보입니다.' },
            { id: 'night_monarch', name: '심야의 수호자', icon: 'assets/images/achievements/achievement_task.png', desc: '모두가 잠든 밤, 고요한 정적 속에서 가장 찬란한 진리를 일깨웠습니다.', hint: '달빛만이 연성로를 비추는 고요한 시간을 보냅니다.' },
            { id: 'dawn_pioneer', name: '새벽의 선구자', icon: 'assets/images/achievements/achievement_task.png', desc: '가장 맑은 새벽 에테르를 정제하며 완벽한 하루를 시작했습니다.', hint: '태양이 지평선을 넘기 전, 가장 먼저 깨어나 일합니다.' },

            // 2. 과업 및 습관 관련 업적
            { id: 'task_centurion', name: '백 번의 성취', icon: 'assets/images/achievements/achievement_task.png', desc: '백 번의 과업 완수를 통해 연금술의 견고한 토대를 쌓았습니다.', hint: '수많은 작은 마침표들을 모아 하나의 선을 만듭니다.' },
            { id: 'task_grandmaster', name: '성취의 거장', icon: 'assets/images/achievements/achievement_task.png', desc: '천 번의 마침표를 찍으며 연금술의 거장 반열에 올랐습니다.', hint: '천 번의 휘두름으로 보검을 제련하는 마음을 가집니다.' },
            { id: 'habit_legend_100', name: '백일의 기적', icon: 'assets/images/achievements/achievement_task.png', desc: '100일간의 성실함으로 영혼의 본질을 변화시키는 연금술을 완성했습니다.', hint: '백 번의 해가 뜨고 질 동안 변치 않는 마음을 증명합니다.' },
            { id: 'perfect_rhythm_7', name: '완전무결한 리듬', icon: 'assets/images/achievements/achievement_task.png', desc: '일주일간 단 하나의 결점도 없는 완벽한 생활 리듬을 유지했습니다.', hint: '일주일간 완벽한 박자로 춤추듯 생활합니다.' },

            // 3. 유대 및 캐릭터 관련 업적
            { id: 'homunculus_collector', name: '요람의 주인', icon: 'assets/images/achievements/homunculus_collector.png', desc: '네 마리의 호문클루스를 거느려 연구실의 생태계를 완성했습니다.', hint: '당신의 요람이 다양한 생명으로 가득 차는 순간을 기다립니다.' },
            { id: 'homunculus_collector2', name: '군집의 주인', icon: 'assets/images/achievements/homunculus_collector2.png', desc: '여덟 마리의 호문클루스를 거느려 연구실의 생태계를 진화시켰습니다.', hint: '당신의 요람이 다양한 생명으로 가득 차는 순간을 기다립니다.' },
            { id: 'evolution_master', name: '진화의 입문자', icon: 'assets/images/achievements/evolution_master.png', desc: '네 마리의 피조물을 성공적으로 성체기까지 인도한 육성의 대가입니다.', hint: '호문클루스들이 제 본모습을 찾을 때까지 곁을 지킵니다.' },
            { id: 'evolution_master2', name: '진화의 전문가', icon: 'assets/images/achievements/evolution_master2.png', desc: '여덟 마리의 피조물을 성공적으로 성체기까지 인도한 육성의 대가입니다.', hint: '호문클루스들이 제 본모습을 찾을 때까지 곁을 지킵니다.' },
            { id: 'mabel_eternal_partner', name: '메이벨의 유일한 이해자', icon: 'assets/images/achievements/mabel_eternal_partner.png', desc: '메이벨과 영혼의 무게를 나누는 절대적인 신뢰 관계가 되었습니다.', hint: '부드러운 온기가 영원한 약속으로 변하는 과정을 지켜봅니다.' },
            { id: 'indigo_shadow_bond', name: '인디고의 그림자 동반자', icon: 'assets/images/achievements/indigo_shadow_bond.png', desc: '인디고의 정적 속에 머물며 완벽한 그림자 우대를 공유하게 되었습니다.', hint: '말하지 않아도 전해지는 그림자 같은 침묵을 나눕니다.' },
            { id: 'morgana_abyss_lover', name: '모르가나의 진실한 반려', icon: 'assets/images/achievements/morgana_abyss_lover.png', desc: '모르가나와 함께 심연의 끝에서 가장 은밀한 진실을 마주했습니다.', hint: '심연보다 깊은 곳에서 함께 허물을 벗어 던집니다.' },
            { id: 'aurelia_golden_glory', name: '아우렐리아의 황금빛 파트너', icon: 'assets/images/achievements/aurelia_golden_glory.png', desc: '아우렐리아로부터 정점의 가호를 받는 고결한 동반자로 인정받았습니다.', hint: '가장 높은 곳에서 빛나는 태양의 가호를 받을 자격을 증명합니다.' },
            { id: 'cordelia_eternal_ocean', name: '코델리아의 유일한 바다', icon: 'assets/images/achievements/cordelia_eternal_ocean.png', desc: '유리벽이라는 차가운 경계를 녹여내고, 코델리아와 영혼의 가장 깊은 곳까지 함께 유영하게 되었습니다.', hint: '부드러운 파도에 몸을 맡기고 함께 섞여듭니다.' },
            { id: 'linxia_crimson_bond', name: '린시아의 영원한 도반',  icon: 'assets/images/achievements/linxia_crimson_bond.png',  desc: '린시아가 승천을 포기하고 당신의 곁에 영원히 남기를 맹세했습니다.',  hint: '아홉 번째 꼬리가 하늘이 아닌 당신을 향해 펼쳐집니다.' },
            { id: 'dende_soft_embrace',  name: '덴데의 유일한 안식처',  icon: 'assets/images/achievements/dende_soft_embrace.png',  desc: '덴데가 모든 가시를 거두고 당신의 품을 세상에서 가장 안전한 곳으로 선택했습니다.',  hint: '가장 날카로운 두려움이 가장 부드러운 신뢰로 녹아내립니다.' },
            { id: 'belinda_eternal_steward', name: '벨린다의 영원한 계약자', icon: 'assets/images/achievements/belinda_eternal_steward.png', desc: '당신의 한심함마저 품격 있게 관리하기로 맹세한 집사와 함께, 실패와 성공을 모두 초월한 절대적인 계약 관계에 들어섰습니다.', hint: '독설로 용해된 마음 끝에 남은, 가장 고귀하고 단단한 유대를 마주합니다.' },
            { id: 'Kota_best_friend', name: '코타의 가장 소중한 친구', icon: 'assets/images/achievements/Kota_best_friend.png', desc: '코타는 당신의 가장 소중한 친구가 되었습니다.', hint: '당신의 외로운 여정을 조건 없이 지지해주는 친밀한 벗이 생깁니다.' },
            { id: 'minerva_silent_night', name: '미네르바와 고요한 밤', icon: 'assets/images/achievements/minerva_silent_night.png', desc: '당신의 지성이 밤하늘 별 아래 반짝이게끔 미네르바가 모든 것을 정돈된 흐름으로 만듭니다.', hint: '늦은 밤의 집중은 적막하지만 그 어느때보다도 맑고 또렷합니다.' },
            
            // 4. 전문성 및 자산 관련 업적
            { id: 'sage_alchemist_30', name: '대연금술사의 증표', icon: 'assets/images/achievements/sage_alchemist_30.png', desc: '30레벨의 숙련도에 도달하여 연금술의 현자 경지를 증명했습니다.', hint: '현자의 돌에 다가가는 첫 번째 관문을 통과합니다.' },
            { id: 'midas_hand_10000', name: '황금의 손', icon: 'assets/images/achievements/midas_hand_10000.png', desc: '10,000 에테르를 모아 연구실을 황금빛 풍요로 가득 채웠습니다.', hint: '손이 닿는 모든 곳이 황금으로 빛나는 풍요를 누립니다.' },
            { id: 'generous_creator_50', name: '다정한 창조주', icon: 'assets/images/achievements/generous_creator_50.png', desc: '50번의 선물을 통해 피조물들에게 진심 어린 다정함을 전했습니다.', hint: '대가 없는 선물이 쌓여 특별한 인연의 실타래를 잣습니다.' },
            { id: 'tool_conductor_7', name: '도구의 지휘자', icon: 'assets/images/achievements/tool_conductor_7.png', desc: '일곱 개의 도구를 자유자재로 다루며 업무의 파도를 지휘합니다.', hint: '실험실의 모든 도구를 조율하는 마에스트로가 됩니다.' },
            { id: 'iron_will_failed_10', name: '불굴의 의지', icon: 'assets/images/achievements/iron_will_failed_10.png', desc: '열 번의 실패조차 굴복시키지 못한 단단한 연금술사의 의지를 지녔습니다.', hint: '열 번의 재 속에서도 다시 불꽃을 피워 올립니다.' },
            { id: 'order_avatar_30', name: '절대 질서의 화신', icon: 'assets/images/achievements/order_avatar_30.png', desc: '한 달간의 완벽한 규칙을 통해 혼돈을 이겨내고 절대 질서의 화신이 되었습니다.', hint: '한 달 동안 혼돈을 허락하지 않는 삶을 지속합니다.' }
        ];
    }

    /**
     * 특정 업적을 해금합니다.
     */
    unlock(achievementId) {
        const id = String(achievementId);
        if (!window.masterData.achievements) window.masterData.achievements = [];
        
        // 이미 해금된 업적인지 확인
        if (window.masterData.achievements.includes(id) || this.sessionUnlockedAchievements.has(id)) return;

        this.sessionUnlockedAchievements.add(id);
        window.masterData.achievements.push(id);
        
        // 데이터 저장
        if (window.saveAllData) window.saveAllData();

        // 토스트 알림 연출 (딜레이를 주어 몰입감을 높임)
        setTimeout(() => {
            const ach = this.list.find(a => a.id === id);
            if (window.showToast) {
                window.showToast(`업적 달성: ${ach ? ach.name : "새로운 업적"}`, "achievement");
            }
        }, 1500);
    }
}

module.exports = AchievementManager;