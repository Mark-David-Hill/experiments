import './TimeDisplay.css'
import { TIME_LABELS } from '../data/timeOfDay'

function TimeDisplay({ currentTime }) {
  return (
    <div className="time-display">
      <div className="time-label">Time of Day</div>
      <div className="time-value">{TIME_LABELS[currentTime] || currentTime}</div>
    </div>
  )
}

export default TimeDisplay
