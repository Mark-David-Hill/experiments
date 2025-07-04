import Modal from "./Modal";

export default function AlertModal(props) {
  const { modalIsOpen, setModalIsOpen, message } = props;

  return (
    <div>
      <Modal
        modalType={"alert"}
        modalIsOpen={modalIsOpen}
        setModalIsOpen={setModalIsOpen}
        message={message}
      />
    </div>
  );
}
