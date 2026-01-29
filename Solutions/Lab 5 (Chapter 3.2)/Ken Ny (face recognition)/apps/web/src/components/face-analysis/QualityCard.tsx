interface QualityCardProps {
  quality: {
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
}

export default function QualityCard({ quality }: QualityCardProps) {
  const getQualityColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600 dark:text-green-400'
    if (score >= 0.6) return 'text-yellow-600 dark:text-yellow-400'
    return 'text-red-600 dark:text-red-400'
  }
  
  const getQualityBg = (score: number) => {
    if (score >= 0.8) return 'bg-green-500'
    if (score >= 0.6) return 'bg-yellow-500'
    return 'bg-red-500'
  }
  
  const metrics = [
    { label: 'Blur', value: quality.blur_score, icon: '🔍' },
    { label: 'Brightness', value: quality.brightness, icon: '💡' },
    { label: 'Contrast', value: quality.contrast, icon: '🎨' },
    { label: 'Symmetry', value: quality.symmetry, icon: '⚖️' },
  ]
  
  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-shrink-0 w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
          <span className="text-white text-xl">✨</span>
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
            Quality Assessment
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className={`text-sm font-bold ${getQualityColor(quality.overall_score)}`}>
              {quality.quality_level}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ({(quality.overall_score * 100).toFixed(0)}%)
            </span>
          </div>
        </div>
      </div>
      
      {/* Overall Score Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-600 dark:text-gray-400">Overall Quality</span>
          <span className="text-gray-600 dark:text-gray-300 font-medium">
            {(quality.overall_score * 100).toFixed(0)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div
            className={`${getQualityBg(quality.overall_score)} h-3 rounded-full transition-all`}
            style={{ width: `${quality.overall_score * 100}%` }}
          />
        </div>
      </div>
      
      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {metrics.map((metric) => (
          <div key={metric.label} className="bg-white/50 dark:bg-gray-800/50 rounded-lg p-2">
            <div className="flex items-center gap-1 mb-1">
              <span className="text-sm">{metric.icon}</span>
              <span className="text-xs text-gray-600 dark:text-gray-400">{metric.label}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div
                className="bg-green-500 h-1.5 rounded-full"
                style={{ width: `${metric.value * 100}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {(metric.value * 100).toFixed(0)}%
            </div>
          </div>
        ))}
      </div>
      
      {/* Additional Info */}
      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <span>Angle:</span>
          <span className="font-medium">{Math.abs(quality.angle).toFixed(1)}°</span>
        </div>
        {quality.occlusion_detected && (
          <div className="text-red-600 dark:text-red-400 font-medium">
            ⚠️ Occlusion detected
          </div>
        )}
      </div>
      
      {/* Recommendations */}
      {quality.recommendations && quality.recommendations.length > 0 && (
        <div className="mt-4 pt-4 border-t border-green-200 dark:border-green-800">
          <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Recommendations:
          </h4>
          <ul className="space-y-1">
            {quality.recommendations.map((rec, idx) => (
              <li key={idx} className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-2">
                <span>•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
