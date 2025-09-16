import React, { Component } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Inbox from './pages/Inbox';
import Notification from './pages/Notification';

export default class App extends Component {
  render() {
    return (
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/home" element={<Home />} />
          <Route path="/inbox" element={<Inbox />} />
          <Route path="/notifications" element={<Notification />} />
        </Routes>
      </Router>
    );
  }
}