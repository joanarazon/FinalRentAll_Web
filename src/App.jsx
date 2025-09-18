import React, { Component } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import Inbox from "./pages/Inbox";
import Notification from "./pages/Notification";
import AdminHome from "./pages/admin/AdminHome";
import PendingUser from "./pages/admin/pages/PendingUser";
import PendingItems from "./pages/admin/pages/PendingItems";
import ViewRentingHistory from "./pages/admin/pages/ViewRentingHistory";
import PendingBookings from "./pages/admin/pages/PendingBookings";

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
                    <Route path="/adminhome" element={<AdminHome />} />
                    <Route path="/pending-users" element={<PendingUser />} />
                    <Route path="/pending-items" element={<PendingItems />} />
                    <Route
                        path="/pending-bookings"
                        element={<PendingBookings />}
                    />
                    <Route
                        path="/renting-history"
                        element={<ViewRentingHistory />}
                    />
                </Routes>
            </Router>
        );
    }
}
