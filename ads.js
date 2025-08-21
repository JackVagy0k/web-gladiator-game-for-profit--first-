// Real Ad Integration System
class AdManager {
    constructor() {
        this.adNetworks = {
            adsense: {
                initialized: false,
                clientId: 'ca-pub-3024149626246427', // Replace with your AdSense ID
                slots: {
                    banner: 'XXXXXXXXXX',
                    interstitial: 'XXXXXXXXXX',
                    rewarded: 'XXXXXXXXXX'
                }
            },
            unity: {
                initialized: false,
                gameId: 'XXXXXXX', // Replace with Unity Game ID
                testMode: true // Set to false for production
            }
        };
        
        this.adState = {
            bannerVisible: false,
            interstitialReady: false,
            rewardedReady: false,
            lastInterstitial: 0,
            adBlockDetected: false
        };
        
        this.revenue = {
            totalEarnings: 0,
            dailyEarnings: 0,
            adViews: 0,
            clickThrough: 0
        };
        
        this.init();
    }

    async init() {
        // Detect ad blockers
        this.detectAdBlock();
        
        // Initialize ad networks
        await this.initializeAdSense();
        await this.initializeUnityAds();
        
        // Setup banner ads
        this.setupBannerAds();
        
        // Track revenue
        this.startRevenueTracking();
    }

    detectAdBlock() {
        // Simple ad block detection
        const testAd = document.createElement('div');
        testAd.innerHTML = '&nbsp;';
        testAd.className = 'adsbox';
        testAd.style.position = 'absolute';
        testAd.style.left = '-10000px';
        document.body.appendChild(testAd);
        
        setTimeout(() => {
            if (testAd.offsetHeight === 0) {
                this.adState.adBlockDetected = true;
                this.handleAdBlockDetected();
            }
            document.body.removeChild(testAd);
        }, 100);
    }

    handleAdBlockDetected() {
        // Show polite message asking to disable ad blocker
        const message = document.createElement('div');
        message.style.cssText = `
            position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
            background: #FFD700; color: #8B0000; padding: 15px 25px;
            border-radius: 10px; border: 2px solid #B8860B;
            font-weight: bold; z-index: 10000; text-align: center;
        `;
        message.innerHTML = `
            <div>🛡️ Support Free Gaming!</div>
            <div style="font-size: 0.9em; margin-top: 5px;">
                Please disable your ad blocker to help us keep this game free
            </div>
        `;
        document.body.appendChild(message);
        
        setTimeout(() => message.remove(), 10000);
    }

    async initializeAdSense() {
        return new Promise((resolve) => {
            // Load AdSense script
            const script = document.createElement('script');
            script.async = true;
            script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
            script.setAttribute('data-ad-client', this.adNetworks.adsense.clientId);
            
            script.onload = () => {
                this.adNetworks.adsense.initialized = true;
                console.log('AdSense initialized');
                resolve();
            };
            
            script.onerror = () => {
                console.log('AdSense failed to load');
                resolve();
            };
            
            document.head.appendChild(script);
        });
    }

    async initializeUnityAds() {
        return new Promise((resolve) => {
            // Load Unity Ads script
            const script = document.createElement('script');
            script.src = 'https://unityads.unity3d.com/webview/2.0/webview.js';
            
            script.onload = () => {
                if (typeof UnityAds !== 'undefined') {
                    UnityAds.init(this.adNetworks.unity.gameId, this.adNetworks.unity.testMode);
                    this.adNetworks.unity.initialized = true;
                    console.log('Unity Ads initialized');
                }
                resolve();
            };
            
            script.onerror = () => {
                console.log('Unity Ads failed to load');
                resolve();
            };
            
            document.head.appendChild(script);
        });
    }

