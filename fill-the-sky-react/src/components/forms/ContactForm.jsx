export default function ContactForm(props) {
  const { handleSubmit } = props;

  return (
    <form
      className="contact-form"
      onSubmit={(e) => {
        e.preventDefault();
        handleSubmit();
      }}
    >
      <input
        type="text"
        id="first-name"
        name="first-name"
        placeholder="First Name"
        required
      />
      <input
        type="text"
        id="last-name"
        name="last-name"
        placeholder="Last Name"
        required
      />
      <input type="text" id="email" name="email" placeholder="Email" required />
      <textarea
        name="message"
        id="message"
        cols="30"
        rows="10"
        placeholder="Message"
        required
      ></textarea>
      <input type="submit" />
    </form>
  );
}
