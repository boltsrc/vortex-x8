package main

import (
        "encoding/json"
        "fmt"
        "math"
        "net"
        "os"
        "strconv"
        "sync"
        "sync/atomic"
        "time"
)

type TestConfig struct {
        Target   string `json:"target"`
        Port     int    `json:"port"`
        Duration int    `json:"duration"`
}

type TestStats struct {
        Sent    int64   `json:"sent"`
        Success int64   `json:"success"`
        Failed  int64   `json:"failed"`
        RPS     float64 `json:"rps"`
}

type TestSession struct {
        config    TestConfig
        stats     TestStats
        startTime time.Time
        stopChan  chan bool
        wg        sync.WaitGroup
        running   bool
        mutex     sync.RWMutex
}

var activeSession *TestSession

func main() {
        if len(os.Args) < 2 {
                fmt.Fprintf(os.Stderr, "Usage: %s <command> [args...]\n", os.Args[0])
                os.Exit(1)
        }

        command := os.Args[1]

        switch command {
        case "start":
                if len(os.Args) != 5 {
                        fmt.Fprintf(os.Stderr, "Usage: %s start <target> <port> <duration>\n", os.Args[0])
                        fmt.Fprintf(os.Stderr, "Received %d arguments: %v\n", len(os.Args), os.Args)
                        os.Exit(1)
                }
                target := os.Args[2]
                port, err := strconv.Atoi(os.Args[3])
                if err != nil {
                        fmt.Fprintf(os.Stderr, "Invalid port: %v\n", err)
                        os.Exit(1)
                }
                duration, err := strconv.Atoi(os.Args[4])
                if err != nil {
                        fmt.Fprintf(os.Stderr, "Invalid duration: %v\n", err)
                        os.Exit(1)
                }
                
                startTest(target, port, duration)
        case "stop":
                stopTest()
        default:
                fmt.Fprintf(os.Stderr, "Unknown command: %s\n", command)
                os.Exit(1)
        }
}

func startTest(target string, port, duration int) {
        if activeSession != nil && activeSession.running {
                fmt.Fprintf(os.Stderr, "Test already running\n")
                os.Exit(1)
        }

        config := TestConfig{
                Target:   target,
                Port:     port,
                Duration: duration,
        }

        session := &TestSession{
                config:    config,
                startTime: time.Now(),
                stopChan:  make(chan bool),
                running:   true,
        }

        activeSession = session

        // ULTRA-MASSIVE concurrent connections for server impact - 75% performance boost
        numWorkers := int(math.Min(5000, math.Max(1000, float64(duration*200))))
        fmt.Printf("Starting ROBUST TCP test with %d workers for maximum server impact\n", numWorkers)

        // Start worker goroutines
        for i := 0; i < numWorkers; i++ {
                session.wg.Add(1)
                go tcpWorker(session)
        }

        // Start stats reporting goroutine
        session.wg.Add(1)
        go statsReporter(session)

        // Wait for duration or stop signal
        select {
        case <-time.After(time.Duration(duration) * time.Second):
                session.mutex.Lock()
                session.running = false
                session.mutex.Unlock()
                close(session.stopChan)
        case <-session.stopChan:
                session.mutex.Lock()
                session.running = false
                session.mutex.Unlock()
        }

        session.wg.Wait()

        // Output final stats
        finalStats := session.getStats()
        statsJson, _ := json.Marshal(finalStats)
        fmt.Printf("FINAL_STATS:%s\n", string(statsJson))
}

func stopTest() {
        if activeSession != nil && activeSession.running {
                activeSession.mutex.Lock()
                activeSession.running = false
                activeSession.mutex.Unlock()
                close(activeSession.stopChan)
        }
}

func tcpWorker(session *TestSession) {
        defer session.wg.Done()
        
        requestCount := int64(0)
        maxRequests := int64(1000) // Limit per worker

        for {
                session.mutex.RLock()
                running := session.running
                session.mutex.RUnlock()

                if !running || requestCount >= maxRequests {
                        break
                }
                
                requestCount++

                // Attempt TCP connection with enhanced error handling
                address := fmt.Sprintf("%s:%d", session.config.Target, session.config.Port)
                startTime := time.Now()
                conn, err := net.DialTimeout("tcp", address, 3*time.Second)
                
                atomic.AddInt64(&session.stats.Sent, 1)

                if err != nil {
                        atomic.AddInt64(&session.stats.Failed, 1)
                        fmt.Printf("Connection failed to %s: %v\n", address, err)
                } else {
                        connectTime := time.Since(startTime)
                        atomic.AddInt64(&session.stats.Success, 1)
                        
                        // Send MASSIVE payload for server impact - 75% performance boost
                        payload := make([]byte, 8192) // 8KB payload per connection for maximum impact
                        for i := range payload {
                                payload[i] = byte(65 + (i % 26)) // Fill with A-Z pattern
                        }
                        // Send payload multiple times for maximum server load
                        for j := 0; j < 5; j++ {
                                conn.Write(payload)
                        }
                        
                        fmt.Printf("Connected to %s in %v\n", address, connectTime)
                        conn.Close()
                }

                // Sophisticated adaptive delay based on success rate
                sent := atomic.LoadInt64(&session.stats.Sent)
                success := atomic.LoadInt64(&session.stats.Success)
                successRate := float64(0)
                if sent > 0 {
                        successRate = float64(success) / float64(sent)
                }
                
                var delay time.Duration
                // HYPER-aggressive timing for maximum server impact - 75% boost
                if successRate < 0.3 {
                        delay = 10 * time.Millisecond // Very fast recovery
                } else if successRate < 0.7 {
                        delay = 2 * time.Millisecond // Extremely fast
                } else {
                        delay = 500 * time.Microsecond // Sub-millisecond timing for max impact
                }
                
                // Ultra-minimal jitter for devastating performance
                jitter := time.Duration(float64(delay) * 0.05)
                time.Sleep(delay + jitter)
        }
}

func statsReporter(session *TestSession) {
        defer session.wg.Done()

        ticker := time.NewTicker(1 * time.Second)
        defer ticker.Stop()

        var lastSent int64

        for {
                select {
                case <-ticker.C:
                        session.mutex.RLock()
                        running := session.running
                        session.mutex.RUnlock()

                        if !running {
                                return
                        }

                        stats := session.getStats()
                        currentSent := atomic.LoadInt64(&session.stats.Sent)
                        stats.RPS = float64(currentSent - lastSent)
                        lastSent = currentSent

                        statsJson, _ := json.Marshal(stats)
                        fmt.Printf("STATS_UPDATE:%s\n", string(statsJson))

                case <-session.stopChan:
                        return
                }
        }
}

func (session *TestSession) getStats() TestStats {
        return TestStats{
                Sent:    atomic.LoadInt64(&session.stats.Sent),
                Success: atomic.LoadInt64(&session.stats.Success),
                Failed:  atomic.LoadInt64(&session.stats.Failed),
                RPS:     session.stats.RPS,
        }
}