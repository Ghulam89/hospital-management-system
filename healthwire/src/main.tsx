import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App';
import {
  getSuperadminSelectedBranchId,
  mergeAdminIdIntoAxiosParams,
  mergeBranchIdIntoAxiosParams,
  mergeBranchScopeIntoRequestUrl,
  shouldSuggestBranchIdQuery,
} from './utils/branchScope';
import { Base_url } from './utils/Base_url';

axios.interceptors.request.use((config) => {
  try {
    const rawUrl = String(config.url || '');
    if (rawUrl.startsWith('https://api.holisticare.pk')) {
      config.url = rawUrl.replace('https://api.holisticare.pk', Base_url);
    }
  } catch {
    /* ignore */
  }
  try {
    const token = localStorage.getItem('userToken');
    if (token) {
      const headers = (config.headers ||= {});
      if (!headers.Authorization) {
        headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch {
    /* ignore */
  }
  try {
    if (shouldSuggestBranchIdQuery()) {
      const branchId = getSuperadminSelectedBranchId();
      if (branchId) mergeBranchIdIntoAxiosParams(config, branchId);
    }
    mergeAdminIdIntoAxiosParams(config);
    mergeBranchScopeIntoRequestUrl(config);
  } catch {
    /* ignore */
  }
  return config;
});
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
