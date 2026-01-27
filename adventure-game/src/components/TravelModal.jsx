import './TravelModal.css'

function TravelModal({ fromPoint, toPoint, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>Travel to {toPoint.label}?</h3>
        <p className="travel-route">
          {fromPoint.label} → {toPoint.label}
        </p>
        <p className="modal-description">
          This will take you to the travel map for this path.
        </p>
        <div className="modal-buttons">
          <button onClick={onConfirm} className="confirm-button">
            Travel
          </button>
          <button onClick={onCancel} className="cancel-button">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default TravelModal
