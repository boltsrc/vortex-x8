class VortexClient {
    constructor() {
        this.socket = null;
        this.currentSessionId = null;
        this.isConnected = false;
        this.isVortexRunning = false;
        
        this.initializeElements();
        this.bindEvents();
        this.connectWebSocket();
        this.showLoadingAnimation();
    }

    initializeElements() {
        // Form elements
        this.targetInput = document.getElementById('target');
        this.portInput = document.getElementById('port');
        this.methodSelect = document.getElementById('method');
        this.durationSlider = document.getElementById('duration-slider');
        this.durationInput = document.getElementById('duration');
        this.startButton = document.getElementById('start-vortex');
        this.stopButton = document.getElementById('stop-vortex');

        // Metrics elements
        this.metricsSection = document.getElementById('metrics-section');
        this.metricRemaining = document.getElementById('metric-remaining');
        this.metricRps = document.getElementById('metric-rps');
        this.metricSent = document.getElementById('metric-sent');
        this.metricSuccess = document.getElementById('metric-success');
        this.metricFailed = document.getElementById('metric-failed');

        // Status elements
        this.statusMessage = document.getElementById('status-message');
        this.loadingOverlay = document.getElementById('loading-overlay');
    }

    bindEvents() {
        // Duration slider sync
        this.durationSlider.addEventListener('input', (e) => {
            this.durationInput.value = e.target.value;
        });

        this.durationInput.addEventListener('input', (e) => {
            const value = Math.min(120, Math.max(1, parseInt(e.target.value) || 1));
            this.durationInput.value = value;
            this.durationSlider.value = value;
        });

        // Button events
        this.startButton.addEventListener('click', () => this.startVortex());
        this.stopButton.addEventListener('click', () => this.stopVortex());

        // Form validation
        [this.targetInput, this.portInput, this.methodSelect].forEach(input => {
            input.addEventListener('input', () => this.validateForm());
        });

        // Initialize feather icons
        feather.replace();
    }

    showLoadingAnimation() {
        setTimeout(() => {
            this.loadingOverlay.classList.add('fade-out');
            setTimeout(() => {
                this.loadingOverlay.style.display = 'none';
            }, 500);
        }, 1500);
    }

    connectWebSocket() {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        
        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => {
            console.log('WebSocket connected');
            this.isConnected = true;
            this.showStatus('Connected to Vortex server', 'success');
        };

        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.handleWebSocketMessage(data);
        };

        this.socket.onclose = () => {
            console.log('WebSocket disconnected');
            this.isConnected = false;
            this.showStatus('Disconnected from server', 'error');
            
            // Attempt to reconnect after 3 seconds
            setTimeout(() => {
                if (!this.isConnected) {
                    this.connectWebSocket();
                }
            }, 3000);
        };

        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.showStatus('Connection error', 'error');
        };
    }

    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'vortex_started':
                this.handleVortexStarted(data);
                break;
            case 'metrics_update':
                this.handleMetricsUpdate(data);
                break;
            case 'vortex_completed':
                this.handleVortexCompleted(data);
                break;
            case 'vortex_stopped':
                this.handleVortexStopped(data);
                break;
            case 'error':
                this.handleError(data);
                break;
            default:
                console.warn('Unknown message type:', data.type);
        }
    }

    handleVortexStarted(data) {
        this.currentSessionId = data.sessionId;
        this.isVortexRunning = true;
        this.updateUIForVortexRunning();
        this.showMetrics();
        this.showStatus(`Vortex started: ${data.method} attack on ${data.target}`, 'success');
    }

    handleMetricsUpdate(data) {
        if (data.sessionId === this.currentSessionId) {
            this.updateMetrics(data.metrics);
        }
    }

    handleVortexCompleted(data) {
        this.isVortexRunning = false;
        this.updateUIForVortexStopped();
        this.showStatus('Vortex completed successfully', 'success');
        
        // Update final metrics
        if (data.stats) {
            this.updateFinalMetrics(data.stats);
        }
    }

    handleVortexStopped(data) {
        this.isVortexRunning = false;
        this.updateUIForVortexStopped();
        this.showStatus('Vortex stopped', 'info');
    }

    handleError(data) {
        this.showStatus(data.message || 'An error occurred', 'error');
        this.isVortexRunning = false;
        this.updateUIForVortexStopped();
    }

    startVortex() {
        if (!this.validateForm()) {
            this.showStatus('Please fill in all required fields correctly', 'error');
            return;
        }

        if (!this.isConnected) {
            this.showStatus('Not connected to server', 'error');
            return;
        }

        const vortexConfig = {
            type: 'start_vortex',
            target: this.targetInput.value.trim(),
            port: parseInt(this.portInput.value),
            method: this.methodSelect.value,
            duration: parseInt(this.durationInput.value)
        };

        this.socket.send(JSON.stringify(vortexConfig));
        this.showStatus('Starting Vortex...', 'info');
    }

    stopVortex() {
        if (this.currentSessionId && this.isConnected) {
            this.socket.send(JSON.stringify({
                type: 'stop_vortex',
                sessionId: this.currentSessionId
            }));
        }
    }

    validateForm() {
        const target = this.targetInput.value.trim();
        const port = parseInt(this.portInput.value);
        const method = this.methodSelect.value;
        const duration = parseInt(this.durationInput.value);

        const isValid = target && 
                       port >= 1 && port <= 65535 && 
                       method && 
                       duration >= 1 && duration <= 120;

        this.startButton.disabled = !isValid || this.isVortexRunning;
        return isValid;
    }

    updateUIForVortexRunning() {
        this.startButton.disabled = true;
        this.stopButton.disabled = false;
        
        // Disable form inputs
        this.targetInput.disabled = true;
        this.portInput.disabled = true;
        this.methodSelect.disabled = true;
        this.durationSlider.disabled = true;
        this.durationInput.disabled = true;
    }

    updateUIForVortexStopped() {
        this.startButton.disabled = false;
        this.stopButton.disabled = true;
        this.currentSessionId = null;
        
        // Re-enable form inputs
        this.targetInput.disabled = false;
        this.portInput.disabled = false;
        this.methodSelect.disabled = false;
        this.durationSlider.disabled = false;
        this.durationInput.disabled = false;
        
        this.validateForm();
    }

    showMetrics() {
        this.metricsSection.style.display = 'block';
        this.metricsSection.scrollIntoView({ behavior: 'smooth' });
    }

    updateMetrics(metrics) {
        this.animateMetricUpdate(this.metricRemaining, `${metrics.remainingDuration}s`);
        this.animateMetricUpdate(this.metricRps, metrics.rps.toLocaleString());
        this.animateMetricUpdate(this.metricSent, metrics.sent.toLocaleString());
        this.animateMetricUpdate(this.metricSuccess, metrics.success.toLocaleString());
        this.animateMetricUpdate(this.metricFailed, metrics.failed.toLocaleString());
    }

    updateFinalMetrics(stats) {
        this.animateMetricUpdate(this.metricRemaining, '0s');
        this.animateMetricUpdate(this.metricRps, '0');
        this.animateMetricUpdate(this.metricSent, stats.sent.toLocaleString());
        this.animateMetricUpdate(this.metricSuccess, stats.success.toLocaleString());
        this.animateMetricUpdate(this.metricFailed, stats.failed.toLocaleString());
    }

    animateMetricUpdate(element, value) {
        if (element.textContent !== value) {
            element.textContent = value;
            element.classList.add('updated');
            setTimeout(() => {
                element.classList.remove('updated');
            }, 300);
        }
    }

    showStatus(message, type) {
        this.statusMessage.textContent = message;
        this.statusMessage.className = `status-message ${type} show`;
        
        setTimeout(() => {
            this.statusMessage.classList.remove('show');
        }, 5000);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new VortexClient();
});