import Modal from "./Modal";

export default function ConfirmationModal(props) {
  const { modalIsOpen, setModalIsOpen, message, handleClickYes } = props;

  return (
    <div>
      <Modal
        modalType={"confirmation"}
        modalIsOpen={modalIsOpen}
        setModalIsOpen={setModalIsOpen}
        message={message}
        handleClickYes={handleClickYes}
      />
    </div>
  );
}
