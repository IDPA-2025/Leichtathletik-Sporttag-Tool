import Link from "next/link";

export default function Home() {
  return (
    <div className="wrapper-container">
      <div className="transparent-container">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Willkommen zum Leichtathletik-Sporttag!
        </h1>
        <p className="text-lg text-gray-700 mb-6">
          Ein Projekt im Rahmen der IDPA – entwickelt zur einfachen Verwaltung von Ergebnissen und Teilnehmern.  
          Logge dich ein, um Schülerdaten zu verwalten und Leistungen zu erfassen.
        </p>
        <Link href="/login">
          <button className="bg-blue-600 text-white px-6 py-3 rounded-lg shadow-md hover:bg-blue-700 transition-all">
            Zum Login
          </button>
        </Link>
      </div>
    </div>
  );
}