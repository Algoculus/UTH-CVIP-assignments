"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"

interface RecognitionResult {
  box: [number, number, number, number] // x, y, width, height
  name: string
  distance: number
  confidence: number
  isMatch?: boolean
  threshold?: number
}

export default function RecognitionPage() {
  const [isStreaming, setIsStreaming] = useState(false)
  const [results, setResults] = useState<RecognitionResult[]>([])
  const [error, setError] = useState("")
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isProcessingRef = useRef<boolean>(false) // Flag to prevent concurrent processing
  const router = useRouter()

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
  // Convert HTTP URL to WebSocket URL
  const wsUrl = apiUrl.replace(/^http/, "ws")

  useEffect(() => {
    return () => {
      stopStreaming()
    }
  }, [])

  const startStreaming = async () => {
    try {
      setError("")
      
      // Start camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        // Wait for video to be ready
        await new Promise((resolve, reject) => {
          if (!videoRef.current) {
            reject(new Error("Video element not available"))
            return
          }
          
          const video = videoRef.current
          
          // If already loaded, resolve immediately
          if (video.readyState >= 2) {
            console.log("Video already ready", {
              width: video.videoWidth,
              height: video.videoHeight,
            })
            resolve(undefined)
            return
          }
          
          // Wait for metadata
          const onLoadedMetadata = () => {
            console.log("Video metadata loaded", {
              width: video.videoWidth,
              height: video.videoHeight,
            })
            video.removeEventListener("loadedmetadata", onLoadedMetadata)
            resolve(undefined)
          }
          
          video.addEventListener("loadedmetadata", onLoadedMetadata)
          
          // Timeout after 5 seconds
          setTimeout(() => {
            video.removeEventListener("loadedmetadata", onLoadedMetadata)
            reject(new Error("Video loading timeout"))
          }, 5000)
        })
        
        // Ensure video is playing
        try {
          await videoRef.current.play()
          console.log("Video playback started")
        } catch (playError) {
          console.warn("Video play error:", playError)
        }
      }

      // Connect WebSocket
      const wsUrlFull = `${wsUrl}/ws/recognition`
      console.log("Connecting to WebSocket:", wsUrlFull)
      const ws = new WebSocket(wsUrlFull)
      wsRef.current = ws

      ws.onopen = () => {
        setIsStreaming(true)
        setError("")
        console.log("✓ WebSocket connected successfully")
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          console.log("=" .repeat(80))
          console.log("📥 [WS RECEIVED] Message type:", data.type)
          
          // Reset processing flag when we receive a response
          isProcessingRef.current = false
          
          if (data.type === "recognition") {
            const resultCount = data.results?.length || 0
            console.log(`📊 [WS RECEIVED] Got ${resultCount} result(s) from server`)
            
            if (resultCount > 0) {
              console.log("✓ Recognition results details:")
              data.results.forEach((result: RecognitionResult, index: number) => {
                console.log(`  Face ${index + 1}:`, {
                  name: result.name,
                  box: result.box,
                  isMatch: result.isMatch,
                  confidence: result.confidence,
                  distance: result.distance,
                  threshold: result.threshold
                })
              })
              setError("") // Clear any previous errors
            } else {
              console.log("📭 No faces detected in this frame")
            }
            
            // Always update results, even if empty
            setResults(data.results || [])
            console.log(`✅ [STATE UPDATE] Updated results state with ${resultCount} result(s)`)
          } else if (data.type === "error") {
            console.error("❌ [WS ERROR]:", data.message)
            setError(data.message || "Error processing frame")
            setResults([])
          } else {
            console.warn("⚠️  [WS UNKNOWN] Unknown message type:", data.type)
          }
        } catch (err) {
          console.error("❌ [WS PARSE ERROR] Failed to parse WebSocket message:", err)
          setError("Failed to parse server response")
          isProcessingRef.current = false
        }
      }

      ws.onerror = (err) => {
        console.error("WebSocket error:", err)
        setError(`WebSocket connection error. Make sure the API server is running on ${apiUrl}`)
        setIsStreaming(false)
      }

      ws.onclose = (event) => {
        console.log("WebSocket closed", event.code, event.reason)
        setIsStreaming(false)
        if (event.code !== 1000) {
          // Not a normal closure
          setError("WebSocket connection closed unexpectedly")
        }
      }

      // Capture and send frames - reduced to 1 FPS to prevent overload
      frameIntervalRef.current = setInterval(() => {
        captureAndSendFrame(ws)
      }, 1000) // ~1 FPS (reduced from 5 FPS to prevent database/AI service overload)
    } catch (err: any) {
      setError(err.message || "Failed to start streaming")
      console.error(err)
    }
  }

  const captureAndSendFrame = (ws: WebSocket) => {
    // Skip if already processing a frame (prevent concurrent requests)
    if (isProcessingRef.current) {
      console.log("[FRAME] Skipping frame - previous frame still processing")
      return
    }

    if (!videoRef.current || ws.readyState !== WebSocket.OPEN) {
      if (ws.readyState !== WebSocket.OPEN) {
        console.warn("WebSocket not open, readyState:", ws.readyState)
      }
      return
    }

    const video = videoRef.current
    
    // Check if video is ready
    if (video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      return
    }
    
    // Set processing flag
    isProcessingRef.current = true
    
    // Create a temporary canvas to capture frame
    const tempCanvas = document.createElement("canvas")
    tempCanvas.width = video.videoWidth
    tempCanvas.height = video.videoHeight
    const tempContext = tempCanvas.getContext("2d")
    
    if (tempContext) {
      tempContext.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height)
      const imageData = tempCanvas.toDataURL("image/jpeg", 0.7) // Lower quality to reduce payload
      
      try {
        ws.send(
          JSON.stringify({
            type: "frame",
            image: imageData,
          })
        )
        // Flag will be reset when we receive a response from server
        // Also set a timeout as fallback (in case server doesn't respond)
        setTimeout(() => {
          if (isProcessingRef.current) {
            console.warn("[FRAME] Timeout - resetting processing flag (no response received)")
            isProcessingRef.current = false
          }
        }, 3000) // Fallback timeout: 3 seconds
      } catch (sendError) {
        console.error("Error sending frame:", sendError)
        isProcessingRef.current = false
      }
    } else {
      isProcessingRef.current = false
    }
  }

  const stopStreaming = () => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current)
      frameIntervalRef.current = null
    }

    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    setIsStreaming(false)
    setResults([])
  }

  // Continuously draw video frame and bounding boxes on canvas
  useEffect(() => {
    if (!isStreaming || !canvasRef.current || !videoRef.current) {
      return
    }

    const canvas = canvasRef.current
    const video = videoRef.current
    const context = canvas.getContext("2d", { willReadFrequently: true })
    if (!context) {
      console.error("Failed to get canvas context")
      return
    }

    // Set canvas size to match video dimensions
    const updateCanvasSize = () => {
      const videoWidth = video.videoWidth || 640
      const videoHeight = video.videoHeight || 480
      
      if (canvas.width !== videoWidth || canvas.height !== videoHeight) {
        canvas.width = videoWidth
        canvas.height = videoHeight
        console.log("Canvas size updated:", { width: canvas.width, height: canvas.height })
      }
    }

    // Initial size setup
    updateCanvasSize()

    let animationId: number | null = null
    let isActive = true

    const drawFrame = () => {
      // Check if we should continue drawing
      if (!isActive || !isStreaming || !canvasRef.current || !videoRef.current) {
        return
      }

      // Update canvas size if video dimensions changed
      updateCanvasSize()

      // Clear canvas
      context.clearRect(0, 0, canvas.width, canvas.height)

      // Draw current video frame - check if video is ready
      if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
        try {
          context.drawImage(video, 0, 0, canvas.width, canvas.height)
        } catch (drawError) {
          console.error("Error drawing video frame:", drawError)
        }
      } else {
        // Draw black background if video not ready
        context.fillStyle = "#000"
        context.fillRect(0, 0, canvas.width, canvas.height)
      }

      // Draw bounding boxes and labels if we have results
      if (results.length > 0) {
        console.log(`[DRAW] Drawing ${results.length} bounding boxes on canvas`, {
          canvasSize: { width: canvas.width, height: canvas.height },
          videoSize: { width: video.videoWidth, height: video.videoHeight }
        })
        
        results.forEach((result, index) => {
          if (!result.box || !Array.isArray(result.box) || result.box.length !== 4) {
            console.warn(`[DRAW] Invalid box for result ${index}:`, result.box)
            return
          }
          
          const [x, y, width, height] = result.box
          
          // Validate box coordinates
          if (isNaN(x) || isNaN(y) || isNaN(width) || isNaN(height)) {
            console.warn(`[DRAW] Invalid box coordinates:`, { x, y, width, height })
            return
          }
          
          const isMatch = result.isMatch !== false && result.name !== "Unknown" && result.name !== ""
          const displayName = result.name || "Unknown"
          
          console.log(`[DRAW] Drawing box ${index + 1}:`, {
            name: displayName,
            box: [x, y, width, height],
            isMatch,
            confidence: result.confidence
          })
          
          // Use green for match, red for no match (like in the image)
          const boxColor = isMatch ? "#00ff00" : "#ff0000"
          const labelBgColor = isMatch ? "rgba(0, 255, 0, 0.8)" : "rgba(255, 0, 0, 0.8)"

          // Draw bounding box with thicker line
          context.strokeStyle = boxColor
          context.lineWidth = 4
          context.strokeRect(x, y, width, height)

          // Draw label background (simpler, just the name like in the image)
          const label = displayName
          const labelHeight = 30
          const labelY = Math.max(0, y - labelHeight)
          
          context.fillStyle = labelBgColor
          context.fillRect(x, labelY, width, labelHeight)

          // Draw label text (white text on colored background)
          context.fillStyle = "#ffffff"
          context.font = "bold 16px Arial"
          context.textBaseline = "middle"
          const textY = labelY + labelHeight / 2
          context.fillText(label, x + 8, textY)
          
          // Optional: Draw confidence below the box (smaller text)
          if (result.confidence !== undefined && result.confidence > 0) {
            context.fillStyle = "#ffff00"
            context.font = "12px Arial"
            context.textBaseline = "top"
            context.fillText(
              `${(result.confidence * 100).toFixed(0)}%`,
              x + 5,
              y + height + 5
            )
          }
        })
      } else {
        // Debug: Log when we have no results but should be drawing
        if (isStreaming) {
          // Only log occasionally to avoid spam
          if (Math.random() < 0.01) {
            console.log("[DRAW] No results to draw, but streaming is active")
          }
        }
      }

      // Continue animation loop only if still active
      if (isActive && isStreaming) {
        animationId = requestAnimationFrame(drawFrame)
      }
    }

    // Start animation loop
    animationId = requestAnimationFrame(drawFrame)

    return () => {
      isActive = false
      if (animationId !== null) {
        cancelAnimationFrame(animationId)
      }
    }
  }, [isStreaming, results])

  // Debug: Log results changes
  useEffect(() => {
    if (results.length > 0) {
      console.log("🔄 [RESULTS CHANGED] State updated with", results.length, "result(s)")
      console.log("Details:", results.map((r, i) => ({
        index: i + 1,
        name: r.name,
        box: r.box,
        isMatch: r.isMatch,
        confidence: r.confidence?.toFixed(2),
        distance: r.distance?.toFixed(4)
      })))
    }
  }, [results])

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-tech-border">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-2 text-tech-muted hover:text-tech-accent transition-colors"
            >
              <span>←</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-tech-accent"></div>
                <span className="font-mono text-sm tracking-wider">FACENET</span>
              </div>
            </button>
            <div className="flex items-center gap-3">
              {isStreaming && (
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-500 animate-pulse"></div>
                  <span className="text-tech-muted text-xs font-mono">LIVE</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Page Title */}
        <div className="mb-8">
          <div className="inline-block px-3 py-1 bg-card border border-tech-border mb-4">
            <span className="text-tech-accent text-xs font-mono tracking-wider">REAL-TIME</span>
          </div>
          <h1 className="text-4xl font-bold text-foreground tracking-tight">
            Face Recognition
          </h1>
          <p className="text-tech-muted mt-2">Live facial detection and identification stream</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Video Feed - Takes 2 columns */}
          <div className="lg:col-span-2 space-y-4">
            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-6 py-4 font-mono text-sm">
                <span className="text-red-500">ERROR:</span> {error}
              </div>
            )}

            <div className="relative bg-card border border-tech-border overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full"
                style={{ display: "none" }}
              />
              <canvas
                ref={canvasRef}
                className="w-full bg-background"
                style={{ 
                  display: isStreaming ? "block" : "none",
                  minHeight: "480px",
                  objectFit: "contain"
                }}
              />
              {!isStreaming && (
                <div className="aspect-video flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-20 h-20 border-2 border-tech-border mx-auto mb-6 flex items-center justify-center">
                      <span className="text-tech-muted text-3xl">📹</span>
                    </div>
                    <p className="text-tech-muted font-mono text-sm mb-2">CAMERA OFFLINE</p>
                    <p className="text-gray-700 text-xs">Start recognition to begin live stream</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              {!isStreaming ? (
                <button
                  onClick={startStreaming}
                  className="flex-1 px-8 py-4 bg-tech-accent text-on-accent font-mono text-sm tracking-wider hover:bg-tech-accent-dark transition-colors"
                >
                  ▶ START RECOGNITION
                </button>
              ) : (
                <button
                  onClick={stopStreaming}
                  className="flex-1 px-8 py-4 bg-red-500 text-foreground font-mono text-sm tracking-wider hover:bg-red-600 transition-colors"
                >
                  ■ STOP RECOGNITION
                </button>
              )}
            </div>
          </div>

          {/* Results Panel - Takes 1 column */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-tech-border p-6 sticky top-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-tech-accent text-xs font-mono tracking-wider">
                  DETECTION LOG
                </h2>
                <span className="text-tech-muted text-xs font-mono">
                  {results.length} FACE{results.length !== 1 ? 'S' : ''}
                </span>
              </div>

              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {results.length > 0 ? (
                  results.map((result, index) => {
                    const isMatch = result.isMatch !== false && result.name !== "Unknown"
                    const threshold = result.threshold ?? 0.8
                    const meetsThreshold = result.distance <= threshold
                    
                    return (
                      <div
                        key={index}
                        className={`border p-4 ${
                          isMatch && meetsThreshold
                            ? "bg-tech-accent/5 border-tech-accent/30"
                            : "bg-red-500/5 border-red-500/30"
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="text-foreground font-bold mb-1">{result.name}</div>
                            <div className={`text-xs font-mono ${
                              isMatch && meetsThreshold ? "text-tech-accent" : "text-red-400"
                            }`}>
                              {isMatch && meetsThreshold ? "✓ MATCH" : "✗ NO MATCH"}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-foreground">
                              {(result.confidence * 100).toFixed(0)}%
                            </div>
                            <div className="text-xs text-tech-muted">confidence</div>
                          </div>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="text-tech-muted font-mono">DISTANCE</span>
                            <span className="text-tech-muted font-mono">{result.distance.toFixed(3)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-tech-muted font-mono">THRESHOLD</span>
                            <span className="text-tech-muted font-mono">{threshold}</span>
                          </div>
                          {result.threshold !== undefined && (
                            <div className={`text-xs pt-2 border-t ${
                              meetsThreshold 
                                ? "border-tech-accent/20 text-tech-accent" 
                                : "border-red-500/20 text-red-400"
                            }`}>
                              {meetsThreshold
                                ? "✓ Within threshold range"
                                : "✗ Exceeds threshold range"}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 border-2 border-tech-border mx-auto mb-4 flex items-center justify-center">
                      <span className="text-tech-muted">∅</span>
                    </div>
                    <p className="text-tech-muted font-mono text-xs">NO FACES DETECTED</p>
                    <p className="text-gray-700 text-xs mt-2">
                      Ensure proper lighting and face the camera
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

