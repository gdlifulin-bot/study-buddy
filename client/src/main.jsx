import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { AuthProvider } from './contexts/AuthContext';  // 【新增】认证
import { UserProvider } from './contexts/UserContext';
import { PlanProvider } from './contexts/PlanContext';
import { CheckinProvider } from './contexts/CheckinContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <UserProvider>
          <PlanProvider>
            <CheckinProvider>
              <App />
            </CheckinProvider>
          </PlanProvider>
        </UserProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
