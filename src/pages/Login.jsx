import rentLogo from "../assets/rent.png";
import { useState } from "react";
import { Lock, Mail, Phone, Loader2 } from "lucide-react";
import { supabase } from "../../supabaseClient";
import { useLocation, useNavigate } from "react-router-dom";
import { useToastApi } from "../components/ui/toast";

function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loginMethod, setLoginMethod] = useState("password"); // password | email_otp | sms_otp
    const [emailOtpSent, setEmailOtpSent] = useState(false);
    const [emailOtpCode, setEmailOtpCode] = useState("");
    const [smsPhone, setSmsPhone] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname;

    const isAdminPath = (p = "") => {
        if (!p) return false;
        if (p.startsWith("/admin")) return true;
        const adminSet = new Set([
            "/adminhome",
            "/pending-users",
            "/pending-items",
            "/renting-history",
        ]);
        return adminSet.has(p);
    };

    const navigateAfterLogin = (role) => {
        // If a previous route exists, prefer returning there, but keep role safety
        if (from) {
            const isAdminRoute = isAdminPath(from);
            if (role === "admin") {
                // Admins can return to admin routes; otherwise send to admin home
                return navigate(isAdminRoute ? from : "/adminhome", {
                    replace: true,
                });
            }
            if (role === "user") {
                // Users attempting to access admin should go to Home instead
                if (isAdminRoute) return navigate("/home", { replace: true });
                return navigate(from, { replace: true });
            }
            // Unknown role is unauthorized
            return navigate("/not-authorized", { replace: true });
        }
        // Fallback by role
        if (role === "admin") return navigate("/adminhome", { replace: true });
        if (role === "user") return navigate("/home", { replace: true });
        return navigate("/not-authorized", { replace: true });
    };
    const toast = useToastApi();

    const handlePasswordLogin = async () => {
        if (!email || !password) {
            toast.error("Please enter both email and password");
            return;
        }

        try {
            setLoading(true);
            // Authenticate against Supabase Auth
            const { data: signInData, error: signInError } =
                await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
            if (signInError) {
                throw signInError;
            }

            const authUser = signInData.user;
            if (!authUser) {
                throw new Error("No authenticated user returned");
            }

            // Fetch profile from public.users using auth user id (FK)
            const { data: profile, error: profileError } = await supabase
                .from("users")
                .select("*")
                .eq("id", authUser.id)
                .maybeSingle();
            if (profileError) throw profileError;

            // Check role before proceeding
            if (!profile?.role) {
                throw new Error("No role assigned to this account");
            }

            if (profile.role === "unverified") {
                toast.info("Your account is pending admin verification.");
                return; // stop here, don't navigate
            }

            // Store combined auth + profile in localStorage (omit sensitive fields; none here)
            const session = signInData.session;
            const userInfo = {
                id: authUser.id,
                email: authUser.email,
                ...profile,
            };
            localStorage.setItem("loggedInUser", JSON.stringify(userInfo));

            const greetingName =
                profile?.first_name || authUser.email || "there";
            toast.success(`Welcome back, ${greetingName}!`);
            navigateAfterLogin(profile.role);
        } catch (err) {
            console.error("Login error:", err.message);
            toast.error("Login failed: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const sendEmailOtp = async () => {
        if (!email) {
            toast.error("Please enter your email");
            return;
        }
        try {
            setLoading(true);
            const { error } = await supabase.auth.signInWithOtp({
                email,
                options: { shouldCreateUser: false },
            });
            if (error) throw error;
            setEmailOtpSent(true);
            toast.success(`OTP sent to ${email}`);
        } catch (err) {
            console.error("OTP send error:", err.message);
            toast.error("Failed to send OTP: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const verifyEmailOtp = async () => {
        if (!email || !emailOtpCode) {
            toast.error("Enter your email and OTP code");
            return;
        }
        try {
            setLoading(true);
            const { data, error } = await supabase.auth.verifyOtp({
                email,
                token: emailOtpCode,
                type: "email",
            });
            if (error) throw error;

            const authUser = data?.user;
            let userId;
            let userEmail;
            if (authUser) {
                userId = authUser.id;
                userEmail = authUser.email;
            } else {
                const { data: userData, error: userErr } =
                    await supabase.auth.getUser();
                if (userErr || !userData?.user)
                    throw new Error(userErr?.message || "No user in session");
                userId = userData.user.id;
                userEmail = userData.user.email;
            }

            const { data: profile, error: profileError } = await supabase
                .from("users")
                .select("*")
                .eq("id", userId)
                .maybeSingle();
            if (profileError) throw profileError;

            // Check role before proceeding
            if (!profile?.role) {
                throw new Error("No role assigned to this account");
            }

            if (profile.role === "unverified") {
                toast.info("Your account is pending admin verification.");
                return; // stop here, don't navigate
            }

            const userInfo = {
                id: userId,
                email: userEmail,
                ...profile,
            };
            localStorage.setItem("loggedInUser", JSON.stringify(userInfo));

            toast.success("Signed in successfully with email OTP");
            navigateAfterLogin(profile.role);
        } catch (err) {
            console.error("OTP verify error:", err.message);
            toast.error("Failed to verify OTP: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
                <div className="w-[600px] max-w-full h-auto bg-white shadow-lg rounded-2xl flex flex-col items-center p-6">
                    <img
                        src={rentLogo}
                        alt="Logo"
                        className="w-20 h-20 object-contain"
                    />
                    <p className="text-gray-600 mt-5">
                        Please enter your details
                    </p>
                    <h2 className="text-xl font-bold mt-4">Welcome Back!</h2>

                    <form
                        className="w-3/4 mt-6"
                        onSubmit={(e) => e.preventDefault()}
                    >
                        {/* Login method selector - segmented control */}
                        <div className="mb-2 text-sm text-gray-600 text-center">
                            Sign in using:
                        </div>
                        <div className="flex bg-gray-100 rounded-lg p-1 mb-6">
                            <button
                                type="button"
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition ${
                                    loginMethod === "password"
                                        ? "bg-[#1e1e1e] text-white shadow"
                                        : "text-gray-700 hover:bg-gray-200"
                                }`}
                                onClick={() => setLoginMethod("password")}
                            >
                                <Lock size={16} />
                                Password
                            </button>
                            <button
                                type="button"
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition ${
                                    loginMethod === "email_otp"
                                        ? "bg-[#1e1e1e] text-white shadow"
                                        : "text-gray-700 hover:bg-gray-200"
                                }`}
                                onClick={() => setLoginMethod("email_otp")}
                            >
                                <Mail size={16} />
                                Email OTP
                            </button>
                            <button
                                type="button"
                                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition ${
                                    loginMethod === "sms_otp"
                                        ? "bg-[#1e1e1e] text-white shadow"
                                        : "text-gray-700 hover:bg-gray-200"
                                }`}
                                onClick={() => setLoginMethod("sms_otp")}
                            >
                                <Phone size={16} />
                                Phone OTP
                            </button>
                        </div>

                        {/* Email (shared for password and email OTP) */}
                        {(loginMethod === "password" ||
                            loginMethod === "email_otp") && (
                            <div className="mb-4">
                                <input
                                    className="shadow appearance-none border rounded-lg w-full py-3 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline placeholder-gray-400 mb-1"
                                    id="email"
                                    type="email"
                                    placeholder="Enter email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                        )}

                        {/* Password login */}
                        {loginMethod === "password" && (
                            <>
                                <div className="mb-6">
                                    <input
                                        className="shadow appearance-none border rounded-lg w-full py-3 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline placeholder-gray-400"
                                        id="password"
                                        type="password"
                                        placeholder="Password"
                                        value={password}
                                        onChange={(e) =>
                                            setPassword(e.target.value)
                                        }
                                    />
                                </div>
                                <div>
                                    <a
                                        className="inline-block align-baseline font-bold text-sm text-[#F09B35] hover:text-[#DB7C0B]"
                                        href="#"
                                    >
                                        Forgot Password?
                                    </a>
                                </div>
                                <div className="items-center justify-between mt-5">
                                    <button
                                        className="bg-[#1e1e1e] hover:bg-[#F09B35] cursor-pointer text-white font-bold py-2 px-4 border rounded-lg w-full focus:outline-none focus:shadow-outline disabled:opacity-50 flex items-center justify-center gap-2"
                                        type="button"
                                        onClick={handlePasswordLogin}
                                        disabled={loading}
                                    >
                                        {loading && (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        )}
                                        {loading ? "Signing In" : "Sign In"}
                                    </button>
                                </div>
                            </>
                        )}

                        {/* Email OTP login */}
                        {loginMethod === "email_otp" && (
                            <>
                                {!emailOtpSent ? (
                                    <div className="items-center justify-between mt-2">
                                        <button
                                            className="bg-[#1e1e1e] hover:bg-[#F09B35] cursor-pointer text-white font-bold py-2 px-4 border rounded-lg w-full focus:outline-none focus:shadow-outline disabled:opacity-50 flex items-center justify-center gap-2"
                                            type="button"
                                            onClick={sendEmailOtp}
                                            disabled={loading}
                                        >
                                            {loading && (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            )}
                                            {loading
                                                ? "Sending OTP"
                                                : "Send OTP"}
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="mb-4">
                                            <input
                                                className="shadow appearance-none border rounded-lg w-full py-3 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline placeholder-gray-400 mb-1 tracking-widest"
                                                id="email-otp"
                                                type="text"
                                                inputMode="numeric"
                                                maxLength={6}
                                                placeholder="Enter 6-digit OTP"
                                                value={emailOtpCode}
                                                onChange={(e) =>
                                                    setEmailOtpCode(
                                                        e.target.value
                                                    )
                                                }
                                            />
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                className="flex-1 bg-[#1e1e1e] hover:bg-[#F09B35] cursor-pointer text-white font-bold py-2 px-4 border rounded-lg focus:outline-none focus:shadow-outline disabled:opacity-50 flex items-center justify-center gap-2"
                                                type="button"
                                                onClick={verifyEmailOtp}
                                                disabled={loading}
                                            >
                                                {loading && (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                )}
                                                {loading
                                                    ? "Verifying"
                                                    : "Verify OTP"}
                                            </button>
                                            <button
                                                className="flex-1 border rounded-lg py-2 px-4 hover:bg-gray-50 disabled:opacity-50"
                                                type="button"
                                                onClick={sendEmailOtp}
                                                disabled={loading}
                                            >
                                                Resend OTP
                                            </button>
                                        </div>
                                        <p className="text-sm text-gray-500 mt-3 text-center">
                                            Wrong email?{" "}
                                            <button
                                                onClick={() => {
                                                    setEmail("");
                                                    setEmailOtpCode("");
                                                    setEmailOtpSent(false);
                                                }}
                                                className="text-blue-600 underline hover:text-blue-800"
                                            >
                                                Change Email
                                            </button>
                                        </p>
                                    </>
                                )}
                            </>
                        )}

                        {/* SMS OTP (stub only) */}
                        {loginMethod === "sms_otp" && (
                            <>
                                <div className="mb-4">
                                    <input
                                        className="shadow appearance-none border rounded-lg w-full py-3 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline placeholder-gray-400 mb-1"
                                        id="phone"
                                        type="tel"
                                        placeholder="Enter phone (e.g., +15551234567)"
                                        value={smsPhone}
                                        onChange={(e) =>
                                            setSmsPhone(e.target.value)
                                        }
                                    />
                                </div>
                                <div className="items-center justify-between mt-2">
                                    <button
                                        className="bg-gray-300 text-gray-600 font-bold py-2 px-4 border rounded-lg w-full cursor-not-allowed"
                                        type="button"
                                        disabled
                                        title="SMS OTP coming soon"
                                    >
                                        Send SMS OTP (Coming soon)
                                    </button>
                                </div>
                            </>
                        )}

                        <div className="text-center mt-6 flex flex-row items-center gap-2 justify-center">
                            <p className="text-gray-600 mb-0">
                                Don't have an account?
                            </p>
                            <a
                                className="font-bold text-sm text-[#F09B35] hover:text-[#DB7C0B]"
                                href="/register"
                            >
                                Sign Up
                            </a>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}

export default Login;
