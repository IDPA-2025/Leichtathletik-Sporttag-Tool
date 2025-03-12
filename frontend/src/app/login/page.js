export default function LoginPage() {
  return (
    <div className="flex items-center justify-center h-screen bg-blue-500">
      <div className="bg-blue-100 p-10 rounded-xl shadow-2xl w-96">
        <h1 className="text-4xl font-bold text-center text-gray-800">Leichtathletik Sporttag</h1>
        <p className="text-xl text-gray-600 text-center mt-4">Login</p>
        <form className="mt-8 space-y-6">
          <div>
            <label className="block text-lg font-semibold text-gray-700">Benutzername</label>
            <input 
              type="text" 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-blue-200 text-lg focus:ring-4 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-lg font-semibold text-gray-700">Passwort</label>
            <input 
              type="password" 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-blue-200 text-lg focus:ring-4 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <button 
            className="w-full bg-blue-600 text-white py-3 rounded-lg text-lg font-bold hover:bg-blue-700 transition">
            LOGIN
          </button>
        </form>
      </div>
    </div>
  );
}