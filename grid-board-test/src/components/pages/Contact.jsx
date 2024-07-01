import { useState } from "react";

import ContactForm from "../forms/ContactForm";
import AlertModal from "../modals/AlertModal";

export default function Contact() {
  const [alertModalIsOpen, setAlertModalIsOpen] = useState(false);

  const modalMessage = "Your message was sent.";

  const handleSubmit = () => {
    const form = document.getElementsByClassName("contact-form")[0];
    setAlertModalIsOpen(true);
    form.reset();
  };

  return (
    <div className="contact-container">
      <AlertModal
        modalIsOpen={alertModalIsOpen}
        setModalIsOpen={setAlertModalIsOpen}
        message={modalMessage}
      />
      <h1>Contact</h1>
      <ContactForm handleSubmit={handleSubmit} />
    </div>
  );
}
