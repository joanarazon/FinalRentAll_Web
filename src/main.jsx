import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { ToastProvider } from "./components/ui/toast.jsx";
import { UserProvider } from "./context/UserContext.jsx";

createRoot(document.getElementById("root")).render(
    <StrictMode>
        <ToastProvider>
            <UserProvider>
                <App />
            </UserProvider>
        </ToastProvider>
    </StrictMode>
);
