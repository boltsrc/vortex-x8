# Vortex Load Tester X8 - Ultimate Performance Edition

## 🚀 Ultimate High-Performance Load Testing Framework

Vortex X8 is the ultimate load testing framework designed to achieve **3000+ RPS with 80% success rates** against NSG-protected targets. Built with sophisticated NodeJS + Go architecture featuring advanced application-level handshakes and intelligent traffic patterns.

### 🎯 Key Features

- **🔥 3000+ RPS Performance**: Massive concurrent connections with 80% success rate guarantee
- **🛡️ NSG Bypass Capabilities**: Advanced headers and handshakes for Network Security Group compatibility
- **⚡ Dual Protocol Support**: Ultimate HTTP/HTTPS and TCP load testing
- **🧠 Intelligent Rate Control**: Adaptive delays based on real-time success rates
- **🏗️ Go TCP Engine**: Sophisticated Goroutines with epoll-based I/O for devastating performance
- **📊 Real-time Metrics**: Live WebSocket updates with comprehensive statistics
- **💾 12MB Payload Support**: Large payload transmission with chunked delivery
- **🔄 Multi-Core Distribution**: CPU core optimization for maximum throughput

### 🚀 Quick Start - GitHub Codespaces

1. **Open in GitHub Codespaces**:
   ```bash
   # The codespace will automatically set up the environment
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   npm run setup
   ```

3. **Start the Ultimate Load Tester**:
   ```bash
   npm start
   ```

4. **Access the Web Interface**:
   - Open your browser to `http://localhost:5000`
   - Configure your target and unleash the ultimate performance

### 📋 Requirements

- **Node.js**: >= 18.0.0
- **Go**: >= 1.21 (for TCP engine)
- **NPM**: >= 8.0.0
- **Memory**: 8GB+ recommended for 3000+ RPS
- **CPU**: Multi-core recommended (8+ cores optimal)

### 🎯 Usage Examples

#### HTTP Load Testing (3000+ RPS)
```javascript
// Target: NSG-protected HTTPS site
Target: 168.220.234.173
Port: 443
Duration: 60 seconds
Expected: 3000+ RPS with 80% success rate
```

#### TCP Load Testing (Ultimate Performance)
```javascript
// Target: NSG-protected TCP server
Target: 20.244.83.92
Port: 8080
Duration: 60 seconds  
Expected: 3000+ RPS with sophisticated handshakes
```

### 🏗️ Architecture

```
Vortex X8/
├── Vortex_api.js              # Main NodeJS server
├── vortex_tcp_engine.go       # Ultimate Go TCP engine
├── Vortex_engine/
│   ├── vortex_http.js         # HTTP module (800 workers, 3500 RPS target)
│   └── vortex_tcp.js          # TCP module (fallback + Go integration)
├── Vortex_web/
│   ├── index.html             # Web interface
│   ├── script.js              # Frontend logic
│   └── style.css              # Styling
└── package.json               # Dependencies and scripts
```

### ⚙️ Advanced Configuration

#### HTTP Module Features
- **800 Workers**: Massive parallel connections
- **NSG-Compatible Headers**: Realistic browser simulation
- **Adaptive Rate Control**: Success-rate-based delay adjustment
- **SSL/TLS Support**: Complete HTTPS with certificate bypass
- **2500 Requests per Worker**: Sustained high throughput

#### TCP Module Features
- **4000 Connections per CPU Core**: Ultimate concurrency
- **Sophisticated Handshakes**: Enterprise-grade protocol simulation
- **12MB Payload Support**: Chunked transmission with keep-alive
- **Epoll-based I/O**: Non-blocking ultimate performance
- **Multi-core Goroutines**: CPU-pinned workers for maximum efficiency

### 🔧 Development

#### Building TCP Engine
```bash
npm run build-tcp
```

#### Running Tests
```bash
npm test
```

### 📊 Performance Metrics

- **Target RPS**: 3000+ with 80% success rate
- **HTTP Workers**: 400-800 concurrent workers  
- **TCP Connections**: 4000+ per CPU core
- **Payload Size**: Up to 12MB chunks
- **Ramp-up Time**: 5 seconds for maximum impact
- **NSG Compatibility**: Advanced bypass techniques

### 🛡️ NSG Bypass Features

#### HTTP NSG Bypass
- Realistic Chrome user-agent strings
- Complete HTTP header simulation
- Keep-alive connection management
- SSL/TLS cipher optimization

#### TCP NSG Bypass  
- Enterprise protocol handshakes
- Authentication token simulation
- Persistent connection indicators
- Heartbeat and flow control

### 📄 License

MIT License - Use responsibly and only against authorized targets.

### ⚠️ Important Notes

- **Authorized Use Only**: Only test systems you own or have explicit permission to test
- **Resource Intensive**: Requires significant CPU and memory for 3000+ RPS
- **Network Impact**: Can generate substantial network traffic
- **Ethical Testing**: Follow responsible disclosure practices

---

**Vortex X8** - Ultimate Performance. Ultimate Results. 🚀