interface GenderCardProps {
  gender: string
  confidence: number
}

export default function GenderCard({ gender, confidence }: GenderCardProps) {
  const isMale = gender.toLowerCase() === 'male'
  const confidencePercent = (confidence * 100).toFixed(0)
  const icon = isMale ? '👨' : '👩'
  const bgColor = isMale 
    ? 'from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20'
    : 'from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20'
  const borderColor = isMale
    ? 'border-blue-200 dark:border-blue-800'
    : 'border-pink-200 dark:border-pink-800'
  const accentColor = isMale ? 'bg-blue-500' : 'bg-pink-500'
  const progressColor = isMale ? 'bg-blue-500' : 'bg-pink-500'
  
  return (
    <div className={`bg-gradient-to-br ${bgColor} rounded-xl p-4 border ${borderColor}`}>
      <div className="flex items-center gap-3">
        <div className={`flex-shrink-0 w-12 h-12 ${accentColor} rounded-lg flex items-center justify-center`}>
          <span className="text-white text-xl">{icon}</span>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            Gender
          </h3>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-gray-800 dark:text-white">
              {gender}
            </span>
          </div>
          <div className="mt-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-500 dark:text-gray-400">Confidence:</span>
              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`${progressColor} h-2 rounded-full transition-all`}
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