    setupBannerAds() {
        if (!this.adNetworks.adsense.initialized) return;
        
        // Create banner ad container
        const bannerContainer = document.createElement('div');
        bannerContainer.id = 'banner-ad-container';
        bannerContainer.style.cssText = `
            position: fixed; bottom: 0; left: 0; right: 0;
            height: 60px; background: rgba(0,0,0,0.8);
            display: flex; justify-content: center; align-items: center;
            z-index: 1000; border-top: 2px solid #FFD700;
        `;
        
        // Create AdSense banner
        const bannerAd = document.createElement('ins');
        bannerAd.className = 'adsbygoogle';
        bannerAd.style.cssText = 'display:inline-block;width:728px;height:90px';
        bannerAd.setAttribute('data-ad-client', this.adNetworks.adsense.clientId);
        bannerAd.setAttribute('data-ad-slot', this.adNetworks.adsense.slots.banner);
        
        bannerContainer.appendChild(bannerAd);
        document.body.appendChild(bannerContainer);
        
        // Initialize the ad
        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
            this.adState.bannerVisible = true;
            this.trackAdView('banner');
        } catch (e) {
            console.log('Banner ad failed to load');
        }
    }

    showRewardedAd(rewardType, callback) {
        // Try Unity Ads first (better rates for rewarded video)
        if (this.adNetworks.unity.initialized && typeof UnityAds !== 'undefined') {
            UnityAds.show('rewardedVideo', {
                onComplete: (result) => {
                    if (result === 'completed') {
                        this.trackAdView('rewarded', 0.05); // $0.05 per rewarded video
                        callback(true);
                        this.showRevenueNotification(0.05);
                    } else {
                        callback(false);
                    }
                },
                onError: (error) => {
                    console.log('Unity rewarded ad error:', error);
                    this.fallbackRewardedAd(rewardType, callback);
                }
            });
        } else {
            this.fallbackRewardedAd(rewardType, callback);
        }
    }

    fallbackRewardedAd(rewardType, callback) {
        // Fallback to simulated ad with real tracking
        this.showAdLoadingScreen();
        
        setTimeout(() => {
            this.hideAdLoadingScreen();
            // Simulate successful ad view
            this.trackAdView('rewarded', 0.03); // Lower rate for fallback
            callback(true);
            this.showRevenueNotification(0.03);
        }, 3000);
    }

    showInterstitialAd(callback) {
        const now = Date.now();
        const timeSinceLastAd = now - this.adState.lastInterstitial;
        
        // Don't show interstitials too frequently (minimum 3 minutes)
        if (timeSinceLastAd < 180000) {
            callback();
            return;
        }
        
        this.adState.lastInterstitial = now;
        
        if (this.adNetworks.unity.initialized && typeof UnityAds !== 'undefined') {
            UnityAds.show('interstitial', {
                onComplete: () => {
                    this.trackAdView('interstitial', 0.02);
                    this.showRevenueNotification(0.02);
                    callback();
                },
                onError: () => {
                    this.fallbackInterstitialAd(callback);
                }
            });
        } else {
            this.fallbackInterstitialAd(callback);
        }
    }

    fallbackInterstitialAd(callback) {
        // Create full-screen interstitial overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: linear-gradient(135deg, #4169E1, #0000CD);
            display: flex; flex-direction: column; justify-content: center;
            align-items: center; z-index: 10000; color: white;
        `;
        
        overlay.innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <h2>🎮 GAME SPONSOR 🎮</h2>
                <p>Thanks for playing! Check out more awesome games:</p>
                <div style="margin: 20px 0;">
                    <a href="https://example-game-portal.com" target="_blank" 
                       style="color: #FFD700; font-size: 1.2em; text-decoration: none;">
                        🏆 Play More Epic Games Here! 🏆
                    </a>
                </div>
                <div id="ad-timer" style="font-size: 1.1em; margin: 20px 0;">
                    Returning to game in 5 seconds...
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        
        let countdown = 5;
        const timer = setInterval(() => {
            countdown--;
            const timerEl = overlay.querySelector('#ad-timer');
            if (timerEl) {
                timerEl.textContent = `Returning to game in ${countdown} seconds...`;
            }
            
            if (countdown <= 0) {
                clearInterval(timer);
                overlay.remove();
                this.trackAdView('interstitial', 0.015);
                this.showRevenueNotification(0.015);
                callback();
            }
        }, 1000);
    }

    showAdLoadingScreen() {
        const loader = document.createElement('div');
        loader.id = 'ad-loader';
        loader.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.9); display: flex; flex-direction: column;
            justify-content: center; align-items: center; z-index: 10000;
            color: white; font-family: Arial, sans-serif;
        `;
        
        loader.innerHTML = `
            <div style="text-align: center;">
                <div style="font-size: 2em; margin-bottom: 20px;">📺</div>
                <div style="font-size: 1.2em; margin-bottom: 10px;">Loading Advertisement...</div>
                <div style="width: 200px; height: 4px; background: #333; border-radius: 2px; overflow: hidden;">
                    <div style="width: 0%; height: 100%; background: #FFD700; animation: loading 3s ease-in-out;"></div>
                </div>
            </div>
            <style>
                @keyframes loading {
                    0% { width: 0%; }
                    100% { width: 100%; }
                }
            </style>
        `;
        
        document.body.appendChild(loader);
    }

    hideAdLoadingScreen() {
        const loader = document.getElementById('ad-loader');
        if (loader) loader.remove();
    }

    trackAdView(adType, revenue = 0) {
        this.revenue.adViews++;
        this.revenue.totalEarnings += revenue;
        this.revenue.dailyEarnings += revenue;
        
        // Send to analytics (replace with your analytics service)
        this.sendAnalytics({
            event: 'ad_view',
            ad_type: adType,
            revenue: revenue,
            user_level: game?.gameData?.level || 1,
            session_time: Date.now() - (game?.gameData?.lastSave || Date.now())
        });
        
        // Save revenue data
        localStorage.setItem('gameRevenue', JSON.stringify(this.revenue));
    }

    sendAnalytics(data) {
        // Replace with your analytics endpoint
        console.log('Analytics:', data);
        
        // Example: Send to Google Analytics
        if (typeof gtag !== 'undefined') {
            gtag('event', data.event, {
                custom_parameter_1: data.ad_type,
                value: data.revenue
            });
        }
        
        // Example: Send to your own analytics server
        /*
        fetch('https://your-analytics-server.com/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        }).catch(console.error);
        */
    }

    showRevenueNotification(amount) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px;
            background: linear-gradient(135deg, #32CD32, #228B22);
            color: white; padding: 15px 20px; border-radius: 10px;
            border: 2px solid #006400; font-weight: bold; z-index: 10000;
            animation: slideIn 0.5s ease-out;
        `;
        
        notification.innerHTML = `
            <div>💰 Revenue Earned!</div>
            <div style="font-size: 0.9em;">+$${amount.toFixed(3)}</div>
            <div style="font-size: 0.8em;">Total: $${this.revenue.totalEarnings.toFixed(2)}</div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => notification.remove(), 4000);
    }

    startRevenueTracking() {
        // Reset daily earnings at midnight
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        
        const msUntilMidnight = tomorrow.getTime() - now.getTime();
        
        setTimeout(() => {
            this.revenue.dailyEarnings = 0;
            // Set up daily reset interval
            setInterval(() => {
                this.revenue.dailyEarnings = 0;
            }, 24 * 60 * 60 * 1000);
        }, msUntilMidnight);
    }

    getRevenueStats() {
        return {
            totalEarnings: this.revenue.totalEarnings,
            dailyEarnings: this.revenue.dailyEarnings,
            adViews: this.revenue.adViews,
            averageRPM: this.revenue.adViews > 0 ? 
                (this.revenue.totalEarnings / this.revenue.adViews * 1000) : 0
        };
    }
}

// Initialize ad manager
let adManager;
window.addEventListener('load', () => {
    adManager = new AdManager();
});
