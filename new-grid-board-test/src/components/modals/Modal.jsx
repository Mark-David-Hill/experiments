import { useContext } from "react";
import ReactModal from "react-modal";

import { GridBoardContext } from "../context/ContextProvider";

const basicStyles = {
  top: "50%",
  left: "50%",
  right: "auto",
  bottom: "auto",
  marginRight: "-50%",
  transform: "translate(-50%, -50%)",
};

const customStyles = {
  overlay: {
    backgroundColor: "rgba(150, 150, 150, 0.5)",
  },
  content: {
    ...basicStyles,
    backgroundColor: "white",
  },
};

const customDarkStyles = {
  overlay: {
    backgroundColor: "rgba(0, 0, 0, 0.75)",
  },
  content: {
    ...basicStyles,
    backgroundColor: "#494b50",
    color: "rgb(232, 236, 238)",
  },
};

ReactModal.setAppElement("#root");

export default function Modal(props) {
  const { isDarkMode } = useContext(GridBoardContext);
  const { modalType, modalIsOpen, setModalIsOpen, message, handleClickYes } =
    props;

  function closeModal() {
    setModalIsOpen(false);
  }

  function handleClick() {
    handleClickYes();
    closeModal();
  }

  return (
    <div>
      <ReactModal
        isOpen={modalIsOpen}
        onRequestClose={closeModal}
        style={isDarkMode ? customDarkStyles : customStyles}
        contentLabel="Base Modal"
      >
        <div className={"modal-content-wrapper " + (isDarkMode && "dark-mode")}>
          <div className="modal-close-wrapper">
            <button onClick={closeModal}>x</button>
          </div>
          <h3>{message}</h3>
          {modalType === "confirmation" ? (
            <div className="modal-buttons-wrapper">
              <button onClick={closeModal}>No</button>
              <button onClick={handleClick}>Yes</button>
            </div>
          ) : (
            <div className="modal-buttons-wrapper">
              <button className="close-button" onClick={closeModal}>
                Close
              </button>
            </div>
          )}
        </div>
      </ReactModal>
    </div>
  );
}
