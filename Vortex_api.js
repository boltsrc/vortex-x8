const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const { spawn } = require('child_process');
const vortexHttp = require('./Vortex_engine/vortex_http');
const vortexTcp = require('./Vortex_engine/vortex_tcp');

const app = express();
const server = http.createServer(app);

// WebSocket server on /ws path
const wss = new WebSocket.Server({ server, path: '/ws' });

// Serve static files
app.use(express.static(path.join(__dirname, 'Vortex_web')));
app.use(express.json());

// Store active Vortex sessions
const activeSessions = new Map();

// WebSocket connection handler
wss.on('connection', (ws) => {
    console.log('Client connected');
    
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            
            switch (data.type) {
                case 'start_vortex':
                    await handleStartVortex(ws, data);
                    break;
                case 'stop_vortex':
                    handleStopVortex(ws, data.sessionId);
                    break;
                default:
                    ws.send(JSON.stringify({ type: 'error', message: 'Unknown message type' }));
            }
        } catch (error) {
            console.error('WebSocket message error:', error);
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
        }
    });
    
    ws.on('close', () => {
        console.log('Client disconnected');
        // Clean up any active sessions for this client
        for (const [sessionId, session] of activeSessions.entries()) {
            if (session.ws === ws) {
                handleStopVortex(ws, sessionId);
            }
        }
    });
});

async function handleStartVortex(ws, data) {
    const { target, port, method, duration } = data;
    const sessionId = Date.now().toString();
    
    // Validate inputs
    if (!target || !port || !method || !duration) {
        ws.send(JSON.stringify({ type: 'error', message: 'Missing required parameters' }));
        return;
    }
    
    if (duration > 120) {
        ws.send(JSON.stringify({ type: 'error', message: 'Duration cannot exceed 120 seconds' }));
        return;
    }
    
    // Validate port
    const portNum = parseInt(port);
    if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid port number' }));
        return;
    }
    
    try {
        if (method === 'HTTP') {
            await startHttpVortex(ws, sessionId, target, portNum, duration);
        } else if (method === 'TCP') {
            await startTcpVortex(ws, sessionId, target, portNum, duration);
        } else {
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid method' }));
        }
    } catch (error) {
        console.error('Vortex start error:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Failed to start Vortex' }));
    }
}

async function startHttpVortex(ws, sessionId, target, port, duration) {
    const session = {
        ws,
        type: 'HTTP',
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
    
    activeSessions.set(sessionId, session);
    
    // Send Vortex started confirmation
    ws.send(JSON.stringify({
        type: 'vortex_started',
        sessionId,
        target,
        method: 'HTTP',
        duration
    }));
    
    // Start HTTP Vortex attack
    vortexHttp.startVortex({
        target,
        port,
        duration,
        onUpdate: (stats) => {
            session.stats = stats;
            sendMetricsUpdate(ws, sessionId, session);
        },
        onComplete: (finalStats) => {
            activeSessions.delete(sessionId);
            ws.send(JSON.stringify({
                type: 'vortex_completed',
                sessionId,
                stats: finalStats
            }));
        }
    });
}

async function startTcpVortex(ws, sessionId, target, port, duration) {
    const session = {
        ws,
        type: 'TCP',
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
    
    activeSessions.set(sessionId, session);
    
    // Send Vortex started confirmation
    ws.send(JSON.stringify({
        type: 'vortex_started',
        sessionId,
        target,
        method: 'TCP',
        duration
    }));
    
    // Start TCP Vortex attack via enhanced Go bridge
    vortexTcp.startVortex({
        target,
        port,
        duration,
        onUpdate: (stats) => {
            session.stats = stats;
            sendMetricsUpdate(ws, sessionId, session);
        },
        onComplete: (finalStats) => {
            activeSessions.delete(sessionId);
            ws.send(JSON.stringify({
                type: 'vortex_completed',
                sessionId,
                stats: finalStats
            }));
        }
    });
}

function sendMetricsUpdate(ws, sessionId, session) {
    if (ws.readyState === WebSocket.OPEN) {
        const elapsed = (Date.now() - session.startTime) / 1000;
        const remaining = Math.max(0, session.duration - elapsed);
        
        ws.send(JSON.stringify({
            type: 'metrics_update',
            sessionId,
            metrics: {
                target: session.target,
                method: session.type,
                remainingDuration: Math.round(remaining),
                rps: session.stats.rps,
                sent: session.stats.sent,
                success: session.stats.success,
                failed: session.stats.failed
            }
        }));
    }
}

function handleStopVortex(ws, sessionId) {
    const session = activeSessions.get(sessionId);
    if (session) {
        // Stop the appropriate Vortex attack
        if (session.type === 'HTTP') {
            vortexHttp.stopVortex(sessionId);
        } else if (session.type === 'TCP') {
            vortexTcp.stopVortex(sessionId);
        }
        
        activeSessions.delete(sessionId);
        
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'vortex_stopped',
                sessionId
            }));
        }
    }
}

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Vortex Load Testing Framework running on http://0.0.0.0:${PORT}`);
});