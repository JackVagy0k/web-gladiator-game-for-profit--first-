class IdleGladiatorGame {
    constructor() {
        this.gameData = {
            coins: 100,
            gems: 5,
            level: 1,
            selectedGladiator: null,
            gladiators: {},
            upgrades: {},
            enemiesDefeated: 0,
            totalDamage: 0,
            currentEnemy: null,
            lastSave: Date.now(),
            adBoosts: {
                coins: { active: false, endTime: 0, multiplier: 2 },
                dps: { active: false, endTime: 0, multiplier: 3 },
                gems: { active: false, endTime: 0 }
            }
        };

        this.gladiatorTypes = {
            warrior: {
                name: "🛡️ Warrior",
                baseAttack: 10,
                baseDefense: 8,
                baseHealth: 100,
                baseSpeed: 5,
                cost: 0,
                image: "images/warrior.png",
                description: "Balanced fighter with strong defense"
            },
            rogue: {
                name: "🗡️ Rogue", 
                baseAttack: 15,
                baseDefense: 3,
                baseHealth: 60,
                baseSpeed: 12,
                cost: 500,
                image: "images/rouge.png",
                description: "Fast attacker with low defense"
            },
            mage: {
                name: "🔮 Mage",
                baseAttack: 20,
                baseDefense: 2,
                baseHealth: 40,
                baseSpeed: 8,
                cost: 1000,
                image: "images/mage.png",
                description: "High damage but very fragile"
            },
            berserker: {
                name: "🪓 Berserker",
                baseAttack: 25,
                baseDefense: 1,
                baseHealth: 80,
                baseSpeed: 15,
                cost: 2000,
                image: "images/berserker.png",
                description: "Devastating attacks with no defense"
            }
        };

        this.upgradeTypes = {
            attack: { name: "⚔️ Attack Power", baseCost: 50, multiplier: 1.5 },
            defense: { name: "🛡️ Defense", baseCost: 75, multiplier: 1.4 },
            health: { name: "❤️ Health", baseCost: 100, multiplier: 1.3 },
            speed: { name: "⚡ Speed", baseCost: 60, multiplier: 1.6 }
        };

        this.init();
    }

    init() {
        this.loadGame();
        this.setupEventListeners();
        this.createGladiatorCards();
        this.createUpgradeButtons();
        this.startGameLoop();
        this.checkOfflineEarnings();
        
        // Auto-save every 1 seconds
        setInterval(() => this.saveGame(), 1000);
        
        // Update ad boost timers
        setInterval(() => this.updateAdBoosts(), 1000);
    }

    setupEventListeners() {
        // Save game when page is about to unload
        window.addEventListener('beforeunload', () => this.saveGame());
        
        // Handle visibility change for offline earnings
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.gameData.lastSave = Date.now();
            } else {
                this.checkOfflineEarnings();
            }
        });
    }

    createGladiatorCards() {
        const container = document.getElementById('gladiatorSelection');
        container.innerHTML = '';

        Object.keys(this.gladiatorTypes).forEach(type => {
            const gladiator = this.gladiatorTypes[type];
            const owned = this.gameData.gladiators[type] || false;
            const canAfford = this.gameData.coins >= gladiator.cost;

            const card = document.createElement('div');
            card.className = `gladiator-card ${this.gameData.selectedGladiator === type ? 'selected' : ''}`;
            card.innerHTML = `
                <div style="display:flex; align-items:center; padding:10px;">
                    <!-- BAL OLDAL - kép -->
                    <div style="flex:0 0 100px; display:flex; justify-content:center;">
                        <img src="${gladiator.image}" 
                            alt="${gladiator.name}" 
                            class="gladiator-image" 
                            style="width:100px; height:auto; object-fit:contain;">
                    </div>

                    <!-- JOBB OLDAL - szöveg -->
                    <div style="
                        flex:1;
                        margin-left:15px;
                        color:#fff;
                        text-shadow: 1px 1px 4px #000, 0 0 8px #000;
                    ">
                        <h3 style="margin:0;">${gladiator.name}</h3>
                        <div class="stats">
                            <div>⚔️ Attack: ${gladiator.baseAttack}</div>
                            <div>🛡️ Defense: ${gladiator.baseDefense}</div>
                            <div>❤️ Health: ${gladiator.baseHealth}</div>
                            <div>⚡ Speed: ${gladiator.baseSpeed}</div>
                            <div style="margin-top: 5px; font-style: italic;">${gladiator.description}</div>
                            ${!owned ? `<div style="margin-top: 8px; color: #8B0000; font-weight: bold;">
                                Cost: ${gladiator.cost} coins ${canAfford ? '✅' : '❌'}
                            </div>` : ''}
                        </div>
                    </div>
                </div>
            `;



            card.addEventListener('click', () => {
                if (!owned && gladiator.cost > 0) {
                    if (canAfford) {
                        this.purchaseGladiator(type);
                    } else {
                        this.showNotification(`Need ${gladiator.cost - this.gameData.coins} more coins!`);
                    }
                } else {
                    this.selectGladiator(type);
                }
            });

            container.appendChild(card);
        });
    }

    purchaseGladiator(type) {
        const gladiator = this.gladiatorTypes[type];
        if (this.gameData.coins >= gladiator.cost) {
            this.gameData.coins -= gladiator.cost;
            this.gameData.gladiators[type] = true;
            this.selectGladiator(type);
            this.showNotification(`${gladiator.name} purchased!`);
            this.updateDisplay();
            this.createGladiatorCards();
        }
    }

    selectGladiator(type) {
        if (!this.gameData.gladiators[type] && this.gladiatorTypes[type].cost > 0) return;
        
        this.gameData.selectedGladiator = type;
        this.gameData.gladiators[type] = true; // Warrior is free
        this.createGladiatorCards();
        this.updateGladiatorDisplay();
        this.spawnEnemy();
        this.showNotification(`${this.gladiatorTypes[type].name} selected!`);
    }

    createUpgradeButtons() {
        const container = document.getElementById('upgrades');
        container.innerHTML = '';

        Object.keys(this.upgradeTypes).forEach(type => {
            const upgrade = this.upgradeTypes[type];
            const level = this.gameData.upgrades[type] || 0;
            const cost = Math.floor(upgrade.baseCost * Math.pow(upgrade.multiplier, level));
            const canAfford = this.gameData.coins >= cost;

            const item = document.createElement('div');
            item.className = 'upgrade-item';
            item.innerHTML = `
                <div class="upgrade-info">
                    <div class="upgrade-name">${upgrade.name} (Level ${level})</div>
                    <div class="upgrade-cost">Cost: ${this.formatNumber(cost)} coins</div>
                </div>
                <button class="upgrade-btn" ${!canAfford ? 'disabled' : ''}>
                    ${canAfford ? 'UPGRADE' : 'TOO EXPENSIVE'}
                </button>
            `;

            const button = item.querySelector('.upgrade-btn');
            button.addEventListener('click', () => {
                if (canAfford) {
                    this.purchaseUpgrade(type);
                }
            });

            container.appendChild(item);
        });
    }

    purchaseUpgrade(type) {
        const upgrade = this.upgradeTypes[type];
        const level = this.gameData.upgrades[type] || 0;
        const cost = Math.floor(upgrade.baseCost * Math.pow(upgrade.multiplier, level));

        if (this.gameData.coins >= cost) {
            this.gameData.coins -= cost;
            this.gameData.upgrades[type] = level + 1;
            this.createUpgradeButtons();
            this.updateDisplay();
            this.updateGladiatorDisplay();
            this.showNotification(`${upgrade.name} upgraded to level ${level + 1}!`);
        }
    }

    getGladiatorStats(type) {
        const base = this.gladiatorTypes[type];
        const upgrades = this.gameData.upgrades;
        
        return {
            attack: base.baseAttack + (upgrades.attack || 0) * 5,
            defense: base.baseDefense + (upgrades.defense || 0) * 3,
            health: base.baseHealth + (upgrades.health || 0) * 20,
            speed: base.baseSpeed + (upgrades.speed || 0) * 2,
            maxHealth: base.baseHealth + (upgrades.health || 0) * 20
        };
    }

    updateGladiatorDisplay() {
        if (!this.gameData.selectedGladiator) return;

        const stats = this.getGladiatorStats(this.gameData.selectedGladiator);
        const gladiator = this.gladiatorTypes[this.gameData.selectedGladiator];

        document.getElementById('gladiatorName').textContent = gladiator.name;
        document.getElementById('gladiatorStats').innerHTML = `
            <div>⚔️ Attack: ${stats.attack}</div>
            <div>🛡️ Defense: ${stats.defense}</div>
            <div>❤️ Health: ${stats.health}/${stats.maxHealth}</div>
            <div>⚡ Speed: ${stats.speed}</div>
        `;

        const healthPercent = (stats.health / stats.maxHealth) * 100;
        document.getElementById('gladiatorHealth').style.width = `${healthPercent}%`;
    }

    spawnEnemy() {
        const enemyLevel = this.gameData.level;
        const baseHealth = 50 + (enemyLevel * 25);
        const baseAttack = 5 + (enemyLevel * 3);
        
        this.gameData.currentEnemy = {
            name: this.getRandomEnemyName(),
            health: baseHealth,
            maxHealth: baseHealth,
            attack: baseAttack,
            defense: Math.floor(enemyLevel / 2),
            speed: 3 + Math.floor(enemyLevel / 3)
        };

        this.updateEnemyDisplay();
    }

    getRandomEnemyName() {
        const names = [
            "🐺 Wild Beast", "🦁 Arena Lion", "🐻 Cave Bear", "🐗 War Boar",
            "👹 Demon Warrior", "💀 Skeleton Fighter", "🧟 Undead Champion",
            "🗿 Stone Golem", "🔥 Fire Elemental", "⚡ Storm Giant"
        ];
        return names[Math.floor(Math.random() * names.length)];
    }

    updateEnemyDisplay() {
        if (!this.gameData.currentEnemy) return;

        const enemy = this.gameData.currentEnemy;
        document.getElementById('enemyName').textContent = enemy.name;
        
        const healthPercent = (enemy.health / enemy.maxHealth) * 100;
        document.getElementById('enemyHealth').style.width = `${healthPercent}%`;
    }

    startGameLoop() {
        setInterval(() => {
            if (this.gameData.selectedGladiator && this.gameData.currentEnemy) {
                this.processCombat();
            }
            this.updateDisplay();
        }, 100);
    }

    processCombat() {
        const gladiatorStats = this.getGladiatorStats(this.gameData.selectedGladiator);
        const enemy = this.gameData.currentEnemy;

        // Gladiator attacks
        if (Math.random() < (gladiatorStats.speed / 100)) {
            const damage = Math.max(1, gladiatorStats.attack - enemy.defense);
            enemy.health -= damage;
            this.gameData.totalDamage += damage;
            
            this.addCombatLog(`${this.gladiatorTypes[this.gameData.selectedGladiator].name} deals ${damage} damage!`);
            this.showFloatingDamage(damage, 'gladiator');
            this.createParticles('gladiator');

            if (enemy.health <= 0) {
                this.enemyDefeated();
                return;
            }
        }

        // Enemy attacks
        if (Math.random() < (enemy.speed / 100)) {
            const damage = Math.max(1, enemy.attack - gladiatorStats.defense);
            gladiatorStats.health -= damage;
            
            this.addCombatLog(`${enemy.name} deals ${damage} damage!`);
            this.showFloatingDamage(damage, 'enemy');

            if (gladiatorStats.health <= 0) {
                this.gladiatorDefeated();
                return;
            }
        }

        this.updateGladiatorDisplay();
        this.updateEnemyDisplay();
    }

    enemyDefeated() {
        const baseReward = 10 + (this.gameData.level * 5);
        const coinMultiplier = this.gameData.adBoosts.coins.active ? this.gameData.adBoosts.coins.multiplier : 1;
        const reward = Math.floor(baseReward * coinMultiplier);
        
        this.gameData.coins += reward;
        this.gameData.enemiesDefeated++;
        
        // Chance for gems
        if (Math.random() < 0.1) {
            const gemReward = 1 + Math.floor(this.gameData.level / 10);
            this.gameData.gems += gemReward;
            this.addCombatLog(`💎 Found ${gemReward} gems!`);
        }

        this.addCombatLog(`🏆 Victory! Earned ${reward} coins!`);
        
        // Level progression
        if (this.gameData.enemiesDefeated % (10 + this.gameData.level) === 0) {
            this.gameData.level++;
            this.showNotification(`🎉 Level Up! Now level ${this.gameData.level}!`);
            this.addCombatLog(`🆙 Advanced to level ${this.gameData.level}!`);
            
            // Show interstitial ad every few levels
            if (this.gameData.level % 5 === 0 && typeof adManager !== 'undefined') {
                adManager.showInterstitialAd(() => {
                    // Continue game after ad
                });
            }
        }

        // Heal gladiator
        const gladiatorStats = this.getGladiatorStats(this.gameData.selectedGladiator);
        gladiatorStats.health = gladiatorStats.maxHealth;
        
        this.spawnEnemy();
        this.updateGladiatorDisplay();
    }

    gladiatorDefeated() {
        this.addCombatLog(`💀 ${this.gladiatorTypes[this.gameData.selectedGladiator].name} was defeated!`);
        
        // Heal and respawn after delay
        setTimeout(() => {
            const gladiatorStats = this.getGladiatorStats(this.gameData.selectedGladiator);
            gladiatorStats.health = gladiatorStats.maxHealth;
            this.updateGladiatorDisplay();
            this.addCombatLog(`✨ ${this.gladiatorTypes[this.gameData.selectedGladiator].name} respawns!`);
        }, 2000);
    }

    addCombatLog(message) {
        const log = document.getElementById('combatLog');
        const timestamp = new Date().toLocaleTimeString();
        log.innerHTML += `<div>[${timestamp}] ${message}</div>`;
        log.scrollTop = log.scrollHeight;
        
        // Keep only last 50 messages
        const messages = log.children;
        if (messages.length > 50) {
            log.removeChild(messages[0]);
        }
    }

    showFloatingDamage(damage, source) {
        const container = source === 'gladiator' ? 
            document.getElementById('enemyDisplay') : 
            document.getElementById('gladiatorDisplay');
        
        const element = document.createElement('div');
        element.className = 'floating-damage';
        element.textContent = `-${damage}`;
        element.style.left = Math.random() * 100 + '%';
        element.style.top = Math.random() * 50 + '%';
        
        container.appendChild(element);
        
        setTimeout(() => {
            if (element.parentNode) {
                element.parentNode.removeChild(element);
            }
        }, 1000);
    }

    createParticles(source) {
        const container = source === 'gladiator' ? 
            document.getElementById('gladiatorDisplay') : 
            document.getElementById('enemyDisplay');
        
        for (let i = 0; i < 5; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = Math.random() * 100 + '%';
            particle.style.top = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 0.5 + 's';
            
            container.appendChild(particle);
            
            setTimeout(() => {
                if (particle.parentNode) {
                    particle.parentNode.removeChild(particle);
                }
            }, 1000);
        }
    }

    watchRewardedAd(type) {
        // Use real ad manager
        if (typeof adManager !== 'undefined') {
            adManager.showRewardedAd(type, (success) => {
                if (success) {
                    switch(type) {
                        case 'coins':
                            this.gameData.adBoosts.coins.active = true;
                            this.gameData.adBoosts.coins.endTime = Date.now() + (5 * 60 * 1000);
                            this.showNotification("🎉 2x Coins boost activated for 5 minutes!");
                            break;
                            
                        case 'gems':
                            const gemReward = 5 + Math.floor(this.gameData.level / 5);
                            this.gameData.gems += gemReward;
                            this.showNotification(`🎉 Earned ${gemReward} free gems!`);
                            break;
                            
                        case 'dps':
                            this.gameData.adBoosts.dps.active = true;
                            this.gameData.adBoosts.dps.endTime = Date.now() + (10 * 60 * 1000);
                            this.showNotification("🎉 3x DPS boost activated for 10 minutes!");
                            break;
                    }
                    this.updateDisplay();
                } else {
                    this.showNotification("❌ Ad failed to load. Try again later!");
                }
            });
        }
    }

    trackAdRevenue(adType) {
        // In a real implementation, this would send data to your analytics service
        console.log(`Ad watched: ${adType}, User Level: ${this.gameData.level}, Session Time: ${Date.now() - this.gameData.lastSave}`);
        
        // Simulate different ad revenue rates
        const revenueRates = {
            'coins': 0.02, // $0.02 per view
            'gems': 0.03,  // $0.03 per view  
            'dps': 0.025   // $0.025 per view
        };
        
        // This would be sent to your ad network/analytics
        const estimatedRevenue = revenueRates[adType] || 0.02;
        console.log(`Estimated revenue: $${estimatedRevenue}`);
    }

    updateAdBoosts() {
        const now = Date.now();
        
        // Check coin boost
        if (this.gameData.adBoosts.coins.active && now > this.gameData.adBoosts.coins.endTime) {
            this.gameData.adBoosts.coins.active = false;
            this.showNotification("⏰ Coin boost expired!");
        }
        
        // Check DPS boost
        if (this.gameData.adBoosts.dps.active && now > this.gameData.adBoosts.dps.endTime) {
            this.gameData.adBoosts.dps.active = false;
            this.showNotification("⏰ DPS boost expired!");
        }
    }

    checkOfflineEarnings() {
        const now = Date.now();
        const timeDiff = now - this.gameData.lastSave;
        const hoursOffline = timeDiff / (1000 * 60 * 60);
        
        if (hoursOffline > 0.1) { // More than 6 minutes offline
            const baseEarnings = Math.floor(hoursOffline * 10 * this.gameData.level);
            
            if (baseEarnings > 0) {
                this.showOfflineEarnings(baseEarnings, hoursOffline);
            }
        }
        
        this.gameData.lastSave = now;
    }

    showOfflineEarnings(earnings, hours) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        
        const modal = document.createElement('div');
        modal.className = 'offline-earnings';
        modal.innerHTML = `
            <h2>🎉 WELCOME BACK! 🎉</h2>
            <p>You were away for ${hours.toFixed(1)} hours</p>
            <p>Your gladiators earned:</p>
            <h3>💰 ${this.formatNumber(earnings)} coins</h3>
            <button class="ad-btn" onclick="game.claimOfflineEarnings(${earnings}, 1)">
                CLAIM
            </button>
            <button class="ad-btn" onclick="game.claimOfflineEarnings(${earnings}, 3)">
                📺 WATCH AD FOR 3X REWARDS
            </button>
        `;
        
        document.body.appendChild(overlay);
        document.body.appendChild(modal);
    }

    claimOfflineEarnings(baseEarnings, multiplier) {
        const earnings = baseEarnings * multiplier;
        this.gameData.coins += earnings;
        
        if (multiplier > 1) {
            // Track real ad revenue for offline earnings
            if (typeof adManager !== 'undefined') {
                adManager.trackAdView('offline_earnings', 0.04);
            }
            this.showNotification(`🎉 Claimed ${this.formatNumber(earnings)} coins with ad bonus!`);
        } else {
            this.showNotification(`💰 Claimed ${this.formatNumber(earnings)} coins!`);
        }
        
        // Remove modals
        const overlay = document.querySelector('.modal-overlay');
        const modal = document.querySelector('.offline-earnings');
        if (overlay) overlay.remove();
        if (modal) modal.remove();
        
        this.updateDisplay();
    }

    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }

    updateDisplay() {
        document.getElementById('coins').textContent = this.formatNumber(this.gameData.coins);
        document.getElementById('gems').textContent = this.formatNumber(this.gameData.gems);
        document.getElementById('level').textContent = this.gameData.level;
        document.getElementById('enemiesDefeated').textContent = this.formatNumber(this.gameData.enemiesDefeated);
        document.getElementById('totalDamage').textContent = this.formatNumber(this.gameData.totalDamage);
        document.getElementById('arenaLevel').textContent = this.gameData.level;
        
        // Calculate DPS
        const dps = this.gameData.selectedGladiator ? 
            this.getGladiatorStats(this.gameData.selectedGladiator).attack / 10 : 0;
        const dpsMultiplier = this.gameData.adBoosts.dps.active ? this.gameData.adBoosts.dps.multiplier : 1;
        document.getElementById('dps').textContent = this.formatNumber(Math.floor(dps * dpsMultiplier));
        
        // Calculate coins per second
        const cps = this.gameData.level * 2;
        const cpsMultiplier = this.gameData.adBoosts.coins.active ? this.gameData.adBoosts.coins.multiplier : 1;
        document.getElementById('coinsPerSecond').textContent = this.formatNumber(Math.floor(cps * cpsMultiplier));
        
        // Update level progress
        const enemiesForNextLevel = 10 + this.gameData.level;
        const currentProgress = this.gameData.enemiesDefeated % enemiesForNextLevel;
        const progressPercent = (currentProgress / enemiesForNextLevel) * 100;
        document.getElementById('levelProgress').style.width = `${progressPercent}%`;
    }

    formatNumber(num) {
        if (num >= 1000000000) {
            return (num / 1000000000).toFixed(1) + 'B';
        } else if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    saveGame() {
        this.gameData.lastSave = Date.now();
        localStorage.setItem('idleGladiatorSave', JSON.stringify(this.gameData));
    }

    loadGame() {
        const saved = localStorage.getItem('idleGladiatorSave');
        if (saved) {
            try {
                const loadedData = JSON.parse(saved);
                this.gameData = { ...this.gameData, ...loadedData };
                
                // Ensure warrior is always owned
                this.gameData.gladiators.warrior = true;
                
                // Set default selected gladiator if none
                if (!this.gameData.selectedGladiator) {
                    this.gameData.selectedGladiator = 'warrior';
                }
            } catch (e) {
                console.log('Failed to load save data');
            }
        } else {
            // First time playing - give warrior for free
            this.gameData.gladiators.warrior = true;
            this.gameData.selectedGladiator = 'warrior';
        }
    }

    resetGame() {
        if (confirm('Are you sure you want to reset all progress? This cannot be undone!')) {
            localStorage.removeItem('idleGladiatorSave');
            location.reload();
        }
    }
}

// Initialize game when page loads
let game;
window.addEventListener('load', () => {
    game = new IdleGladiatorGame();
});

// Add reset button for testing (remove in production)
window.addEventListener('keydown', (e) => {
    if (e.key === 'R' && e.ctrlKey && e.shiftKey) {
        game.resetGame();
    }
});
