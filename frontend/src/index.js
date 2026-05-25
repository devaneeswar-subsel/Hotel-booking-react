import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import ManagerApp from "./ManagerApp";
import reportWebVitals from "./reportWebVitals";

const root = ReactDOM.createRoot(document.getElementById("root"));
const isManager = window.location.pathname.startsWith("/manager");

root.render(
  <React.StrictMode>{isManager ? <ManagerApp /> : <App />}</React.StrictMode>,
);

reportWebVitals();
