import React from 'react'; 
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom'; 
import { Analytics } from "@vercel/analytics/react";
import './index.css';
import App from './App.jsx';
import Layout from './layout.jsx'; // Import the layout
import Entry from './entry.jsx';
import Features from './features.jsx'
import Resources from './resources.jsx';
import AuthPage from './auth.jsx';
import JournalDetail from './journalDetail.jsx';
import ResetPasswordConfirmation from './reset-password.jsx';
import EmailConfirmation from './EmailConfirmation.jsx';
import About from './about.jsx';
//need to import contact after launching

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout> <App /></Layout>,
  },
  {
    path: "/about",
    element: <Layout> <About /></Layout>,
  },
  {
    path: "/entry",
    element: <Layout> <Entry /></Layout>,
  },
  {
    path: "/features",
    element: <Layout> <Features></Features></Layout>,
  },

  {
    path: "/resources",
    element: <Layout> <Resources/></Layout>,
  },
  {
    path: "/auth",
    element: <Layout> <AuthPage /></Layout>,
  },
  {
    path: "/journal/:id",
    element: <Layout> <JournalDetail /></Layout>,
  },
  {
    path: "/auth/EmailConfirmation",
    element: <Layout><EmailConfirmation /></Layout>,
  },
  {
    path: "/auth/reset-password",
    element: <Layout><ResetPasswordConfirmation /></Layout>,
  }
]);


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>

);


