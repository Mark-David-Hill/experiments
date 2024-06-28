export default function About() {
  return (
    <div className="about-container">
      <h1>About</h1>
      <p>
        This e-commerce site was made as part of my apprenticeship at
        DevPipeline. For our React Capstone we were asked to create an
        e-commerce site with a variety of features.
      </p>
      <p>
        It was an interesting challenge! While I had worked on projects in React
        before, this was the first time I needed to build a React App of this
        scope. While I wasn't quite sure how to start at the beginning, it
        helped to break down what pages, components, and functionality would be
        needed. My plans weren't perfect and some things needed to be refactored
        along the way, but it was still helpeful for getting a general idea of
        where I was going and what steps I could begin to take.
      </p>
      <p>
        One example of a challenge from this project was that as I was building
        out the cart functionality It became difficult to work with the products
        data that had been fetched, as it was being passed around and used in
        several places. The problem was solved by adding the array of fetched
        product data to context so it could be more easily used in conjunction
        with the cart and on other pages. There were a variety of similar
        instances where I was able to refactor my code to make it more
        manageable and easy to work with.
      </p>
      <p>
        As I have gone through DevPipeline's frontend course, one of the things
        that was most challening was getting used to styling. Though there were
        challenges along the way, especially on the bigger homework assignments,
        with each new assignment/project I completed I was able to see where I
        went wrong and find ways to improve my process and my code going
        forward.
      </p>
      <p>
        Overall it was very satisfying learning React and building this app out,
        since I know it would've taken so much longer to accomplish without the
        help of React. Though I like a lot of things about the syntax of Python,
        currently my favorite programming language is JavaScript when paired
        with React. I enjoy being able to build things out with components and
        see the end-user product come together on the frontend. My preferences
        may change as I go through the backend course though.
      </p>
    </div>
  );
}
