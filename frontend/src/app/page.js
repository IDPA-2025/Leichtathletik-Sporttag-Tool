export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center w-full h-screen">
      <h1 className="text-8xl font-extrabold text-center text-gray-800">Leichtathletik Sporttag</h1>
      <p className="text-3xl text-gray-600 text-center mt-4">Willkommen</p>
      <div className="mt-12 flex flex-col items-center space-y-6">
        <a
          href="/login"
          className="bg-blue-600 text-white py-3 px-8 rounded-lg text-xl font-bold hover:bg-blue-700 transition"
        >
          Login
        </a>
      </div>
    </div>
  );
}