import { useState } from 'react'
import './App.css'
import OverworldMap from './components/OverworldMap'
import TravelMap from './components/TravelMap'
import TimeDisplay from './components/TimeDisplay'
import { overworldMap } from './data/overworldMap'
import { TIME_OF_DAY, getNextTime } from './data/timeOfDay'

function App() {
  const [currentView, setCurrentView] = useState('overworld') // 'overworld' or 'travel'
  const [currentPath, setCurrentPath] = useState(null)
  const [currentConnection, setCurrentConnection] = useState(null)
  const [currentPoint, setCurrentPoint] = useState('a')
  const [currentTime, setCurrentTime] = useState(TIME_OF_DAY.DAWN)

  const handleTimeAdvance = () => {
    setCurrentTime(getNextTime(currentTime))
  }

  const handleTravel = (pathId, connection) => {
    setCurrentPath(pathId)
    setCurrentConnection(connection)
    setCurrentView('travel')
  }

  const handleArrive = (destination) => {
    // Update current point to the destination (which may differ from connection.to due to branches)
    if (destination) {
      setCurrentPoint(destination)
    } else if (currentConnection) {
      setCurrentPoint(currentConnection.to)
    }
    setCurrentView('overworld')
    setCurrentPath(null)
    setCurrentConnection(null)
  }

  const handleReturnToOverworld = () => {
    // Don't update current point if returning without arriving
    setCurrentView('overworld')
    setCurrentPath(null)
    setCurrentConnection(null)
  }

  return (
    <div className="app">
      <h1>Adventure Game</h1>
      <TimeDisplay currentTime={currentTime} />
      {currentView === 'overworld' ? (
        <OverworldMap
          currentPoint={currentPoint}
          onTravel={handleTravel}
        />
      ) : (
        <TravelMap
          pathId={currentPath}
          connection={currentConnection}
          onReturn={handleReturnToOverworld}
          onArrive={handleArrive}
          onTimeAdvance={handleTimeAdvance}
        />
      )}
    </div>
  )
}

export default App
