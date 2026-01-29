"use client"

import { useState } from "react"
import { optimizeImageFromFile } from "@/utils/imageOptimizer"

interface ComparisonResult {
  similarity: number
  distance: number
  is_same_person: boolean
  confidence: number
  threshold: number
  face1_box: number[]
  face2_box: number[]
}

interface ComparisonViewProps {
  image1: string | null
  image2: string | null
  onImage1Change: (image: string) => void
  onImage2Change: (image: string) => void
  onCompare: () => void
  result: ComparisonResult | null
  isComparing: boolean
  error?: string
}

export default function ComparisonView({
  image1,
  image2,
  onImage1Change,
  onImage2Change,
  onCompare,
  result,
  isComparing,
  error
}: ComparisonViewProps) {
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, setImage: (img: string) => void) => {
    const file = e.target.files?.[0]
    if (file) {
      try {
        // Optimize image before setting (will be optimized again before API call)
        const optimizedImage = await optimizeImageFromFile(file, {
          maxWidth: 1920,
          maxHeight: 1080,
          quality: 0.9
        })
        setImage(optimizedImage)
      } catch (error) {
        console.error("Failed to optimize image:", error)
        // Fallback to original method
        const reader = new FileReader()
        reader.onload = (event) => {
          if (event.target?.result) {
            setImage(event.target.result as string)
          }
        }
        reader.readAsDataURL(file)
      }
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6">
      <h2 className="text-2xl font-semibold mb-6 text-gray-800 dark:text-white">
        Face Comparison
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Image 1 */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Face 1
          </label>
          <div className="relative bg-gray-100 dark:bg-gray-900 rounded-xl overflow-hidden aspect-square border-2 border-dashed border-gray-300 dark:border-gray-700">
            {image1 ? (
              <img
                src={image1}
                alt="Face 1"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <span className="text-4xl mb-2 block">📷</span>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Upload or capture image
                  </p>
                </div>
              </div>
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleImageUpload(e, onImage1Change)}
            className="hidden"
            id="image1-upload"
          />
          <label
            htmlFor="image1-upload"
            className="block w-full py-2 px-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-center cursor-pointer transition-colors"
          >
            {image1 ? "Change Image" : "Upload Image"}
          </label>
        </div>
        
        {/* Image 2 */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Face 2
          </label>
          <div className="relative bg-gray-100 dark:bg-gray-900 rounded-xl overflow-hidden aspect-square border-2 border-dashed border-gray-300 dark:border-gray-700">
            {image2 ? (
              <img
                src={image2}
                alt="Face 2"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <span className="text-4xl mb-2 block">📷</span>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Upload or capture image
                  </p>
                </div>
              </div>
            )}
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleImageUpload(e, onImage2Change)}
            className="hidden"
            id="image2-upload"
          />
          <label
            htmlFor="image2-upload"
            className="block w-full py-2 px-4 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-center cursor-pointer transition-colors"
          >
            {image2 ? "Change Image" : "Upload Image"}
          </label>
        </div>
      </div>
      
      {/* Compare Button */}
      <button
        onClick={onCompare}
        disabled={!image1 || !image2 || isComparing}
        className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isComparing ? (
          <span className="flex items-center justify-center gap-2">
            <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
            Comparing...
          </span>
        ) : (
          "🔍 Compare Faces"
        )}
      </button>
      
      {/* Error Message */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
        </div>
      )}
      
      {/* Results */}
      {result ? (
        <div className="mt-6 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
          <div className="text-center">
            <div className="text-4xl mb-3">
              {result.is_same_person ? "✅" : "❌"}
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
              {result.is_same_person ? "Same Person" : "Different Persons"}
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Similarity:</span>
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {result.similarity !== undefined ? (result.similarity * 100).toFixed(1) : 'N/A'}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    result.is_same_person ? 'bg-green-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${result.similarity !== undefined ? Math.min(result.similarity * 100, 100) : 0}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Confidence:</span>
                <span className="text-gray-800 dark:text-white font-medium">
                  {result.confidence !== undefined ? (result.confidence * 100).toFixed(1) : 'N/A'}%
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">Distance:</span>
                <span className="text-gray-800 dark:text-white font-medium">
                  {result.distance !== undefined ? result.distance.toFixed(4) : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        !isComparing && (
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl text-center">
            <p className="text-gray-500 dark:text-gray-400">
              Upload two images and click "Compare Faces" to see results
            </p>
          </div>
        )
      )}
    </div>
  )
}
