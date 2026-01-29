"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"

export default function EnrollPage() {
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [detectedFaces, setDetectedFaces] = useState<any[]>([])
  const [isDetecting, setIsDetecting] = useState(false)
  const [realtimeFaces, setRealtimeFaces] = useState<any[]>([])
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()

  // Real-time face detection
  const detectFacesRealtime = async () => {
    if (!videoRef.current || !overlayCanvasRef.current || !canvasRef.current) return
    
    const video = videoRef.current
    const overlayCanvas = overlayCanvasRef.current
    const tempCanvas = canvasRef.current
    const overlayCtx = overlayCanvas.getContext("2d")
    const tempCtx = tempCanvas.getContext("2d")
    
    if (!overlayCtx || !tempCtx) return
    
    // Set canvas dimensions to match video
    if (overlayCanvas.width !== video.videoWidth || overlayCanvas.height !== video.videoHeight) {
      overlayCanvas.width = video.videoWidth
      overlayCanvas.height = video.videoHeight
    }
    
    tempCanvas.width = video.videoWidth
    tempCanvas.height = video.videoHeight
    
    // Draw current video frame to temp canvas
    tempCtx.drawImage(video, 0, 0)
    
    // Get image data
    const imageData = tempCanvas.toDataURL("image/jpeg", 0.8)
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
      
      const detectResponse = await fetch(`${apiUrl}/face/detect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageData }),
      })
      
      if (detectResponse.ok) {
        const detectData = await detectResponse.json()
        setRealtimeFaces(detectData.faces || [])
        
        // Clear canvas
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height)
        
        // Draw bounding boxes
        detectData.faces.forEach((face: any) => {
          const [x, y, w, h] = face.box
          const confidence = face.confidence
          
          // Draw bounding box
          overlayCtx.strokeStyle = confidence >= 0.95 ? "#22c55e" : "#eab308" // green if high confidence, yellow otherwise
          overlayCtx.lineWidth = 3
          overlayCtx.strokeRect(x, y, w, h)
          
          // Draw label background
          const labelText = `${(confidence * 100).toFixed(1)}%`
          overlayCtx.font = "16px Arial"
          const textWidth = overlayCtx.measureText(labelText).width
          
          overlayCtx.fillStyle = confidence >= 0.95 ? "#22c55e" : "#eab308"
          overlayCtx.fillRect(x, y - 25, textWidth + 20, 25)
          
          // Draw label text
          overlayCtx.fillStyle = "white"
          overlayCtx.fillText(labelText, x + 10, y - 7)
        })
      }
    } catch (err) {
      // Silently fail for real-time detection
      console.error("Real-time detection error:", err)
    }
  }

  // Start detection interval when camera is on
  useEffect(() => {
    if (isCameraOn && !capturedImage) {
      // Detect faces every 300ms for smooth real-time feedback
      detectionIntervalRef.current = setInterval(() => {
        detectFacesRealtime()
      }, 300)
    } else {
      // Clear interval when camera is off
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current)
        detectionIntervalRef.current = null
      }
    }
    
    return () => {
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current)
      }
    }
  }, [isCameraOn, capturedImage])

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      })
      streamRef.current = stream
      setIsCameraOn(true)
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
    } catch (err) {
      setError("Cannot access webcam. Please allow camera permissions.")
      console.error(err)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      setIsCameraOn(false)
    }
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current)
      detectionIntervalRef.current = null
    }
  }

  const capturePhoto = async () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext("2d")

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      context?.drawImage(video, 0, 0)

      const imageData = canvas.toDataURL("image/jpeg")
      
      // Detect face before capturing
      setIsDetecting(true)
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
      
      try {
        const detectResponse = await fetch(`${apiUrl}/face/detect`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: imageData }),
        })

        if (!detectResponse.ok) {
          const errorData = await detectResponse.json().catch(() => ({ error: "Failed to detect faces" }))
          throw new Error(errorData.error || errorData.details || "Failed to detect faces")
        }

        const detectData = await detectResponse.json()
        
        if (detectData.count === 0) {
          setError("No face detected in the image. Please ensure your face is clearly visible.")
          setIsDetecting(false)
          return
        }
        
        if (detectData.count > 1) {
          setError("Multiple faces detected. Please ensure only one face is in the frame.")
          setIsDetecting(false)
          return
        }

        setDetectedFaces(detectData.faces)
        setCapturedImage(imageData)
        
        // Draw bounding box overlay on canvas
        // Use setTimeout to ensure image is rendered first
        setTimeout(() => {
          if (previewCanvasRef.current && detectData.faces.length > 0) {
            const previewCanvas = previewCanvasRef.current
            const previewCtx = previewCanvas.getContext("2d")
            
            // Wait for image to load to get actual dimensions
            const img = new Image()
            img.onload = () => {
              // Set canvas size to match image
              previewCanvas.width = img.width
              previewCanvas.height = img.height
              
              // Clear canvas
              previewCtx?.clearRect(0, 0, previewCanvas.width, previewCanvas.height)
              
              // Draw bounding box
              const face = detectData.faces[0]
              const [x, y, w, h] = face.box
              
              // Draw bounding box
              previewCtx!.strokeStyle = "#22c55e" // green
              previewCtx!.lineWidth = 3
              previewCtx!.strokeRect(x, y, w, h)
              
              // Draw label background
              previewCtx!.fillStyle = "#22c55e"
              previewCtx!.fillRect(x, y - 25, 120, 25)
              
              // Draw label text
              previewCtx!.fillStyle = "white"
              previewCtx!.font = "16px Arial"
              previewCtx!.fillText("Face Detected", x + 5, y - 7)
            }
            img.src = imageData
          }
        }, 100)
        
        stopCamera()
      } catch (err: any) {
        console.error("Face detection error:", err)
        if (err.message?.includes("Failed to fetch") || err.name === "TypeError") {
          setError(`Cannot connect to API server. Make sure the API is running on ${apiUrl}`)
        } else {
          setError(err.message || "Failed to detect face")
        }
      } finally {
        setIsDetecting(false)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (!name) {
      setError("Please enter your name")
      return
    }

    if (!capturedImage) {
      setError("Please capture a photo before enrolling")
      return
    }

    setLoading(true)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

      // Create user (userId will be auto-generated by API)
      const userResponse = await fetch(`${apiUrl}/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      })

      if (!userResponse.ok) {
        const errorData = await userResponse.json()
        if (userResponse.status === 409) {
          setError(`User "${name}" already exists. Please use a different name.`)
        } else {
          setError(errorData.error || "Failed to create user")
        }
        setLoading(false)
        return
      }

      const userData = await userResponse.json()
      const createdUserId = userData.user.userId

      // Save embedding
      const embeddingResponse = await fetch(`${apiUrl}/embeddings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: createdUserId,
          imageBase64: capturedImage,
        }),
      })

      if (!embeddingResponse.ok) {
        const errorData = await embeddingResponse.json()
        throw new Error(errorData.error || "Failed to save embedding")
      }

      setSuccess("Enrollment successful!")
      setTimeout(() => {
        router.push("/dashboard")
      }, 2000)
    } catch (err: any) {
      setError(err.message || "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-tech-border">
        <div className="max-w-5xl mx-auto px-6 py-4">
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
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-12">
        {/* Page Title */}
        <div className="mb-12">
          <div className="inline-block px-3 py-1 bg-card border border-tech-border mb-4">
            <span className="text-tech-accent text-xs font-mono tracking-wider">ENROLLMENT</span>
          </div>
          <h1 className="text-4xl font-bold text-foreground tracking-tight">
            Register New Face
          </h1>
          <p className="text-tech-muted mt-2">Add a new user to the facial recognition database</p>
        </div>

        <div className="bg-card border border-tech-border p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div>
              <label
                htmlFor="name"
                className="block text-tech-accent text-xs font-mono tracking-wider mb-3"
              >
                USER NAME
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-background border border-tech-border text-foreground px-4 py-3 focus:border-tech-accent focus:outline-none transition-colors"
                placeholder="Enter full name"
                required
              />
            </div>

            <div>
              <label className="block text-tech-accent text-xs font-mono tracking-wider mb-3">
                FACIAL CAPTURE
              </label>
              {!capturedImage ? (
                <div className="space-y-4">
                  <div className="relative bg-background border border-tech-border overflow-hidden" style={{ aspectRatio: '4/3' }}>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover"
                      style={{ display: isCameraOn ? "block" : "none" }}
                    />
                    {/* Overlay canvas for real-time bounding boxes */}
                    <canvas
                      ref={overlayCanvasRef}
                      className="absolute top-0 left-0 w-full h-full pointer-events-none"
                      style={{ display: isCameraOn ? "block" : "none" }}
                    />
                    {!isCameraOn && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-16 h-16 border-2 border-tech-border mx-auto mb-4 flex items-center justify-center">
                            <span className="text-tech-muted text-2xl">📷</span>
                          </div>
                          <p className="text-tech-muted font-mono text-sm">CAMERA OFFLINE</p>
                        </div>
                      </div>
                    )}
                    {/* Real-time status indicator */}
                    {isCameraOn && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/70 px-4 py-2">
                        {realtimeFaces.length > 0 ? (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <p className="text-white text-xs font-mono">
                              {realtimeFaces.length} FACE{realtimeFaces.length > 1 ? "S" : ""} DETECTED
                              {realtimeFaces.length === 1 && ` · CONFIDENCE: ${(realtimeFaces[0].confidence * 100).toFixed(1)}%`}
                            </p>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                            <p className="text-white text-xs font-mono">
                              SCANNING FOR FACES...
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="flex-1 px-6 py-3 bg-background border border-tech-border text-foreground font-mono text-sm tracking-wider hover:border-tech-accent transition-colors"
                    >
                      START CAMERA
                    </button>
                    <button
                      type="button"
                      onClick={capturePhoto}
                      disabled={!isCameraOn || isDetecting}
                      className="flex-1 px-6 py-3 bg-tech-accent text-on-accent font-mono text-sm tracking-wider hover:bg-tech-accent-dark disabled:bg-card disabled:text-tech-muted transition-colors"
                    >
                      {isDetecting ? "DETECTING..." : "CAPTURE"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative bg-background border border-tech-border overflow-hidden">
                    {/* Display captured image */}
                    <img
                      src={capturedImage || ""}
                      alt="Captured face"
                      className="w-full"
                    />
                    {/* Overlay canvas for bounding box */}
                    <canvas
                      ref={previewCanvasRef}
                      className="absolute top-0 left-0 w-full pointer-events-none"
                      style={{ display: detectedFaces.length > 0 ? "block" : "none" }}
                    />
                    {detectedFaces.length > 0 && (
                      <div className="absolute bottom-0 left-0 right-0 bg-tech-accent/90 px-4 py-3">
                        <p className="text-on-accent text-sm font-mono">
                          ✓ FACE DETECTED · CONFIDENCE: {(detectedFaces[0].confidence * 100).toFixed(1)}%
                        </p>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setCapturedImage(null)
                      setDetectedFaces([])
                      startCamera()
                    }}
                    className="w-full px-6 py-3 bg-background border border-tech-border text-foreground font-mono text-sm tracking-wider hover:border-red-500 hover:text-red-500 transition-colors"
                  >
                    RETAKE PHOTO
                  </button>
                </div>
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-6 py-4 font-mono text-sm">
                <span className="text-red-500">ERROR:</span> {error}
              </div>
            )}

            {success && (
              <div className="bg-tech-accent/10 border border-tech-accent/50 text-tech-accent px-6 py-4 font-mono text-sm">
                <span className="text-tech-accent">SUCCESS:</span> {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !capturedImage}
              className="w-full px-8 py-4 bg-tech-accent text-on-accent font-mono text-sm tracking-wider hover:bg-tech-accent-dark disabled:bg-card disabled:text-tech-muted transition-colors"
            >
              {loading ? "PROCESSING..." : "ENROLL USER"}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}

