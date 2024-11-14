import {Link} from "react-router-dom";
import './App.css';
import Navbar from "./navbar.jsx";

/* Front-end for landing page  */
function App() {


  return (
    <>
      <h1 className="header">
        Oh hey you 👋🏾.Welcome to UGood, your personal journal. It helps you learn, grow, and meet people who overcame challenges like you😁
      </h1>
      
      <Link to ="/entry">
        <button className='try-ugood'>
          Try UGood Free
        </button>
      </Link> 
      
    </>
  );
}

export default App;
