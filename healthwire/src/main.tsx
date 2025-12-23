import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App';
import './css/style.css';
import './css/satoshi.css';
// import 'jsvectormap/dist/css/jsvectormap.css';
// import 'flatpickr/dist/flatpickr.min.css';
import {Provider} from "react-redux";
import Store from "./store"
import { ToastContainer} from 'react-toastify';
import "react-toastify/dist/ReactToastify.css"
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <Provider store={Store}>
    <Router>
      <App />
    </Router>
    <ToastContainer />
    </Provider>
  </React.StrictMode>,
);
