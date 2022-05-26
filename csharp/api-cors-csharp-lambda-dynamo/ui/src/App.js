import { BrowserRouter, Routes, Route } from "react-router-dom";
import Blogs from "./components/Blogs";
import "./App.css";

function App() {
  return (
    <div className="App">
      <header className="">header</header>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Blogs />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
