import { BrowserRouter, Switch, Route } from "react-router-dom";

import icons from "./helpers/icons";

import Contact from "./components/pages/Contact";
import NoPage from "./components/pages/NoPage";
import About from "./components/pages/About";
import Home from "./components/pages/Home";
import Navbar from "./components/nav/Navbar";
import Footer from "./components/nav/Footer";

import "./styles/main.scss";

icons();

function App() {
  return (
    <div className={"App"}>
      <BrowserRouter>
        <Navbar />
        <Switch>
          <Route exact path="/" component={Home} />
          <Route path="/about" component={About} />
          <Route path="/contact" component={Contact} />
          <Route component={NoPage} />
        </Switch>
      </BrowserRouter>
      <Footer />
    </div>
  );
}

export default App;
