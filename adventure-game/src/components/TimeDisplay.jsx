import './TimeDisplay.css'
import { TIME_LABELS } from '../data/timeOfDay'
import { WEATHER_LABELS } from '../data/weather'

function TimeDisplay({ currentTime, currentWeather }) {
  return (
    <div className="time-weather-cards">
      <div className="time-display card">
        <div className="time-label">Time of Day</div>
        <div className="time-value">{TIME_LABELS[currentTime] || currentTime}</div>
      </div>
      <div className="weather-display card">
        <div className="weather-label">Weather</div>
        <div className="weather-value">{WEATHER_LABELS[currentWeather] || currentWeather}</div>
      </div>
    </div>
  )
}

export default TimeDisplay
