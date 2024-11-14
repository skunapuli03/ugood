import React from 'react'; 
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom'; 
import './index.css';
import App from './App.jsx';
import Layout from './layout.jsx'; // Import the layout
import Entry from './entry.jsx';
import Features from './features.jsx'
import About from './about.jsx';
import Resources from './resources.jsx';



const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout> <App /></Layout>,
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
    path: "/about",
    element: <Layout> <About/></Layout>,
  },
  {
    path: "/resources",
    element: <Layout> <Resources/></Layout>,
  },
]);


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>

);


