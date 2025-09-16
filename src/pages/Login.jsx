import rentLogo from "../assets/rent.png";
import { useState } from "react";
import { supabase } from "../../supabaseClient";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    if (!email || !password) {
      alert("Please enter both email and password");
      return;
    }

    try {
      // Query Supabase users table
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .eq("password", password); // plain text check

      if (error) throw error;

      if (data.length > 0) {
        alert(`Welcome back, ${data[0].first_name}!`);
        console.log("Logged in user:", data[0]);
        // Here you can redirect the user or set context/session
      } else {
        alert("Invalid email or password");
      }
    } catch (err) {
      console.error("Login error:", err.message);
      alert("Something went wrong: " + err.message);
    }
  };

  return (
    <>
      <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="w-[600px] max-w-full h-[530px] bg-white shadow-lg rounded-2xl flex flex-col items-center p-6">
          <img
            src={rentLogo}
            alt="Logo"
            className="w-20 h-20 object-contain"
          />
          <p className="text-gray-600 bottom-10 mt-5">Please enter your details</p>
          <h2 className="text-xl font-bold bottom-10 mt-4">Welcome Back!</h2>
          <form className="w-3/4 mt-4" onSubmit={(e) => e.preventDefault()}>
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
            <div className="mb-6">
              <input
                className="shadow appearance-none border rounded-lg w-full py-3 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline placeholder-gray-400"
                id="password"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <a className="inline-block align-baseline font-bold text-sm text-[#F09B35] hover:text-[#DB7C0B]" href="#">
                Forgot Password?
              </a>
            </div>
            <div className="items-center justify-between mt-5">
              <button
                className="bg-[#1e1e1e] hover:bg-[#F09B35] cursor-pointer text-white font-bold py-2 px-4 border rounded-lg w-full focus:outline-none focus:shadow-outline"
                type="button"
                onClick={handleLogin}
              >
                Sign In
              </button>
            </div>
            <div className="text-center mt-4 flex flex-row items-center gap-2 justify-center">
              <p className="text-gray-600 mb-0">Don't have an account?</p>
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
  )
}

export default Login