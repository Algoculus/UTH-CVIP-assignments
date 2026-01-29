interface AgeCardProps {
  age: number
  confidence: number
}

export default function AgeCard({ age, confidence }: AgeCardProps) {
  const confidencePercent = (confidence * 100).toFixed(0)
  
  return (
    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
      <div className="flex items-center gap-3">
        <div className="flex-shrink-0 w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
          <span className="text-white text-xl">🎂</span>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            Estimated Age
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-gray-800 dark:text-white">
              {age}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              years old
            </span>
          </div>
          <div className="mt-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500 dark:text-gray-400">Confidence:</span>
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all"
                  style={{ width: `${confidence * 100}%` }}
                />
              </div>
              <span className="text-gray-600 dark:text-gray-300 font-medium">
                {confidencePercent}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
