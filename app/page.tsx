import Link from 'next/link';

export default function Home() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center p-8 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url('/front%20bg.png')" }}
    >
      <div className="bg-black/40 backdrop-blur-md rounded-3xl p-10 shadow-2xl border border-white/10">
        <h1
          className="text-5xl md:text-7xl font-bangers mb-4 text-center text-white tracking-wide"
          style={{ textShadow: '0 4px 15px rgba(0,0,0,0.6), 0 0 30px rgba(147,51,234,0.5)' }}
        >
          Hvem er mest sannsynlig?
        </h1>
        <p className="text-gray-300 mb-10 text-lg text-center">Party game for voksne</p>

        <div className="flex flex-col gap-4 w-full max-w-xs mx-auto">
          <Link
            href="/tv"
            className="bg-purple-600 hover:bg-purple-700 text-white text-xl font-semibold py-4 px-8 rounded-xl text-center transition-colors shadow-lg"
          >
            TV-skjerm
          </Link>
          <Link
            href="/play"
            className="bg-blue-600 hover:bg-blue-700 text-white text-xl font-semibold py-4 px-8 rounded-xl text-center transition-colors shadow-lg"
          >
            Bli med som spiller
          </Link>
        </div>
      </div>
    </main>
  );
}
