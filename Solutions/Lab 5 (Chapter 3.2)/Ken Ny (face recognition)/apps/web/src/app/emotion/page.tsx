"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { optimizeImage } from "@/utils/imageOptimizer"

// YouTube IFrame API types
declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady: () => void
  }
}

interface MusicRecommendation {
  title: string
  artist: string
  youtube_id: string
  spotify_uri: string
  mood_score: number
  genre: string
  match_score: number
  reason: {
    en: string
    vi: string
  }
}

interface EmotionResult {
  face_box: number[]
  emotion: string
  emotion_label: string
  confidence: number
  mood: string
  mood_score: number
  mood_description: string
  all_emotions: Array<{
    emotion: string
    emotion_en: string
    emotion_vi: string
    confidence: number
    mood: string
  }>
  facial_features?: {
    brightness: number
    contrast: number
    expression_intensity: number
    blur_score: number
    is_clear: boolean
    face_size: {
      width: number
      height: number
      area: number
    }
  }
  insights?: Array<{
    type: string
    text: string
    confidence: string
  }>
  note?: string
  musicRecommendations?: MusicRecommendation[]
  faceAnalysis?: {
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
  }
}

export default function EmotionPage() {
  const [error, setError] = useState("")
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [isCameraOn, setIsCameraOn] = useState(false)
  const [emotionResults, setEmotionResults] = useState<EmotionResult[]>([])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [language] = useState<'vi' | 'en'>('en')
  const [analysisMode, setAnalysisMode] = useState<'quick' | 'deep'>('quick')
  const [includeFaceAnalysis, setIncludeFaceAnalysis] = useState(false)
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null)
  
  // Background music player state
  const [backgroundPlaylist, setBackgroundPlaylist] = useState<MusicRecommendation[]>([])
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(-1)
  const [isBackgroundPlaying, setIsBackgroundPlaying] = useState(false)
  const [playerVolume, setPlayerVolume] = useState(50)
  const [youtubePlayer, setYoutubePlayer] = useState<any>(null)
  const [youtubeAPIReady, setYoutubeAPIReady] = useState(false)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const youtubePlayerRef = useRef<HTMLDivElement>(null)
  const backgroundPlaylistRef = useRef<MusicRecommendation[]>([])
  const currentTrackIndexRef = useRef<number>(-1)
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

  // Load YouTube IFrame API
  useEffect(() => {
    // Check if script already loaded
    if (window.YT && window.YT.Player) {
      setYoutubeAPIReady(true)
      return
    }

    // Load YouTube IFrame API script
    const tag = document.createElement('script')
    tag.src = 'https://www.youtube.com/iframe_api'
    const firstScriptTag = document.getElementsByTagName('script')[0]
    if (firstScriptTag && firstScriptTag.parentNode) {
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag)
    } else {
      document.head.appendChild(tag)
    }

    // Set up callback
    window.onYouTubeIframeAPIReady = () => {
      setYoutubeAPIReady(true)
    }
  }, [])

  // Initialize YouTube player when API is ready
  useEffect(() => {
    if (youtubeAPIReady && youtubePlayerRef.current && !youtubePlayer) {
      try {
        new window.YT.Player(youtubePlayerRef.current, {
          height: '0',
          width: '0',
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            enablejsapi: 1,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
          },
          events: {
            onReady: (event: any) => {
              event.target.setVolume(playerVolume)
              setYoutubePlayer(event.target)
            },
            onStateChange: (event: any) => {
              // 0 = ended, 1 = playing, 2 = paused
              if (event.data === window.YT.PlayerState.ENDED) {
                setIsBackgroundPlaying(false)
                // Auto play next track after a short delay
                setTimeout(() => {
                  if (backgroundPlaylistRef.current.length > 0 && currentTrackIndexRef.current >= 0) {
                    const nextIndex = (currentTrackIndexRef.current + 1) % backgroundPlaylistRef.current.length
                    const nextTrack = backgroundPlaylistRef.current[nextIndex]
                    if (nextTrack) {
                      setCurrentTrackIndex(nextIndex)
                      currentTrackIndexRef.current = nextIndex
                      event.target.loadVideoById(nextTrack.youtube_id)
                      event.target.playVideo()
                    }
                  }
                }, 500)
              } else if (event.data === window.YT.PlayerState.PLAYING) {
                setIsBackgroundPlaying(true)
              } else if (event.data === window.YT.PlayerState.PAUSED) {
                setIsBackgroundPlaying(false)
              }
            },
          },
        })
      } catch (error) {
        console.error('Failed to initialize YouTube player:', error)
      }
    }
  }, [youtubeAPIReady, youtubePlayer, playerVolume])

  // Update refs when state changes
  useEffect(() => {
    backgroundPlaylistRef.current = backgroundPlaylist
  }, [backgroundPlaylist])

  useEffect(() => {
    currentTrackIndexRef.current = currentTrackIndex
  }, [currentTrackIndex])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera()
      if (youtubePlayer) {
        youtubePlayer.destroy()
      }
    }
  }, [youtubePlayer])

  // Capture photo
  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")

    if (!ctx) return

    // Set canvas size to video size
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    
    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Get image as base64
    const originalImageData = canvas.toDataURL("image/jpeg", 0.9)
    
    // Optimize image before storing (will be used for API calls)
    try {
      const optimizedImageData = await optimizeImage(originalImageData, {
        maxWidth: 1280,
        maxHeight: 720,
        quality: 0.85
      })
      setCapturedImage(optimizedImageData)
    } catch (err) {
      console.warn("Failed to optimize image, using original:", err)
      setCapturedImage(originalImageData)
    }
    
    // Reset results
    setEmotionResults([])
    setError("")
    
    // Stop camera after capturing
    stopCamera()
  }

  // Analyze emotions
  const analyzeEmotions = async () => {
    if (!capturedImage) {
      setError("No image to analyze")
      return
    }

    setIsAnalyzing(true)
    setError("")
    setEmotionResults([])

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"
      
      // Choose endpoint based on analysis mode
      const endpoint = analysisMode === 'deep' 
        ? `${apiUrl}/emotion/analyze-deep`
        : `${apiUrl}/emotion/analyze-batch`
      
      console.log(`Analyzing with ${analysisMode} mode...`)
      
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          image: capturedImage, 
          language,
          include_facial_features: analysisMode === 'deep'
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }))
        throw new Error(errorData.error || errorData.detail || "Cannot analyze emotion")
      }

      const data = await response.json()
      console.log("Analysis result:", data)
      
      if (data.count === 0) {
        setError("No faces detected in the image. Try retaking with better lighting.")
        return
      }

      // Get music recommendations and face analysis for each face
      const facesWithExtras = await Promise.all(
        data.faces.map(async (face: EmotionResult) => {
          const result: any = { ...face }
          
          // Get music recommendations
          try {
            const musicResponse = await fetch(`${apiUrl}/emotion/music-recommendations`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                emotion: face.emotion,
                mood_score: face.mood_score,
                count: 3
              })
            })

            if (musicResponse.ok) {
              const musicData = await musicResponse.json()
              result.musicRecommendations = musicData.recommendations
            }
          } catch (err) {
            console.error("Failed to get music recommendations:", err)
          }
          
          // Get face analysis if enabled
          if (includeFaceAnalysis) {
            try {
              const faceAnalysisResponse = await fetch(`${apiUrl}/face-analysis/analyze`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  image: capturedImage,
                  modes: ['age', 'gender', 'attributes'],
                  language: 'en'
                })
              })

              if (faceAnalysisResponse.ok) {
                const faceAnalysisData = await faceAnalysisResponse.json()
                // Match face by position (simplified - in production, match by face_box)
                if (faceAnalysisData.faces && faceAnalysisData.faces.length > 0) {
                  const matchedFace = faceAnalysisData.faces[0] // Use first face for now
                  result.faceAnalysis = {
                    age: matchedFace.age,
                    age_confidence: matchedFace.age_confidence,
                    gender: matchedFace.gender,
                    gender_confidence: matchedFace.gender_confidence,
                    attributes: matchedFace.attributes
                  }
                }
              }
            } catch (err) {
              console.error("Failed to get face analysis:", err)
            }
          }
          
          return result
        })
      )

      setEmotionResults(facesWithExtras)
      
    } catch (err) {
      console.error("Emotion analysis error:", err)
      setError(err instanceof Error ? err.message : "An error occurred during analysis")
    } finally {
      setIsAnalyzing(false)
    }
  }

  // Retake photo
  const retakePhoto = () => {
    setCapturedImage(null)
    setEmotionResults([])
    setError("")
    setAnalysisMode('quick')
    startCamera()
  }

  // Get mood emoji
  const getMoodEmoji = (mood: string) => {
    switch (mood) {
      case "positive": return "😊"
      case "negative": return "😢"
      default: return "😐"
    }
  }

  // Get emotion emoji
  const getEmotionEmoji = (emotion: string) => {
    switch (emotion) {
      case "happy": return "😄"
      case "sad": return "😢"
      case "angry": return "😠"
      case "surprise": return "😲"
      case "fear": return "😨"
      case "disgust": return "🤢"
      case "neutral": return "😐"
      default: return "😐"
    }
  }

  // Background Music Player Functions
  const playInBackground = (music: MusicRecommendation, allRecommendations: MusicRecommendation[]) => {
    // Create playlist from all recommendations
    setBackgroundPlaylist(allRecommendations)
    backgroundPlaylistRef.current = allRecommendations
    
    // Find index of current track
    const index = allRecommendations.findIndex(m => m.youtube_id === music.youtube_id)
    const trackIndex = index >= 0 ? index : 0
    setCurrentTrackIndex(trackIndex)
    currentTrackIndexRef.current = trackIndex
    
    // Load and play the track
    if (youtubePlayer) {
      youtubePlayer.loadVideoById(music.youtube_id)
      youtubePlayer.playVideo()
      setIsBackgroundPlaying(true)
    }
  }

  const toggleBackgroundPlayPause = () => {
    if (!youtubePlayer) return
    
    if (isBackgroundPlaying) {
      youtubePlayer.pauseVideo()
    } else {
      youtubePlayer.playVideo()
    }
  }

  const playNextTrack = () => {
    if (backgroundPlaylistRef.current.length === 0 || currentTrackIndexRef.current < 0) return
    
    const nextIndex = (currentTrackIndexRef.current + 1) % backgroundPlaylistRef.current.length
    const nextTrack = backgroundPlaylistRef.current[nextIndex]
    if (nextTrack && youtubePlayer) {
      setCurrentTrackIndex(nextIndex)
      currentTrackIndexRef.current = nextIndex
      youtubePlayer.loadVideoById(nextTrack.youtube_id)
      youtubePlayer.playVideo()
    }
  }

  const playPreviousTrack = () => {
    if (backgroundPlaylistRef.current.length === 0 || currentTrackIndexRef.current < 0) return
    
    const prevIndex = currentTrackIndexRef.current === 0 
      ? backgroundPlaylistRef.current.length - 1 
      : currentTrackIndexRef.current - 1
    const prevTrack = backgroundPlaylistRef.current[prevIndex]
    if (prevTrack && youtubePlayer) {
      setCurrentTrackIndex(prevIndex)
      currentTrackIndexRef.current = prevIndex
      youtubePlayer.loadVideoById(prevTrack.youtube_id)
      youtubePlayer.playVideo()
    }
  }

  const stopBackgroundMusic = () => {
    if (youtubePlayer) {
      youtubePlayer.stopVideo()
      setIsBackgroundPlaying(false)
    }
  }

  const handleVolumeChange = (volume: number) => {
    setPlayerVolume(volume)
    if (youtubePlayer) {
      youtubePlayer.setVolume(volume)
    }
  }

  const currentTrack = currentTrackIndex >= 0 && backgroundPlaylist.length > 0
    ? backgroundPlaylist[currentTrackIndex]
    : null

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-gray-900 dark:via-purple-900 dark:to-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
            Nhận Diện Cảm Xúc 😊
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Phân tích cảm xúc và tâm trạng từ khuôn mặt
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
          <button
            onClick={() => router.push("/dashboard")}
            className="px-6 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Dashboard
          </button>
        </div>

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

                {/* Hidden canvas for capture */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Camera Controls */}
                <div className="flex flex-col gap-3">
                  {!isCameraOn && !capturedImage && (
                    <button
                      onClick={startCamera}
                      className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50"
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
                      {/* Analysis Mode Toggle */}
                      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-xl space-y-3">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 text-center">
                          Analysis Mode:
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            onClick={() => setAnalysisMode('quick')}
                            disabled={isAnalyzing}
                            className={`py-3 rounded-lg font-medium transition-all ${
                              analysisMode === 'quick'
                                ? 'bg-green-600 text-white shadow-lg'
                                : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            ⚡ Quick
                          </button>
                          <button
                            onClick={() => setAnalysisMode('deep')}
                            disabled={isAnalyzing}
                            className={`py-3 rounded-lg font-medium transition-all ${
                              analysisMode === 'deep'
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                            }`}
                          >
                            🔬 Deep
                          </button>
                        </div>
                        {analysisMode === 'deep' && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                            Detailed analysis: image quality, brightness, expression
                          </p>
                        )}
                        
                        {/* Face Analysis Toggle */}
                        <div className="pt-3 border-t border-gray-300 dark:border-gray-600">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={includeFaceAnalysis}
                              onChange={(e) => setIncludeFaceAnalysis(e.target.checked)}
                              disabled={isAnalyzing}
                              className="rounded"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                              Include Face Analysis (Age, Gender, Attributes)
                            </span>
                          </label>
                        </div>
                      </div>

                      <button
                        onClick={analyzeEmotions}
                        disabled={isAnalyzing}
                        className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50"
                      >
                        {isAnalyzing ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                            Analyzing...
                          </span>
                        ) : (
                          `🔍 Analyze Emotion (${analysisMode === 'deep' ? 'Deep' : 'Quick'})`
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

                {/* Error Display */}
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
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
              <h2 className="text-2xl font-semibold mb-4 text-gray-800 dark:text-white">
                Analysis Results
              </h2>

              {emotionResults.length === 0 && !isAnalyzing && (
                <div className="text-center py-12">
                  <p className="text-gray-500 dark:text-gray-400">
                    {capturedImage ? "Click 'Analyze Emotion' to see results" : "Take a photo and analyze to see results"}
                  </p>
                </div>
              )}

              {isAnalyzing && (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mb-4"></div>
                  <p className="text-gray-600 dark:text-gray-400">
                    Analyzing emotions{analysisMode === 'deep' ? ' in depth' : ''}...
                  </p>
                </div>
              )}

              {emotionResults.length > 0 && (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {/* Warning if using heuristic method */}
                  {emotionResults[0]?.note && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">⚠️</span>
                        <div className="flex-1">
                          <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium mb-2">
                            Using basic heuristic approach
                          </p>
                          <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-2">
                            {emotionResults[0].note}
                          </p>
                          <p className="text-xs text-yellow-700 dark:text-yellow-300">
                            For better accuracy: Install DeepFace
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {emotionResults.map((result, index) => (
                    <div
                      key={index}
                      className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-start gap-4">
                        {/* <div className="text-4xl">
                          {getEmotionEmoji(result.emotion)}
                        </div> */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white">
                              {result.emotion_label}
                            </h3>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              ({(result.confidence * 100).toFixed(1)}%)
                            </span>
                          </div>
                          
                          <div className="mb-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-2xl">{getMoodEmoji(result.mood)}</span>
                              <p className="text-gray-700 dark:text-gray-300 font-medium">
                                {result.mood_description}
                              </p>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  result.mood === 'positive' ? 'bg-green-500' :
                                  result.mood === 'negative' ? 'bg-red-500' :
                                  'bg-gray-500'
                                }`}
                                style={{ width: `${Math.abs(result.mood_score) * 100}%` }}
                              />
                            </div>
                          </div>

                          {/* Top Emotions */}
                          {result.all_emotions && result.all_emotions.length > 0 && (
                            <div className="mt-3 space-y-2">
                              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                                Emotion Details:
                              </p>
                              {result.all_emotions.slice(0, 3).map((emotion, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <span className="text-lg">{getEmotionEmoji(emotion.emotion)}</span>
                                  <span className="text-sm text-gray-700 dark:text-gray-300 flex-1">
                                    {language === 'vi' ? emotion.emotion_vi : emotion.emotion_en}
                                  </span>
                                  <span className="text-sm text-gray-500 dark:text-gray-400">
                                    {(emotion.confidence * 100).toFixed(0)}%
                                  </span>
                                  <div className="w-20 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                                    <div
                                      className="bg-purple-500 h-1.5 rounded-full"
                                      style={{ width: `${emotion.confidence * 100}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          {/* Deep Analysis Results */}
                          {result.facial_features && (
                            <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                🔬 Deep Analysis
                                {analysisMode === 'deep' && (
                                  <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                                    DEEP MODE
                                  </span>
                                )}
                              </p>
                              
                              {/* Insights */}
                              {result.insights && result.insights.length > 0 && (
                                <div className="space-y-2 mb-3">
                                  {result.insights.map((insight: { type: string; text: string; confidence: string }, idx: number) => (
                                    <div 
                                      key={idx}
                                      className={`flex items-start gap-2 text-xs p-2 rounded-lg ${
                                        insight.confidence === 'warning' 
                                          ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200'
                                          : insight.confidence === 'high' || insight.confidence === 'good'
                                          ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200'
                                          : 'bg-gray-50 dark:bg-gray-800/50 text-gray-700 dark:text-gray-300'
                                      }`}
                                    >
                                      <span className="mt-0.5">
                                        {insight.confidence === 'warning' ? '⚠️' : 
                                         insight.confidence === 'high' ? '✓' :
                                         insight.confidence === 'good' ? '✓' : 'ℹ️'}
                                      </span>
                                      <span>{insight.text}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {/* Technical Metrics */}
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="bg-gray-50 dark:bg-gray-800/50 p-2 rounded">
                                  <span className="text-gray-500 dark:text-gray-400">Brightness:</span>
                                  <span className="ml-1 font-medium text-gray-700 dark:text-gray-300">
                                    {result.facial_features.brightness.toFixed(0)}/255
                                  </span>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-800/50 p-2 rounded">
                                  <span className="text-gray-500 dark:text-gray-400">Contrast:</span>
                                  <span className="ml-1 font-medium text-gray-700 dark:text-gray-300">
                                    {result.facial_features.contrast.toFixed(1)}
                                  </span>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-800/50 p-2 rounded">
                                  <span className="text-gray-500 dark:text-gray-400">Expression:</span>
                                  <span className="ml-1 font-medium text-gray-700 dark:text-gray-300">
                                    {result.facial_features.expression_intensity.toFixed(1)}%
                                  </span>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-800/50 p-2 rounded">
                                  <span className="text-gray-500 dark:text-gray-400">Clarity:</span>
                                  <span className="ml-1 font-medium text-gray-700 dark:text-gray-300">
                                    {result.facial_features.is_clear ? '✓ Clear' : '✗ Blurry'}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Face Size */}
                              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                Size: {result.facial_features.face_size.width} × {result.facial_features.face_size.height}px
                              </div>
                            </div>
                          )}

                          {/* Face Analysis Results */}
                          {result.faceAnalysis && (
                            <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                👤 Face Analysis
                              </p>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {result.faceAnalysis.age !== undefined && (
                                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Age</div>
                                    <div className="text-lg font-bold text-gray-800 dark:text-white">
                                      {result.faceAnalysis.age} years
                                    </div>
                                  </div>
                                )}
                                {result.faceAnalysis.gender && (
                                  <div className="bg-pink-50 dark:bg-pink-900/20 rounded-lg p-3">
                                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Gender</div>
                                    <div className="text-lg font-bold text-gray-800 dark:text-white">
                                      {result.faceAnalysis.gender}
                                    </div>
                                  </div>
                                )}
                                {result.faceAnalysis.attributes && (
                                  <div className="md:col-span-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                                    <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">Attributes</div>
                                    <div className="flex flex-wrap gap-2">
                                      {result.faceAnalysis.attributes.glasses && (
                                        <span className="text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded">👓 Glasses</span>
                                      )}
                                      {result.faceAnalysis.attributes.beard && (
                                        <span className="text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded">🧔 Beard</span>
                                      )}
                                      {result.faceAnalysis.attributes.hat && (
                                        <span className="text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded">🎩 Hat</span>
                                      )}
                                      {result.faceAnalysis.attributes.mustache && (
                                        <span className="text-xs bg-white dark:bg-gray-800 px-2 py-1 rounded">🤏 Mustache</span>
                                      )}
                                      {!result.faceAnalysis.attributes.glasses && 
                                       !result.faceAnalysis.attributes.beard && 
                                       !result.faceAnalysis.attributes.hat && 
                                       !result.faceAnalysis.attributes.mustache && (
                                        <span className="text-xs text-gray-500 dark:text-gray-400">No special attributes detected</span>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Music Recommendations */}
                          {result.musicRecommendations && result.musicRecommendations.length > 0 && (
                            <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                                🎵 Music for Your Mood
                              </p>
                              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                                {result.musicRecommendations[0]?.reason[language] || 'Music recommendations for your mood'}
                              </p>
                              
                              <div className="space-y-2">
                                {result.musicRecommendations.map((music, idx) => (
                                  <div 
                                    key={idx}
                                    className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-3 hover:shadow-md transition-all"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex-1">
                                        <h4 className="font-semibold text-gray-800 dark:text-white text-sm">
                                          {music.title}
                                        </h4>
                                        <p className="text-xs text-gray-600 dark:text-gray-400">
                                          {music.artist} • {music.genre}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                          <span className="text-xs text-purple-600 dark:text-purple-400">
                                            Match: {(music.match_score * 100).toFixed(0)}%
                                          </span>
                                        </div>
                                      </div>
                                      
                                      <div className="flex gap-2 flex-wrap">
                                        {/* Play in Background Button */}
                                        <button
                                          onClick={() => playInBackground(music, result.musicRecommendations || [])}
                                          className="flex items-center gap-1 px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-xs font-medium transition-colors"
                                          title="Play in background"
                                        >
                                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                                          </svg>
                                          Background
                                        </button>
                                        
                                        {/* YouTube Button */}
                                        <a
                                          href={`https://www.youtube.com/watch?v=${music.youtube_id}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-1 px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-medium transition-colors"
                                          onClick={() => setCurrentlyPlaying(music.youtube_id)}
                                        >
                                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                                          </svg>
                                          Play
                                        </a>
                                        
                                        {/* Spotify Button */}
                                        <a
                                          href={music.spotify_uri.replace('spotify:track:', 'https://open.spotify.com/track/')}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="flex items-center gap-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-medium transition-colors"
                                        >
                                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                                          </svg>
                                          Spotify
                                        </a>
                                      </div>
                                    </div>
                                    
                                    {/* Embedded YouTube Player */}
                                    {currentlyPlaying === music.youtube_id && (
                                      <div className="mt-3 rounded-lg overflow-hidden">
                                        <iframe
                                          width="100%"
                                          height="200"
                                          src={`https://www.youtube.com/embed/${music.youtube_id}?autoplay=1`}
                                          title={music.title}
                                          frameBorder="0"
                                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                          allowFullScreen
                                          className="rounded-lg"
                                        ></iframe>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Info Card */}
            <div className="bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-2xl p-6">
              <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-white">
                ℹ️ Instructions
              </h3>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li>• Turn on camera and adjust for clear face view</li>
                <li>• Take photo - image displays immediately</li>
                <li>• Choose mode: ⚡ Quick or 🔬 Deep</li>
                <li>• Click analyze to see detailed results</li>
                <li>• Deep mode: more information about image quality</li>
                <li>• Green: positive | Red: negative</li>
                <li>• 🎵 Get personalized music recommendations based on your mood!</li>
                <li>• 🎶 Click "Background" to play music in background player</li>
                <li>• Use mini player at bottom to control playback</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden YouTube Player */}
      <div ref={youtubePlayerRef} className="hidden"></div>

      {/* Background Music Mini Player */}
      {currentTrack && (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-2xl z-50">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              {/* Track Info */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xl">🎵</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-800 dark:text-white text-sm truncate">
                    {currentTrack.title}
                  </h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                    {currentTrack.artist} • {currentTrack.genre}
                  </p>
                </div>
              </div>

              {/* Player Controls */}
              <div className="flex items-center gap-2">
                {/* Previous Button */}
                <button
                  onClick={playPreviousTrack}
                  disabled={backgroundPlaylist.length <= 1}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Previous track"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                  </svg>
                </button>

                {/* Play/Pause Button */}
                <button
                  onClick={toggleBackgroundPlayPause}
                  className="p-2 bg-purple-500 hover:bg-purple-600 text-white rounded-full transition-colors"
                  title={isBackgroundPlaying ? "Pause" : "Play"}
                >
                  {isBackgroundPlaying ? (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  )}
                </button>

                {/* Next Button */}
                <button
                  onClick={playNextTrack}
                  disabled={backgroundPlaylist.length <= 1}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Next track"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
                  </svg>
                </button>

                {/* Stop Button */}
                <button
                  onClick={stopBackgroundMusic}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                  title="Stop"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 6h12v12H6z"/>
                  </svg>
                </button>
              </div>

              {/* Volume Control */}
              <div className="flex items-center gap-2 w-32">
                <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                </svg>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={playerVolume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-xs text-gray-600 dark:text-gray-400 w-8">
                  {playerVolume}%
                </span>
              </div>

              {/* Playlist Info */}
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {currentTrackIndex + 1} / {backgroundPlaylist.length}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
