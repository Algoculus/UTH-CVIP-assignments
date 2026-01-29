"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import AgeCard from "@/components/face-analysis/AgeCard"
import GenderCard from "@/components/face-analysis/GenderCard"
import AttributesCard from "@/components/face-analysis/AttributesCard"
import QualityCard from "@/components/face-analysis/QualityCard"
import ComparisonView from "@/components/face-analysis/ComparisonView"
import { optimizeImage } from "@/utils/imageOptimizer"

interface FaceAnalysisResult {
  face_box: number[]
  face_index: number
  age?: number
  age_confidence?: number
  gender?: string
  gender_confidence?: number
  attributes?: {
    glasses: boolean
    beard: boolean
    hat: boolean
    mustache: boolean
  }
  quality?: {
    overall_score: number
    blur_score: number
    brightness: number
    contrast: number
    angle: number
    symmetry: number
    face_size_score: number
    occlusion_detected: boolean
    quality_level: string
    recommendations: string[]
  }
  error?: string
}

interface ComparisonResult {
  similarity: number
  distance: number
  is_same_person: boolean
  confidence: number
  threshold: number
  face1_box: number[]
  face2_box: number[]
}

export default function FaceAnalysisPage() {
  const [error, setError] = useState("")
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [analysisResults, setAnalysisResults] = useState<FaceAnalysisResult[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [selectedModes, setSelectedModes] = useState<string[]>(['age', 'gender', 'attributes', 'quality'])
  
  // Ensure quality is always included if other modes are selected
  useEffect(() => {
    if (selectedModes.length > 0 && !selectedModes.includes('quality')) {
      // Quality is optional, but we can add it if user wants all features
      // For now, let user control it
    }
  }, [selectedModes])
  const [viewMode, setViewMode] = useState<'analysis' | 'comparison'>('analysis')
  
  // Comparison state
  const [compareImage1, setCompareImage1] = useState<string | null>(null)
  const [compareImage2, setCompareImage2] = useState<string | null>(null)
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null)
  const [isComparing, setIsComparing] = useState(false)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const router = useRouter()

  // Start camera
  const startCamera = async () => {
    try {
      setError("")
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setIsCameraOn(true)
      }
    } catch (err) {
      setError("Cannot access camera. Please check permissions.")
      console.error("Camera error:", err)
    }
  }

  // Stop camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsCameraOn(false)
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [])

  // Capture photo
  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")

    if (!ctx) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Get original image data for display
    const originalImageData = canvas.toDataURL("image/jpeg", 0.9)
    setCapturedImage(originalImageData)
    
    // Optimize image for API (will be used when analyzing)
    try {
      const optimizedImageData = await optimizeImage(originalImageData, {
        maxWidth: 1280,
        maxHeight: 720,
        quality: 0.85
      })
      // Store optimized version separately for API calls
      setCapturedImage(optimizedImageData)
    } catch (err) {
      console.warn("Failed to optimize image, using original:", err)
      // Keep original if optimization fails
    }
    
    setAnalysisResults([])
    setError("")
    stopCamera()
  }

  // Analyze faces
  const analyzeFaces = async () => {
    if (!capturedImage) {
      setError("No image to analyze")
      return
    }

    setIsAnalyzing(true)
    setError("")
    setAnalysisResults([])

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
      
      const response = await fetch(`${apiUrl}/face-analysis/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: capturedImage,
          modes: selectedModes,
          language: 'en'
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || errorData.detail || "Cannot analyze face")
      }

      const data = await response.json()
      console.log("Analysis result:", data)
      console.log("Selected modes:", selectedModes)
      console.log("Modes analyzed:", data.modes_analyzed)
      
      if (data.count === 0) {
        setError("No faces detected in the image. Try retaking with better lighting.")
        return
      }

      // Log full response for debugging
      console.log("Full API response:", data)
      console.log("Faces array:", data.faces)
      
      // Ensure all requested modes are in the results
      const processedFaces = data.faces.map((face: any) => {
        // Log what's in each face result
        console.log("Face result keys:", Object.keys(face))
        console.log("Face result:", face)
        
        // Ensure quality exists if requested
        if (selectedModes.includes('quality') && !face.quality && !face.quality_error) {
          console.warn("Quality was requested but not in result")
        }
        
        return face
      })

      setAnalysisResults(processedFaces)
      
    } catch (err) {
      console.error("Face analysis error:", err)
      setError(err instanceof Error ? err.message : "An error occurred during analysis")
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Compare faces
  const compareFaces = async () => {
    if (!compareImage1 || !compareImage2) {
      setError("Please provide both images for comparison")
      return
    }

    setIsComparing(true)
    setError("")
    setComparisonResult(null)

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
      
      // Optimize images before sending
      console.log("[COMPARE] Optimizing images...")
      const [optimizedImage1, optimizedImage2] = await Promise.all([
        optimizeImage(compareImage1, { maxWidth: 1280, maxHeight: 720, quality: 0.85 }),
        optimizeImage(compareImage2, { maxWidth: 1280, maxHeight: 720, quality: 0.85 })
      ])
      
      console.log("[COMPARE] Starting face comparison...")
      console.log("[COMPARE] Image1 length:", optimizedImage1.length)
      console.log("[COMPARE] Image2 length:", optimizedImage2.length)
      
      const response = await fetch(`${apiUrl}/face-analysis/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image1: optimizedImage1,
          image2: optimizedImage2,
          threshold: 0.6
        }),
      })

      console.log("[COMPARE] Response status:", response.status)
      console.log("[COMPARE] Response ok:", response.ok)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        console.error("[COMPARE] Error response:", errorData)
        throw new Error(errorData.error || errorData.detail || "Cannot compare faces")
      }

      const data = await response.json()
      console.log("[COMPARE] Response data:", data)
      console.log("[COMPARE] Data keys:", Object.keys(data))
      console.log("[COMPARE] Similarity:", data.similarity)
      console.log("[COMPARE] Is same person:", data.is_same_person)
      
      // Validate response structure
      if (data.similarity === undefined || data.is_same_person === undefined) {
        console.error("[COMPARE] Invalid response structure:", data)
        throw new Error("Invalid response from server. Missing required fields.")
      }
      
      setComparisonResult(data)
      console.log("[COMPARE] Result set successfully")
      
    } catch (err) {
      console.error("[COMPARE] Face comparison error:", err)
      setError(err instanceof Error ? err.message : "An error occurred during comparison")
      setComparisonResult(null)
    } finally {
      setIsComparing(false)
    }
  }

  // Retake photo
  const retakePhoto = () => {
    setCapturedImage(null)
    setAnalysisResults([])
    setError("")
    startCamera()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900 dark:to-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
            Face Analysis 🔍
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Comprehensive face analysis: age, gender, attributes, and quality
          </p>
        </div>

        {/* Navigation */}
        <div className="flex justify-center gap-4 mb-8">
          <button
            onClick={() => router.push("/")}
            className="px-6 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            ← Home
          </button>
        </div>

        {/* View Mode Toggle */}
        <div className="flex justify-center mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-1 inline-flex">
            <button
              onClick={() => setViewMode('analysis')}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                viewMode === 'analysis'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Analysis
            </button>
            <button
              onClick={() => setViewMode('comparison')}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                viewMode === 'comparison'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Comparison
            </button>
          </div>
        </div>

        {viewMode === 'analysis' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Camera/Image */}
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
                <div className="p-6">
                  <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-white">
                    {capturedImage ? "Captured Photo" : "Camera"}
                  </h2>

                  {/* Camera/Image Display */}
                  <div className="relative bg-gray-900 rounded-xl overflow-hidden aspect-video mb-4">
                    {!capturedImage ? (
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={capturedImage}
                        alt="Captured"
                        className="w-full h-full object-contain"
                      />
                    )}
                  </div>

                  <canvas ref={canvasRef} className="hidden" />

                  {/* Camera Controls */}
                  <div className="flex flex-col gap-3">
                    {!isCameraOn && !capturedImage && (
                      <button
                        onClick={startCamera}
                        className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all"
                      >
                        📷 Turn On Camera
                      </button>
                    )}

                    {isCameraOn && !capturedImage && (
                      <>
                        <button
                          onClick={capturePhoto}
                          className="w-full py-4 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-blue-700 transition-all"
                        >
                          📸 Take Photo
                        </button>
                        <button
                          onClick={stopCamera}
                          className="w-full py-3 bg-gray-600 text-white rounded-xl font-semibold hover:bg-gray-700 transition-all"
                        >
                          ⏹️ Turn Off Camera
                        </button>
                      </>
                    )}

                    {capturedImage && (
                      <>
                        {/* Analysis Modes */}
                        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                            Analysis Modes:
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {['age', 'gender', 'attributes', 'quality'].map((mode) => (
                              <label key={mode} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={selectedModes.includes(mode)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedModes([...selectedModes, mode])
                                    } else {
                                      setSelectedModes(selectedModes.filter(m => m !== mode))
                                    }
                                  }}
                                  className="rounded"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                                  {mode}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <button
                          onClick={analyzeFaces}
                          disabled={isAnalyzing || selectedModes.length === 0}
                          className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50"
                        >
                          {isAnalyzing ? (
                            <span className="flex items-center justify-center gap-2">
                              <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                              Analyzing...
                            </span>
                          ) : (
                            "🔍 Analyze Face"
                          )}
                        </button>
                        <button
                          onClick={retakePhoto}
                          disabled={isAnalyzing}
                          className="w-full py-3 bg-gray-600 text-white rounded-xl font-semibold hover:bg-gray-700 transition-all disabled:opacity-50"
                        >
                          🔄 Retake Photo
                        </button>
                      </>
                    )}
                  </div>

                  {error && (
                    <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                      <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column - Results */}
            <div className="space-y-6">
              {analysisResults.length === 0 && !isAnalyzing && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
                  <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400">
                      {capturedImage ? "Click 'Analyze Face' to see results" : "Take a photo and analyze to see results"}
                    </p>
                  </div>
                </div>
              )}

              {isAnalyzing && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
                  <div className="text-center py-12">
                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">
                      Analyzing faces...
                    </p>
                  </div>
                </div>
              )}

              {analysisResults.length > 0 && (
                <div className="space-y-4">
                  {analysisResults.map((result, index) => (
                    <div key={index} className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
                      <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
                        Face {result.face_index}
                      </h3>
                      
                      <div className="grid grid-cols-1 gap-4">
                        {result.age !== undefined && (
                          <AgeCard age={result.age} confidence={result.age_confidence || 0} />
                        )}
                        
                        {result.gender && (
                          <GenderCard gender={result.gender} confidence={result.gender_confidence || 0} />
                        )}
                        
                        {result.attributes && (
                          <AttributesCard attributes={result.attributes} />
                        )}
                        
                        {result.quality && (
                          <QualityCard quality={result.quality} />
                        )}
                        
                        {result.quality_error && (
                          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
                            <p className="text-red-800 dark:text-red-200 text-sm">
                              ⚠️ Quality assessment error: {result.quality_error}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <ComparisonView
            image1={compareImage1}
            image2={compareImage2}
            onImage1Change={setCompareImage1}
            onImage2Change={setCompareImage2}
            onCompare={compareFaces}
            result={comparisonResult}
            isComparing={isComparing}
            error={error}
          />
        )}
      </div>
    </div>
  )
}
