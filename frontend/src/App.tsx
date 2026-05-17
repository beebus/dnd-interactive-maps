import React from 'react';
import './App.css';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import MapPage from './pages/MapPage';

function App() {
  return (
    <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/maps/underdark" element={<MapPage mapName="Underdark" />} />
          <Route path="/maps/elturel" element={<MapPage mapName="Elturel" />} />
        </Routes>
    </Router>
  );
}

export default App;
