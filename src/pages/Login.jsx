import rentLogo from "../assets/rent.png";

function Login() {

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
          <form className="w-3/4 mt-4">
            <div className="mb-4">
              <input
                className="shadow appearance-none border rounded-lg w-full py-3 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline
                placeholder-gray-400 mb-1"
                id="email"
                type="email"
                placeholder="Enter address"
              />
            </div>
            <div className="mb-6">
              <input
                className="shadow appearance-none border rounded-lg w-full py-3 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline
                placeholder-gray-400"
                id="password"
                type="password"
                placeholder="Password"
              />
            </ div>
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
                className="bg-[#1e1e1e] hover:bg-[#F09B35] cursor-pointer text-white font-bold py-2 px-4 border rounded-lg w-full focus:outline-none focus:shadow-outline"
                type="button"
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