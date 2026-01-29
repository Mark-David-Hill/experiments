// Time of day system
export const TIME_OF_DAY = {
  DAWN: 'dawn',
  MORNING: 'morning',
  NOON: 'noon',
  AFTERNOON: 'afternoon',
  EVENING: 'evening',
  MIDNIGHT: 'midnight',
  DEEP_NIGHT: 'deep night',
}

export const TIME_ORDER = [
  TIME_OF_DAY.DAWN,
  TIME_OF_DAY.MORNING,
  TIME_OF_DAY.NOON,
  TIME_OF_DAY.AFTERNOON,
  TIME_OF_DAY.EVENING,
  TIME_OF_DAY.MIDNIGHT,
  TIME_OF_DAY.DEEP_NIGHT,
]

export const TIME_LABELS = {
  [TIME_OF_DAY.DAWN]: 'Dawn',
  [TIME_OF_DAY.MORNING]: 'Morning',
  [TIME_OF_DAY.NOON]: 'Noon',
  [TIME_OF_DAY.AFTERNOON]: 'Afternoon',
  [TIME_OF_DAY.EVENING]: 'Evening',
  [TIME_OF_DAY.MIDNIGHT]: 'Midnight',
  [TIME_OF_DAY.DEEP_NIGHT]: 'Deep Night',
}

export const getNextTime = (currentTime) => {
  const currentIndex = TIME_ORDER.indexOf(currentTime)
  if (currentIndex === -1) return TIME_ORDER[0]
  const nextIndex = (currentIndex + 1) % TIME_ORDER.length
  return TIME_ORDER[nextIndex]
}
