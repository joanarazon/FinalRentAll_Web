import React, { Component, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Outlet,
  Navigate,
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
import ReportedUsers from "./pages/admin/pages/ReportedUsers";
import ReportedItems from "./pages/admin/pages/ReportedItems";
// PendingBookings view intentionally hidden from admin routing
// import PendingBookings from "./pages/admin/pages/PendingBookings";
import OwnerBookingRequests from "./pages/OwnerBookingRequests";
import RequireAuth from "./components/RequireAuth.jsx";
import RequireRole from "./components/RequireRole.jsx";
import NotAuthorized from "./pages/NotAuthorized.jsx";
import MyBookings from "./pages/MyBookings";
import MyRatings from "./pages/MyRatings";
import Profile from "./pages/Profile";
import Favorites from "./pages/Favorites.jsx";
import { useUserContext } from "./context/UserContext.jsx";
import { NotificationProvider } from "./context/NotificationContext.jsx";
import { FavoritesProvider } from "./context/FavoritesContext.jsx";
import Loading from "./components/Loading.jsx";
import PendingVerification from "./pages/PendingVerification.jsx";
import Chat from "./components/Chat.jsx";
import TotalUser from "./pages/admin/pages/TotalUsers.jsx";
import TotalItems from "./pages/admin/pages/TotalItems.jsx";
import ReReviewQueue from "./pages/admin/pages/ReReviewQueue.jsx";
import ForgotPassword from "./pages/admin/pages/ForgotPassword.jsx";

import Banned from "./pages/Banned";

import { generateToken } from "./notification/firebase.js";

function RoleAwareLanding() {
  const { user, loading } = useUserContext();
  if (loading) return <Loading />;
  const role = user?.role;
  if (!user) return <Login />;
  // Banned user check
  if (
    user.role === "banned" ||
    user.account_status === "banned" ||
    user.is_banned
  ) {
    return <Navigate to="/banned" replace />;
  }
  if (typeof role === "undefined") return <Loading />;
  if (role === "admin") return <Navigate to="/adminhome" replace />;
  if (role === "user") return <Navigate to="/home" replace />;
  if (role === "unverified")
    return <Navigate to="/pending-verification" replace />;
  // Any other unknown/rejected roles
  return <Navigate to="/not-authorized" replace />;
}

export default function App() {
  // Avoid prompting for Notifications automatically on load.
  // If needed, call requestNotificationsAndToken() from a user action.

  return (
    <NotificationProvider>
      <FavoritesProvider>
        <Router>
          <Routes>
            <Route path="/" element={<RoleAwareLanding />} />
            <Route path="/register" element={<Register />} />
            <Route path="/not-authorized" element={<NotAuthorized />} />
            <Route
              path="/pending-verification"
              element={<PendingVerification />}
            />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            {/* User group */}
            <Route
              element={
                <RequireAuth>
                  <RequireRole allow={["user"]}>
                    <Outlet />
                  </RequireRole>
                </RequireAuth>
              }
            >
              <Route path="/home" element={<Home />} />
              <Route path="/inbox" element={<Inbox />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/notifications" element={<Notification />} />
              <Route
                path="/booking-requests"
                element={<OwnerBookingRequests />}
              />
              <Route path="/my-bookings" element={<MyBookings />} />
              <Route path="/my-ratings" element={<MyRatings />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/:id" element={<Profile />} />
              <Route path="/favorites" element={<Favorites />} />
            </Route>
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
              <Route path="/pending-users" element={<PendingUser />} />
              <Route path="/pending-items" element={<PendingItems />} />
              <Route path="/renting-history" element={<ViewRentingHistory />} />
              <Route path="/reported-users" element={<ReportedUsers />} />
              <Route path="/reported-items" element={<ReportedItems />} />
              <Route path="/total-users" element={<TotalUser />} />
              <Route path="/total-items" element={<TotalItems />} />
              <Route path="/rereview-requests" element={<ReReviewQueue />} />
            </Route>
            <Route path="/banned" element={<Banned />} />
            {/** Pending Bookings route hidden per product change (handled by lessors) **/}
          </Routes>
        </Router>
      </FavoritesProvider>
    </NotificationProvider>
  );
}
