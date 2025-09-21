import React, { Component } from "react";
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Outlet,
} from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Home from "./pages/Home";
import Inbox from "./pages/Inbox";
import Notification from "./pages/Notification";
import AdminHome from "./pages/admin/AdminHome";
import PendingUser from "./pages/admin/pages/PendingUser";
import PendingItems from "./pages/admin/pages/PendingItems";
import ViewRentingHistory from "./pages/admin/pages/ViewRentingHistory";
// PendingBookings view intentionally hidden from admin routing
// import PendingBookings from "./pages/admin/pages/PendingBookings";
import OwnerBookingRequests from "./pages/OwnerBookingRequests";
import RequireAuth from "./components/RequireAuth.jsx";
import RequireRole from "./components/RequireRole.jsx";
import NotAuthorized from "./pages/NotAuthorized.jsx";

export default class App extends Component {
    render() {
        return (
            <Router>
                <Routes>
                    <Route path="/" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route path="/not-authorized" element={<NotAuthorized />} />
                    <Route
                        path="/home"
                        element={
                            <RequireAuth>
                                <Home />
                            </RequireAuth>
                        }
                    />
                    <Route
                        path="/inbox"
                        element={
                            <RequireAuth>
                                <Inbox />
                            </RequireAuth>
                        }
                    />
                    <Route
                        path="/notifications"
                        element={
                            <RequireAuth>
                                <Notification />
                            </RequireAuth>
                        }
                    />
                    <Route
                        path="/booking-requests"
                        element={
                            <RequireAuth>
                                <OwnerBookingRequests />
                            </RequireAuth>
                        }
                    />
                    {/* Admin group */}
                    <Route
                        element={
                            <RequireAuth>
                                <RequireRole allow={["admin"]}>
                                    <Outlet />
                                </RequireRole>
                            </RequireAuth>
                        }
                    >
                        <Route path="/adminhome" element={<AdminHome />} />
                        <Route
                            path="/pending-users"
                            element={<PendingUser />}
                        />
                        <Route
                            path="/pending-items"
                            element={<PendingItems />}
                        />
                        <Route
                            path="/renting-history"
                            element={<ViewRentingHistory />}
                        />
                    </Route>
                    {/** Pending Bookings route hidden per product change (handled by lessors) **/}
                </Routes>
            </Router>
        );
    }
}
