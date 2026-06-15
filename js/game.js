// ?????????????????????????
class UndergroundRadioGame {
    constructor() {
        this.gameState = null;
        this.init();
    }

    init() {
        this.loadGame();
        this.setupEventListeners();
        this.renderAll();
    }

    getDefaultState() {
        return {
            day: 1,
            status: {
                power: 100,
                noise: 0,
                rumor: 0,
                fatigue: 0,
                morale: 50
            },
            thresholds: {
                power: 20,
                noise: 70,
                rumor: 70,
                fatigue: 70,
                morale: 30
            },
            resources: {
                food: 20,
                battery: 10,
                parts: 5,
                medicine: 3
            },
            survivors: this.generateSurvivors(),
            equipment: JSON.parse(JSON.stringify(GameData.equipmentList)),
            districts: JSON.parse(JSON.stringify(GameData.districts)),
            schedule: {
                morning: null,
                afternoon: null,
                evening: null
            },
            selectedBroadcast: null,
            currentQuestion: null,
            answeredQuestions: [],
            rumors: [],
            settlementHistory: [],
            todayActions: {
                broadcastDone: false,
                qaDone: 0,
                repairDone: [],
                rumorSuppressDone: [],
                scanDone: 0
            },
            signals: [],
            signalHistory: [],
            gameOver: false
        };
    }

    generateSurvivors() {
        const survivors = [];
        const count = 4 + Math.floor(Math.random() * 3);
        const shuffledNames = [...GameData.survivorNames].sort(() => Math.random() - 0.5);
        
        for (let i = 0; i < count; i++) {
            survivors.push({
                id: 'survivor_' + i,
                name: shuffledNames[i],
                skill: GameData.survivorSkills[Math.floor(Math.random() * GameData.survivorSkills.length)],
                fatigue: Math.floor(Math.random() * 20),
                health: 80 + Math.floor(Math.random() * 20),
                task: null
            });
        }
        return survivors;
    }

    generateRumor() {
        const rumorTemplates = [
            { title: '水源污染谣言', desc: '有人说自来水厂被污染了，不能喝水。', severity: 15 },
            { title: '怪物出没传闻', desc: '传言夜间有怪物在街道游荡。', severity: 20 },
            { title: '食物短缺恐慌', desc: '据说储备物资只够维持一周了。', severity: 18 },
            { title: '政府阴谋论', desc: '有人说这一切都是政府的阴谋。', severity: 12 },
            { title: '传染病扩散', desc: '听说新的传染病正在蔓延。', severity: 22 },
            { title: '救援队骗局', desc: '传言救援队根本不存在。', severity: 15 },
            { title: '核泄漏消息', desc: '据说远处的核电站发生了泄漏。', severity: 25 },
            { title: '暴动计划', desc: '有人在策划抢夺物资的暴动。', severity: 20 }
        ];
        
        const template = rumorTemplates[Math.floor(Math.random() * rumorTemplates.length)];
        return {
            id: 'rumor_' + Date.now() + '_' + Math.random(),
            ...template,
            dayStarted: this.gameState.day
        };
    }

    saveGame() {
        localStorage.setItem('undergroundRadioSave', JSON.stringify(this.gameState));
        this.showEvent('游戏已保存', '你的游戏进度已保存到本地存储。', []);
    }

    loadGame() {
        const saved = localStorage.getItem('undergroundRadioSave');
        if (saved) {
            try {
                this.gameState = JSON.parse(saved);
                this.showEvent('读取存档', '成功读取游戏存档！', []);
            } catch (e) {
                this.gameState = this.getDefaultState();
            }
        } else {
            this.gameState = this.getDefaultState();
            this.generateDailyRumors();
        }
    }

    resetGame() {
        if (confirm('确定要重新开始吗？所有进度将会丢失。')) {
            localStorage.removeItem('undergroundRadioSave');
            this.gameState = this.getDefaultState();
            this.generateDailyRumors();
            this.renderAll();
            this.showEvent('新游戏开始', '欢迎来到地下广播站！你的任务是维持广播运营，安抚民心，管理物资和幸存者。', []);
        }
    }

    setupEventListeners() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        document.getElementById('endDayBtn').addEventListener('click', () => this.endDay());
        document.getElementById('saveBtn').addEventListener('click', () => this.saveGame());
        document.getElementById('loadBtn').addEventListener('click', () => { this.loadGame(); this.renderAll(); });
        document.getElementById('resetBtn').addEventListener('click', () => this.resetGame());

        document.getElementById('doBroadcastBtn').addEventListener('click', () => this.doBroadcast());
        document.getElementById('doRepairBtn').addEventListener('click', () => this.doRepair());
        document.getElementById('suppressRumorBtn').addEventListener('click', () => this.suppressRumor());
        document.getElementById('doScanBtn').addEventListener('click', () => this.doScan());

        ['power', 'noise', 'rumor', 'fatigue', 'morale'].forEach(stat => {
            const slider = document.getElementById(stat + 'ThresholdSlider');
            const valSpan = document.getElementById(stat + 'ThresholdVal');
            slider.addEventListener('input', (e) => {
                this.gameState.thresholds[stat] = parseInt(e.target.value);
                valSpan.textContent = e.target.value;
                this.renderStatus();
            });
        });

        document.getElementById('modalCloseBtn').addEventListener('click', () => this.closeModal());
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
        
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(tabName).classList.add('active');

