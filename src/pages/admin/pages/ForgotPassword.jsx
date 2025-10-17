import React, { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../../../supabaseClient";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleResetPassword = async (e) => {
    e.preventDefault();

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setMessage(`A password reset link has been sent to ${email}. Please check your inbox.`);
      setEmail("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen  bg-gray-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md  bg-white shadow-lg rounded-2xl flex flex-col items-center p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 font-dm-bold mb-3">
            Forgot Password
          </h1>
          <p className="text-gray-600 font-dm-regular text-base leading-relaxed">
            Enter your email below and we'll send you a link to reset your password.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleResetPassword} className="space-y-6">
          {/* Email Input */}
          <div className="flex flex-col items-start">
            <label className="block text-gray-900 font-dm-bold text-base mb-2">
              Email
            </label>

            <div className="relative w-[20rem] max-w-full">
              <input
                type="email"
                placeholder="juan@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="shadow appearance-none border rounded-lg w-full py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:shadow-outline placeholder-gray-400 text-left"
                required
              />
            </div>
          </div>

          {/* Success Message */}
          {message && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
              <p className="text-green-700 font-dm-regular text-sm text-center">
                {message}
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <p className="text-red-700 font-dm-regular text-sm text-center">
                {error}
              </p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full h-12 rounded-2xl bg-[#1e1e1e] text-white font-dm-bold text-base transition-all flex items-center justify-center ${loading ? "opacity-60 cursor-not-allowed" : "hover:bg-[#F09B35] cursor-pointer text-white font-bold rounded-lg w-full focus:outline-none focus:shadow-outline disabled:opacity-50 flex items-center justify-center gap-2"
              }`}
          >
            {loading ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Sending...</span>
              </div>
            ) : (
              "Send Reset Link"
            )}
          </button>

          {/* Back to Login Link */}
          <div className="text-center pt-4">
            <Link
              to="/"
              className="text-[#FFAB00] font-dm-medium text-base hover:text-amber-600 hover:underline transition-colors"
            >
              Back to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;