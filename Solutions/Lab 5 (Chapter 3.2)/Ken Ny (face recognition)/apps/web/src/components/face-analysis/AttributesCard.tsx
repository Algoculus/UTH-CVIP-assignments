interface AttributesCardProps {
  attributes: {
    glasses: boolean
    beard: boolean
    hat: boolean
    mustache: boolean
  }
}

export default function AttributesCard({ attributes }: AttributesCardProps) {
  const attributeItems = [
    { key: 'glasses', label: 'Glasses', icon: '👓', value: attributes.glasses },
    { key: 'beard', label: 'Beard', icon: '🧔', value: attributes.beard },
    { key: 'hat', label: 'Hat', icon: '🎩', value: attributes.hat },
    { key: 'mustache', label: 'Mustache', icon: '🤏', value: attributes.mustache },
  ]
  
  return (
    <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-shrink-0 w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
          <span className="text-white text-xl">🎭</span>
        </div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
          Face Attributes
        </h3>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {attributeItems.map((item) => (
          <div
            key={item.key}
            className={`flex items-center gap-2 p-2 rounded-lg ${
              item.value
                ? 'bg-purple-100 dark:bg-purple-900/30'
                : 'bg-gray-100 dark:bg-gray-800/50'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <div className="flex-1">
              <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {item.label}
              </div>
            </div>
            <div className={`w-3 h-3 rounded-full ${
              item.value ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
            }`} />
          </div>
        ))}
      </div>
    </div>
  )
}
