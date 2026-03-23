import "./App.css";
import Hero from "./Hero";
import Rooms from "./Rooms";
// import CalendarSection from "./CalendarSection";
// import Facilities from "./Facilities";
import Gallery from "./Gallery";
import Testimonials from "./Testimonials";
import Footer from "./Footer";

function App() {
  return (
    <div>
      <Hero />
      <Rooms />
      {/* <CalendarSection /> */}
      {/* <Facilities /> */}
      <Gallery />
      <Testimonials />
      <Footer />
    </div>
  );
}

export default App;