        if (tabName === 'qa' && !this.gameState.currentQuestion) {
            this.generateQuestion();
        }
    }

    renderAll() {
        this.renderStatus();
        this.renderResources();
        this.renderSurvivors();
        this.renderDistrictTrust();
        this.renderSchedule();
        this.renderBroadcasts();
        this.renderEquipment();
        this.renderRumors();
        this.renderSignals();
        this.renderSettlements();
        this.renderThresholds();
    }

    renderStatus() {
        const { status, thresholds } = this.gameState;
        
        ['power', 'noise', 'rumor', 'fatigue', 'morale'].forEach(stat => {
            const value = Math.max(0, Math.min(100, status[stat]));
            const fill = document.getElementById(stat + 'Fill');
            const val = document.getElementById(stat + 'Value');
            const thresholdDisplay = document.getElementById(stat + 'Threshold');
            
            fill.style.width = value + '%';
            val.textContent = Math.round(value);
            
            const isWarning = (stat === 'power' || stat === 'morale') 
                ? value <= thresholds[stat] 
                : value >= thresholds[stat];
            
            fill.classList.toggle('warning', isWarning);
            thresholdDisplay.textContent = thresholds[stat];
            
            const slider = document.getElementById(stat + 'ThresholdSlider');
            const valSpan = document.getElementById(stat + 'ThresholdVal');
            if (slider) slider.value = thresholds[stat];
            if (valSpan) valSpan.textContent = thresholds[stat];
        });

        document.getElementById('dayCount').textContent = this.gameState.day;
    }

    renderThresholds() {
        Object.keys(this.gameState.thresholds).forEach(stat => {
            document.getElementById(stat + 'Threshold').textContent = this.gameState.thresholds[stat];
        });
    }

    renderResources() {
        const { resources } = this.gameState;
        document.getElementById('foodCount').textContent = resources.food;
        document.getElementById('batteryCount').textContent = resources.battery;
        document.getElementById('partsCount').textContent = resources.parts;
        document.getElementById('medicineCount').textContent = resources.medicine;
    }

    renderSurvivors() {
        const container = document.getElementById('survivorList');
        const repairSelect = document.getElementById('repairSurvivor');
        
        container.innerHTML = '';
        repairSelect.innerHTML = '';

        this.gameState.survivors.forEach(survivor => {
            const card = document.createElement('div');
            card.className = 'survivor-card';
            if (survivor.fatigue >= 70) card.classList.add('exhausted');
            else if (survivor.fatigue >= 40) card.classList.add('tired');

            card.innerHTML = `
                <div class="survivor-name">${survivor.name} <small style="color:#888">[${survivor.skill}]</small></div>
                <div class="survivor-stats">
                    <span>❤️ ${survivor.health}%</span>
                    <span>😴 ${survivor.fatigue}%</span>
                </div>
                ${survivor.task ? `<div class="survivor-task">${survivor.task}</div>` : ''}
            `;
            container.appendChild(card);

            if (!survivor.task) {
                const option = document.createElement('option');
                option.value = survivor.id;
                option.textContent = `${survivor.name} (${survivor.skill})`;
                repairSelect.appendChild(option);
            }
        });
    }

    renderDistrictTrust() {
        const container = document.getElementById('districtTrust');
        container.innerHTML = '';

        this.gameState.districts.forEach(district => {
            const item = document.createElement('div');
            item.className = 'district-item';
            item.innerHTML = `
                <div class="district-name">
                    <span>${district.name}</span>
                    <span style="color:#3498db">${district.trust}%</span>
                </div>
                <div class="district-bar">
                    <div class="district-bar-fill" style="width:${district.trust}%"></div>
                </div>
            `;
            container.appendChild(item);
        });
    }

    renderSchedule() {
        ['morning', 'afternoon', 'evening'].forEach(slot => {
            const optionsContainer = document.getElementById(slot + 'Options');
            const slotDisplay = document.getElementById('slot' + slot.charAt(0).toUpperCase() + slot.slice(1));
            
            optionsContainer.innerHTML = '';
            
            GameData.programTypes.forEach(program => {
                const btn = document.createElement('button');
                btn.className = 'program-btn';
                if (this.gameState.schedule[slot] === program.id) {
                    btn.classList.add('selected');
                }
                
                const effectsText = Object.entries(program.effects)
                    .map(([k, v]) => `${this.getStatName(k)} ${v > 0 ? '+' : ''}${v}`)
                    .join(', ');
                
                btn.innerHTML = `
                    <div>${program.name}</div>
                    <div class="program-effects">${effectsText} | ⚡${program.power}</div>
                `;
                
                btn.addEventListener('click', () => this.selectProgram(slot, program.id));
                optionsContainer.appendChild(btn);
            });

            const current = this.gameState.schedule[slot];
            if (current) {
                const program = GameData.programTypes.find(p => p.id === current);
                slotDisplay.textContent = program ? program.name : '未安排';
            } else {
                slotDisplay.textContent = '未安排';
            }
        });
    }

    renderBroadcasts() {
        const container = document.getElementById('broadcastList');
        container.innerHTML = '';

        GameData.broadcastMessages.forEach(msg => {
            const item = document.createElement('div');
            item.className = 'broadcast-item';
            if (this.gameState.selectedBroadcast === msg.id) {
                item.classList.add('selected');
            }
            
            item.innerHTML = `
                <div class="broadcast-title">${msg.title}</div>
                <div class="broadcast-desc">${msg.content}</div>
            `;
            
            item.addEventListener('click', () => this.selectBroadcast(msg.id));
            container.appendChild(item);
        });

        document.getElementById('doBroadcastBtn').disabled = 
            !this.gameState.selectedBroadcast || this.gameState.todayActions.broadcastDone;
    }

    renderEquipment() {
        const container = document.getElementById('equipmentList');
        const select = document.getElementById('repairEquipment');
        
        container.innerHTML = '';
        select.innerHTML = '';

        this.gameState.equipment.forEach(eq => {
            const item = document.createElement('div');
            item.className = 'equipment-item';
            
            let conditionClass = 'condition-good';
            if (eq.condition <= 30) conditionClass = 'condition-bad';
            else if (eq.condition <= 60) conditionClass = 'condition-warn';

            let barColor = '#2ecc71';
            if (eq.condition <= 30) barColor = '#e74c3c';
            else if (eq.condition <= 60) barColor = '#f39c12';

            item.innerHTML = `
                <div class="equipment-header">
                    <span class="equipment-name">${eq.name}</span>
                    <span class="equipment-condition ${conditionClass}">${eq.condition}%</span>
                </div>
                <div class="equipment-bar">
                    <div class="equipment-bar-fill" style="width:${eq.condition}%; background:${barColor}"></div>
                </div>
                <div style="font-size:11px; color:#888; margin-top:5px">
                    影响: ${eq.effect} | 维修: 🔧${eq.repairCost}零件 | 修复: +${25}%
                </div>
            `;
            container.appendChild(item);

            if (eq.condition < 100 && !this.gameState.todayActions.repairDone.includes(eq.id)) {
                const option = document.createElement('option');
                option.value = eq.id;
                option.textContent = `${eq.name} (${eq.condition}%)`;
                select.appendChild(option);
            }
        });
    }

    renderRumors() {
        const container = document.getElementById('rumorList');
        const select = document.getElementById('rumorToSuppress');
        
        container.innerHTML = '';
        select.innerHTML = '';

        if (this.gameState.rumors.length === 0) {
            container.innerHTML = '<p style="color:#888; text-align:center; padding:20px">暂无活跃谣言</p>';
            return;
        }

        this.gameState.rumors.forEach(rumor => {
            const item = document.createElement('div');
            item.className = 'rumor-item';
            item.innerHTML = `
                <div class="rumor-title">${rumor.title}</div>
                <div class="rumor-desc">${rumor.desc}</div>
                <div class="rumor-severity">
                    <span>严重程度</span>
                    <div class="rumor-severity-bar">
                        <div class="rumor-severity-fill" style="width:${rumor.severity}%"></div>
                    </div>
                    <span>${rumor.severity}%</span>
                </div>
            `;
            container.appendChild(item);

            if (!this.gameState.todayActions.rumorSuppressDone.includes(rumor.id)) {
                const option = document.createElement('option');
                option.value = rumor.id;
                option.textContent = `${rumor.title} (${rumor.severity}%)`;
                select.appendChild(option);
            }
        });

        document.getElementById('suppressRumorBtn').disabled = select.options.length === 0;
    }

    renderSignals() {
        const container = document.getElementById('signalList');
        const historyContainer = document.getElementById('signalHistory');
        const scanBtn = document.getElementById('doScanBtn');
        const scanCountSpan = document.getElementById('scanCount');
        const config = GameData.scanConfig;

        scanCountSpan.textContent = `${this.gameState.todayActions.scanDone}/${config.maxScansPerDay}`;
        scanBtn.disabled = this.gameState.todayActions.scanDone >= config.maxScansPerDay || 
                           this.gameState.status.power < config.basePowerCost;

        container.innerHTML = '';
        
        if (this.gameState.signals.length === 0) {
            container.innerHTML = '<p style="color:#888; text-align:center; padding:40px">暂无捕获的信号，点击上方按钮开始扫描</p>';
        } else {
            const sortedSignals = [...this.gameState.signals].sort((a, b) => {
                if (a.status === 'pending' && b.status !== 'pending') return -1;
                if (a.status !== 'pending' && b.status === 'pending') return 1;
                return b.clarity - a.clarity;
            });

            sortedSignals.forEach(signal => {
                const item = document.createElement('div');
                item.className = 'signal-card';
                
                const riskInfo = this.getRiskLevel(signal.risk);
                const daysLeft = signal.expiresIn - (this.gameState.day - signal.dayFound);
                const isExpiring = daysLeft <= 1;
                const isExpired = daysLeft <= 0;

                let statusBadge = '';
                if (signal.status === 'pending') {
                    statusBadge = `<span class="signal-status pending">待解码</span>`;
                } else if (signal.status === 'decoded') {
                    statusBadge = `<span class="signal-status decoded">已解码</span>`;
                }

                if (isExpired) {
                    item.classList.add('expired');
                } else if (isExpiring) {
                    item.classList.add('expiring');
                }

                item.innerHTML = `
                    <div class="signal-header">
                        <span class="signal-icon">${signal.icon}</span>
                        <div class="signal-title">
                            <div class="signal-name">${signal.name} ${statusBadge}</div>
                            <div class="signal-freq">📻 ${signal.frequency}</div>
                        </div>
                        <span class="signal-risk ${riskInfo.class}">${riskInfo.level}风险</span>
                    </div>
                    <div class="signal-desc">${signal.description}</div>
                    <div class="signal-stats">
                        <div class="signal-stat">
                            <span>清晰度</span>
                            <div class="signal-stat-bar">
                                <div class="signal-stat-fill clarity" style="width:${signal.clarity}%"></div>
                            </div>
                            <span>${signal.clarity}%</span>
                        </div>
                        <div class="signal-stat">
                            <span>解码难度</span>
                            <div class="signal-stat-bar">
                                <div class="signal-stat-fill difficulty" style="width:${signal.difficulty}%"></div>
                            </div>
                            <span>${signal.difficulty}%</span>
                        </div>
                    </div>
                    <div class="signal-footer">
                        <span class="signal-expire ${isExpiring ? 'warning' : ''}">
                            ${isExpired ? '已过期' : `🕒 ${daysLeft} 天后过期`}
                        </span>
                        <div class="signal-actions">
                            ${signal.status === 'pending' && !isExpired ? 
                                `<button class="btn btn-small btn-primary" data-action="decode" data-id="${signal.id}">🔓 解码</button>` : ''}
                            ${signal.status === 'decoded' && !isExpired ? 
                                `<button class="btn btn-small btn-success" data-action="rebroadcast" data-id="${signal.id}">📢 转播</button>` : ''}
                            ${!isExpired ? 
                                `<button class="btn btn-small btn-secondary" data-action="seal" data-id="${signal.id}">🔒 封存</button>` : ''}
                        </div>
                    </div>
                `;

                container.appendChild(item);
            });

            container.querySelectorAll('button[data-action]').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const action = e.target.dataset.action;
                    const id = e.target.dataset.id;
                    if (action === 'decode') this.decodeSignal(id);
                    else if (action === 'rebroadcast') this.rebroadcastSignal(id);
                    else if (action === 'seal') this.sealSignal(id);
                });
            });
        }

        if (historyContainer) {
            historyContainer.innerHTML = '';
            const recentHistory = this.gameState.signalHistory.slice().reverse().slice(0, 10);
            
            if (recentHistory.length === 0) {
                historyContainer.innerHTML = '<p style="color:#666; text-align:center; padding:20px; font-size:12px">暂无历史记录</p>';
            } else {
                recentHistory.forEach(record => {
                    const item = document.createElement('div');
                    item.className = 'signal-history-item';
                    
                    let actionText = '';
                    let actionClass = '';
                    switch(record.action) {
                        case 'decode':
                            actionText = record.success ? '解码成功' : '解码失败';
                            actionClass = record.success ? 'action-success' : 'action-fail';
                            break;
                        case 'rebroadcast':
                            actionText = '已转播';
                            actionClass = 'action-rebroadcast';
                            break;
                        case 'seal':
                            actionText = '已封存';
                            actionClass = 'action-seal';
                            break;
                    }

                    item.innerHTML = `
                        <span class="history-icon">${record.icon}</span>
                        <span class="history-name">${record.name}</span>
                        <span class="history-action ${actionClass}">${actionText}</span>
                        <span class="history-day">第${record.day}天</span>
                    `;
                    historyContainer.appendChild(item);
                });
            }
        }
    }

    renderSettlements() {
        const container = document.getElementById('settlementList');
        container.innerHTML = '';

        if (this.gameState.settlementHistory.length === 0) {
            container.innerHTML = '<p style="color:#888; text-align:center; padding:40px">暂无结算记录</p>';
            return;
        }

        this.gameState.settlementHistory.slice().reverse().forEach(settlement => {
            const item = document.createElement('div');
            item.className = 'settlement-item';
            
            let statsHtml = '';
            Object.entries(settlement.effects).forEach(([stat, value]) => {
                if (value !== 0) {
                    const className = value > 0 ? 'positive' : 'negative';
                    const sign = value > 0 ? '+' : '';
                    statsHtml += `<div class="settlement-stat ${className}"><span>${this.getStatName(stat)}</span><span>${sign}${value}</span></div>`;
                }
            });

            item.innerHTML = `
                <div class="settlement-header">
                    <span>第 ${settlement.day} 天结算</span>
                    <span style="font-size:12px; color:#888">${settlement.summary}</span>
                </div>
                <div class="settlement-stats">${statsHtml}</div>
            `;
            container.appendChild(item);
        });
    }

    renderQuestion() {
        const question = this.gameState.currentQuestion;
        const questionText = document.getElementById('questionText');
        const optionsContainer = document.getElementById('answerOptions');
        const historyContainer = document.getElementById('historyList');

        if (!question) {
            questionText.textContent = '今日问答次数已用完，请明日再来。';
            optionsContainer.innerHTML = '';
        } else {
            questionText.textContent = question.question;
            optionsContainer.innerHTML = '';

            question.options.forEach((option, index) => {
                const btn = document.createElement('button');
                btn.className = 'option-btn';
                btn.textContent = option.text;
                btn.addEventListener('click', () => this.answerQuestion(index));
                optionsContainer.appendChild(btn);
            });
        }

        historyContainer.innerHTML = '';
        this.gameState.answeredQuestions.slice().reverse().forEach(item => {
            const div = document.createElement('div');
            div.className = 'history-item ' + (item.correct ? 'correct' : 'wrong');
            div.innerHTML = `<strong>${item.question}</strong><br><small>${item.correct ? '✓ 回答正确' : '✗ 回答错误'}: ${item.answer}</small>`;
            historyContainer.appendChild(div);
        });
    }

    getStatName(stat) {
        const names = {
            power: '⚡电量',
            noise: '🔊噪声',
            rumor: '🗣️谣言',
            fatigue: '😴疲劳',
            morale: '❤️民心',
            trust: '🤝信任',
            food: '🍞食物',
            battery: '🔋电池',
            parts: '🔧零件'
        };
        return names[stat] || stat;
    }

    selectProgram(slot, programId) {
        this.gameState.schedule[slot] = programId;
        this.renderSchedule();
    }

    selectBroadcast(broadcastId) {
        this.gameState.selectedBroadcast = broadcastId;
        
        const msg = GameData.broadcastMessages.find(m => m.id === broadcastId);
        const preview = document.getElementById('broadcastPreview');
        
        const effectsText = Object.entries(msg.effects)
            .map(([k, v]) => `${this.getStatName(k)} ${v > 0 ? '+' : ''}${v}`)
            .join(' | ');
        
        preview.innerHTML = `
            <h4 style="color:#e94560; margin-bottom:10px">${msg.title}</h4>
            <p>${msg.content}</p>
            <p style="color:#888; font-size:12px; margin-top:10px">效果: ${effectsText} | 耗电: ⚡${msg.power}</p>
        `;
        
        this.renderBroadcasts();
    }

    doBroadcast() {
        const msg = GameData.broadcastMessages.find(m => m.id === this.gameState.selectedBroadcast);
        if (!msg || this.gameState.todayActions.broadcastDone) return;

        if (this.gameState.status.power < msg.power) {
            this.showEvent('电力不足', '电量不足，无法进行播报！', [{ text: '⚡电量不足', type: 'negative' }]);
            return;
        }

        this.applyEffects(msg.effects);
        this.gameState.status.power -= msg.power;
        this.gameState.todayActions.broadcastDone = true;

        const effectTags = Object.entries(msg.effects)
            .filter(([_, v]) => v !== 0)
            .map(([k, v]) => ({
                text: `${this.getStatName(k)} ${v > 0 ? '+' : ''}${v}`,
                type: v > 0 ? 'positive' : 'negative'
            }));

        this.showEvent('播报完成', `已播报：${msg.title}`, effectTags);
        this.renderAll();
    }

    generateQuestion() {
        if (this.gameState.todayActions.qaDone >= 3) {
            this.gameState.currentQuestion = null;
        } else {
            const available = GameData.questionBank.filter(q => 
                !this.gameState.answeredQuestions.some(a => a.question === q.question)
            );
            
            if (available.length > 0) {
                this.gameState.currentQuestion = available[Math.floor(Math.random() * available.length)];
            } else {
                this.gameState.currentQuestion = GameData.questionBank[Math.floor(Math.random() * GameData.questionBank.length)];
            }
        }
        this.renderQuestion();
    }

    answerQuestion(optionIndex) {
        const question = this.gameState.currentQuestion;
        if (!question) return;

        const option = question.options[optionIndex];
        this.applyEffects(option.effects);
        this.gameState.todayActions.qaDone++;

        this.gameState.answeredQuestions.push({
            question: question.question,
            answer: option.text,
            correct: option.correct,
            day: this.gameState.day
        });

        const effectTags = Object.entries(option.effects)
            .filter(([_, v]) => v !== 0)
            .map(([k, v]) => ({
                text: `${this.getStatName(k)} ${v > 0 ? '+' : ''}${v}`,
                type: v > 0 ? 'positive' : 'negative'
            }));

        const title = option.correct ? '回答正确！' : '回答不佳...';
        this.showEvent(title, option.text, effectTags);

        this.generateQuestion();
        this.renderStatus();
    }

    doRepair() {
        const eqId = document.getElementById('repairEquipment').value;
        const survivorId = document.getElementById('repairSurvivor').value;
        
        if (!eqId || !survivorId) return;

        const equipment = this.gameState.equipment.find(e => e.id === eqId);
        const survivor = this.gameState.survivors.find(s => s.id === survivorId);
        
        if (!equipment || !survivor) return;

        if (this.gameState.resources.parts < equipment.repairCost) {
            this.showEvent('零件不足', '没有足够的零件进行维修！', [{ text: '🔧零件不足', type: 'negative' }]);
            return;
        }

        this.gameState.resources.parts -= equipment.repairCost;
        
        const repairBonus = survivor.skill === '维修' ? 15 : 0;
        const repairAmount = 25 + repairBonus;
        equipment.condition = Math.min(100, equipment.condition + repairAmount);
        
        survivor.fatigue += 20;
        survivor.task = `维修 ${equipment.name}`;
        
        this.gameState.todayActions.repairDone.push(eqId);

        this.showEvent('维修完成', `${survivor.name} 完成了 ${equipment.name} 的维修工作！`, [
            { text: `🔧 ${equipment.name} +${repairAmount}%`, type: 'positive' },
            { text: `😴 ${survivor.name} 疲劳 +20`, type: 'negative' }
        ]);

        this.renderAll();
    }

    suppressRumor() {
        const rumorId = document.getElementById('rumorToSuppress').value;
        if (!rumorId) return;

        const rumor = this.gameState.rumors.find(r => r.id === rumorId);
        if (!rumor) return;

        if (this.gameState.status.power < 8) {
            this.showEvent('电力不足', '电量不足，无法发布澄清广播！', [{ text: '⚡电量不足', type: 'negative' }]);
            return;
        }

        this.gameState.status.power -= 8;
        rumor.severity -= 40;
        this.gameState.status.rumor -= 15;
        this.gameState.status.fatigue += 10;
        this.gameState.todayActions.rumorSuppressDone.push(rumorId);

        let effectTags = [
            { text: `🗣️ 谣言 -40%`, type: 'positive' },
            { text: `😴 疲劳 +10`, type: 'negative' }
        ];

        if (rumor.severity <= 0) {
            this.gameState.rumors = this.gameState.rumors.filter(r => r.id !== rumorId);
            this.gameState.status.morale += 10;
            effectTags.push({ text: '✅ 谣言已平息', type: 'positive' });
            effectTags.push({ text: '❤️ 民心 +10', type: 'positive' });
        }

        this.showEvent('发布澄清', `针对"${rumor.title}"发布了官方澄清消息。`, effectTags);
        this.renderAll();
    }

    generateSignal() {
        const signalTypes = GameData.signalTypes;
        const weights = [15, 12, 10, 18, 25, 5, 10, 5];
        const totalWeight = weights.reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;
        let selectedIndex = 0;
        
        for (let i = 0; i < weights.length; i++) {
            random -= weights[i];
            if (random <= 0) {
                selectedIndex = i;
                break;
            }
        }

        const type = signalTypes[selectedIndex];
        const equipment = this.gameState.equipment;
        
        let clarityBonus = 0;
        let riskReduction = 0;
        
        const antenna = equipment.find(e => e.id === 'antenna');
        const transmitter = equipment.find(e => e.id === 'transmitter');
        const mixer = equipment.find(e => e.id === 'mixer');
        
        if (antenna && antenna.condition > 30) {
            clarityBonus += (antenna.condition / 100) * 15;
        }
        if (mixer && mixer.condition > 30) {
            clarityBonus += (mixer.condition / 100) * 10;
        }
        if (transmitter && transmitter.condition > 30) {
            riskReduction += (transmitter.condition / 100) * 10;
        }

        const clarityVariation = (Math.random() - 0.5) * 20;
        const clarity = Math.max(5, Math.min(95, type.baseClarity + clarityBonus + clarityVariation));
        const difficulty = Math.max(10, Math.min(95, type.baseDifficulty + (Math.random() - 0.5) * 15));
        const risk = Math.max(0, Math.min(100, type.baseRisk - riskReduction + (Math.random() - 0.5) * 10));

        return {
            id: 'signal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            typeId: type.id,
            name: type.name,
            icon: type.icon,
            description: type.description,
            clarity: Math.round(clarity),
            difficulty: Math.round(difficulty),
            risk: Math.round(risk),
            expiresIn: type.expiresIn,
            dayFound: this.gameState.day,
            status: 'pending',
            decodeEffects: type.decodeEffects,
            rebroadcastEffects: type.rebroadcastEffects,
            sealEffects: type.sealEffects,
            frequency: this.generateFrequency()
        };
    }

    generateFrequency() {
        const bands = ['AM', 'FM', 'SW', 'HF', 'VHF'];
        const band = bands[Math.floor(Math.random() * bands.length)];
        let freq;
        switch(band) {
            case 'AM':
                freq = (530 + Math.random() * 1000).toFixed(0) + ' kHz';
                break;
            case 'FM':
                freq = (88 + Math.random() * 20).toFixed(1) + ' MHz';
                break;
            case 'SW':
                freq = (3 + Math.random() * 27).toFixed(1) + ' MHz';
                break;
            case 'HF':
                freq = (3 + Math.random() * 27).toFixed(1) + ' MHz';
                break;
            case 'VHF':
                freq = (30 + Math.random() * 270).toFixed(0) + ' MHz';
                break;
        }
        return `${band} ${freq}`;
    }

    doScan() {
        const config = GameData.scanConfig;
        
        if (this.gameState.todayActions.scanDone >= config.maxScansPerDay) {
            this.showEvent('扫描次数已用完', '今日频段扫描次数已达上限，请明日再试。', [{ text: '📡 扫描次数耗尽', type: 'negative' }]);
            return;
        }

        if (this.gameState.status.power < config.basePowerCost) {
            this.showEvent('电力不足', '电量不足，无法进行频段扫描！', [{ text: '⚡电量不足', type: 'negative' }]);
            return;
        }

        this.gameState.status.power -= config.basePowerCost;
        this.gameState.status.fatigue += 5;
        this.gameState.todayActions.scanDone++;

        const antenna = this.gameState.equipment.find(e => e.id === 'antenna');
        let signalCount = config.baseSignalCount;
        if (antenna && antenna.condition > 50) {
            signalCount += Math.floor(antenna.condition / 50);
        }

        const newSignals = [];
        for (let i = 0; i < signalCount; i++) {
            const signal = this.generateSignal();
            newSignals.push(signal);
            this.gameState.signals.push(signal);
        }

        const effectTags = [
            { text: `⚡ 电力 -${config.basePowerCost}`, type: 'negative' },
            { text: `😴 疲劳 +5`, type: 'negative' },
            { text: `📡 发现 ${signalCount} 个信号`, type: 'positive' }
        ];

        const signalNames = newSignals.map(s => `${s.icon} ${s.name}`).join('、');
        this.showEvent('频段扫描完成', `扫描完成，发现以下信号：${signalNames}`, effectTags);
        this.renderAll();
    }

    decodeSignal(signalId) {
        const signal = this.gameState.signals.find(s => s.id === signalId);
        if (!signal || signal.status !== 'pending') return;

        const survivor = this.gameState.survivors.find(s => s.skill === '通讯' && !s.task);
        
        let decodeChance = signal.clarity - signal.difficulty + 30;
        if (survivor) {
            decodeChance += 25;
        }
        decodeChance = Math.max(10, Math.min(95, decodeChance));

        const success = Math.random() * 100 < decodeChance;
        const fatigueCost = survivor ? 10 : 15;

        this.gameState.status.fatigue += fatigueCost;
        if (survivor) {
            survivor.fatigue += 15;
            survivor.task = `解码 ${signal.name}`;
        }

        if (success) {
            signal.status = 'decoded';
            this.applyEffects(signal.decodeEffects);
            
            const effectTags = Object.entries(signal.decodeEffects)
                .filter(([_, v]) => v !== 0)
                .map(([k, v]) => ({
                    text: `${this.getStatName(k)} ${v > 0 ? '+' : ''}${v}`,
                    type: v > 0 ? 'positive' : 'negative'
                }));
            effectTags.unshift({ text: '✅ 解码成功', type: 'positive' });

            this.gameState.signalHistory.push({
                ...signal,
                action: 'decode',
                day: this.gameState.day,
                success: true
            });

            this.showEvent('信号解码成功', `成功解码了"${signal.name}"信号！`, effectTags);
        } else {
            const damage = Math.floor(Math.random() * 10) + 5;
            this.gameState.status.power -= damage;
            
            const effectTags = [
                { text: '❌ 解码失败', type: 'negative' },
                { text: `⚡ 电力 -${damage}`, type: 'negative' }
            ];

            this.gameState.signalHistory.push({
                ...signal,
                action: 'decode',
                day: this.gameState.day,
                success: false
            });

            this.showEvent('信号解码失败', `尝试解码"${signal.name}"信号失败，设备受损。`, effectTags);
        }

        this.renderAll();
    }

    rebroadcastSignal(signalId) {
        const signal = this.gameState.signals.find(s => s.id === signalId);
        if (!signal || signal.status !== 'decoded') return;

        if (this.gameState.status.power < 15) {
            this.showEvent('电力不足', '电量不足，无法进行转播！', [{ text: '⚡电量不足', type: 'negative' }]);
            return;
        }

        this.gameState.status.power -= 15;
        this.gameState.status.fatigue += 8;
        signal.status = 'rebroadcast';

        this.applyEffects(signal.rebroadcastEffects);

        const effectTags = Object.entries(signal.rebroadcastEffects)
            .filter(([_, v]) => v !== 0)
            .map(([k, v]) => ({
                text: `${this.getStatName(k)} ${v > 0 ? '+' : ''}${v}`,
                type: v > 0 ? 'positive' : 'negative'
            }));
        effectTags.unshift({ text: '📢 信号已转播', type: 'positive' });

        if (signal.risk >= 60 && Math.random() < 0.3) {
            const extraRumor = Math.floor(Math.random() * 15) + 5;
            this.gameState.status.rumor += extraRumor;
            effectTags.push({ text: `⚠️ 高风险信号引发关注 🗣️+${extraRumor}`, type: 'negative' });
        }

        this.gameState.signalHistory.push({
            ...signal,
            action: 'rebroadcast',
            day: this.gameState.day
        });

        this.gameState.signals = this.gameState.signals.filter(s => s.id !== signalId);

        this.showEvent('信号转播完成', `已转播"${signal.name}"信号内容。`, effectTags);
        this.renderAll();
    }

    sealSignal(signalId) {
        const signal = this.gameState.signals.find(s => s.id === signalId);
        if (!signal) return;

        signal.status = 'sealed';
        this.applyEffects(signal.sealEffects);

        const effectTags = Object.entries(signal.sealEffects)
            .filter(([_, v]) => v !== 0)
            .map(([k, v]) => ({
                text: `${this.getStatName(k)} ${v > 0 ? '+' : ''}${v}`,
                type: v > 0 ? 'positive' : 'negative'
            }));

        if (effectTags.length === 0) {
            effectTags.push({ text: '🔒 信号已封存', type: 'neutral' });
        } else {
            effectTags.unshift({ text: '🔒 信号已封存', type: 'neutral' });
        }

        this.gameState.signalHistory.push({
            ...signal,
            action: 'seal',
            day: this.gameState.day
        });

        this.gameState.signals = this.gameState.signals.filter(s => s.id !== signalId);

        this.showEvent('信号已封存', `"${signal.name}"信号已被封存记录。`, effectTags);
        this.renderAll();
    }

    getRiskLevel(risk) {
        if (risk < 25) return { level: '低', class: 'risk-low' };
        if (risk < 50) return { level: '中', class: 'risk-medium' };
        if (risk < 75) return { level: '高', class: 'risk-high' };
        return { level: '极高', class: 'risk-extreme' };
    }

    applyEffects(effects) {
        Object.entries(effects).forEach(([key, value]) => {
            if (key === 'trust') {
                this.gameState.districts.forEach(d => {
                    d.trust = Math.max(0, Math.min(100, d.trust + value));
                });
            } else if (this.gameState.status[key] !== undefined) {
                this.gameState.status[key] = Math.max(0, Math.min(100, this.gameState.status[key] + value));
            } else if (this.gameState.resources[key] !== undefined) {
                this.gameState.resources[key] = Math.max(0, this.gameState.resources[key] + value);
            }
        });
    }

    generateDailyRumors() {
        if (Math.random() < 0.6) {
            this.gameState.rumors.push(this.generateRumor());
        }
        if (this.gameState.day > 3 && Math.random() < 0.4) {
            this.gameState.rumors.push(this.generateRumor());
        }
    }

    endDay() {
        const dayEffects = {
            power: 0,
            noise: 0,
            rumor: 0,
            fatigue: 0,
            morale: 0,
            food: 0
        };

        let totalPowerUsed = 0;
        ['morning', 'afternoon', 'evening'].forEach(slot => {
            const programId = this.gameState.schedule[slot];
            if (programId) {
                const program = GameData.programTypes.find(p => p.id === programId);
                if (program) {
                    totalPowerUsed += program.power;
                    Object.entries(program.effects).forEach(([k, v]) => {
                        if (dayEffects[k] !== undefined) {
                            dayEffects[k] += v;
                        }
                    });
                }
            }
        });

        dayEffects.power -= totalPowerUsed;

        const survivorCount = this.gameState.survivors.length;
        dayEffects.food -= survivorCount;
        this.gameState.resources.food += dayEffects.food;

        this.gameState.survivors.forEach(s => {
            if (s.fatigue > 0) {
                s.fatigue = Math.max(0, s.fatigue - 30);
            }
            if (s.task) {
                s.task = null;
            }
        });

        this.gameState.rumors.forEach(rumor => {
            rumor.severity += 10;
            dayEffects.rumor += 5;
        });

        this.gameState.rumors = this.gameState.rumors.filter(r => r.severity <= 100);
        this.gameState.rumors.forEach(r => {
            if (r.severity >= 80) {
                dayEffects.morale -= 8;
            }
        });

        if (this.gameState.status.power <= this.gameState.thresholds.power) {
            dayEffects.morale -= 10;
        }
        if (this.gameState.status.noise >= this.gameState.thresholds.noise) {
            dayEffects.morale -= 5;
            dayEffects.fatigue += 10;
        }
        if (this.gameState.status.rumor >= this.gameState.thresholds.rumor) {
            dayEffects.morale -= 15;
        }
        if (this.gameState.status.fatigue >= this.gameState.thresholds.fatigue) {
            dayEffects.morale -= 5;
        }
        if (this.gameState.status.morale <= this.gameState.thresholds.morale) {
            this.gameState.districts.forEach(d => {
                d.trust = Math.max(0, d.trust - 5);
            });
        }

        if (this.gameState.resources.food < 0) {
            dayEffects.morale -= 20;
            this.gameState.resources.food = 0;
            this.gameState.survivors.forEach(s => {
                s.health -= 10;
            });
        }

        Object.entries(dayEffects).forEach(([k, v]) => {
            if (k !== 'food' && this.gameState.status[k] !== undefined) {
                this.gameState.status[k] = Math.max(0, Math.min(100, this.gameState.status[k] + v));
            }
        });

        let summary = '正常';
        if (this.gameState.status.morale <= 20) summary = '危急';
        else if (this.gameState.status.morale <= 40) summary = '堪忧';
        else if (this.gameState.status.morale >= 80) summary = '良好';

        this.gameState.settlementHistory.push({
            day: this.gameState.day,
            effects: dayEffects,
            summary: summary
        });

        this.showSettlementModal(dayEffects, summary);

        this.gameState.day++;
        this.gameState.schedule = { morning: null, afternoon: null, evening: null };
        this.gameState.selectedBroadcast = null;
        this.gameState.currentQuestion = null;
        this.gameState.todayActions = {
            broadcastDone: false,
            qaDone: 0,
            repairDone: [],
            rumorSuppressDone: [],
            scanDone: 0
        };

        const expiredSignals = this.gameState.signals.filter(s => 
            (this.gameState.day - s.dayFound) >= s.expiresIn
        );
        if (expiredSignals.length > 0) {
            expiredSignals.forEach(s => {
                this.gameState.signalHistory.push({
                    ...s,
                    action: 'expired',
                    day: this.gameState.day,
                    success: false
                });
            });
        }
        this.gameState.signals = this.gameState.signals.filter(s => 
            (this.gameState.day - s.dayFound) < s.expiresIn
        );

        this.generateDailyRumors();

        this.gameState.equipment.forEach(eq => {
            eq.condition = Math.max(0, eq.condition - 3);
        });

        if (Math.random() < 0.3) {
            this.gameState.resources.parts += Math.floor(Math.random() * 3) + 1;
        }
        if (Math.random() < 0.3) {
            this.gameState.resources.battery += Math.floor(Math.random() * 2) + 1;
        }
        if (Math.random() < 0.2) {
            this.gameState.resources.food += Math.floor(Math.random() * 5) + 2;
        }

        if (this.gameState.status.morale <= 0) {
            this.gameOver('民心崩溃', '广播站失去了所有听众的信任，人们不再相信你了...');
            return;
        }
        if (this.gameState.status.power <= 0 && this.gameState.resources.battery <= 0) {
            this.gameOver('电力耗尽', '所有电力来源都已耗尽，广播站陷入了黑暗...');
            return;
        }

        this.renderAll();
    }

    showSettlementModal(effects, summary) {
        let effectsHtml = '';
        Object.entries(effects).forEach(([stat, value]) => {
            if (value !== 0) {
                const className = value > 0 ? 'positive' : 'negative';
                const sign = value > 0 ? '+' : '';
                effectsHtml += `<span class="effect-tag ${className}">${this.getStatName(stat)} ${sign}${value}</span>`;
            }
        });

        document.getElementById('modalTitle').textContent = `第 ${this.gameState.day} 天结算 - ${summary}`;
        document.getElementById('modalText').textContent = '今日运营已结束，以下是今日总结：';
        document.getElementById('modalEffects').innerHTML = effectsHtml;
        document.getElementById('eventModal').classList.add('active');
    }

    showEvent(title, text, effects) {
        let effectsHtml = '';
        effects.forEach(e => {
            effectsHtml += `<span class="effect-tag ${e.type}">${e.text}</span>`;
        });

        document.getElementById('modalTitle').textContent = title;
        document.getElementById('modalText').textContent = text;
        document.getElementById('modalEffects').innerHTML = effectsHtml;
        document.getElementById('eventModal').classList.add('active');
    }

    closeModal() {
        document.getElementById('eventModal').classList.remove('active');
    }

    gameOver(title, message) {
        this.gameState.gameOver = true;
        this.showEvent(`游戏结束 - ${title}`, message + `\n你坚持了 ${this.gameState.day} 天。`, []);
        document.getElementById('endDayBtn').disabled = true;
    }
}
