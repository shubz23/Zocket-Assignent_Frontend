import Image from "next/image";
import { Tranquiluxe } from "uvcanvas";
import Link from "next/link";

export default function Home() {
  return (
    <div className="relative h-screen w-screen overflow-hidden mt-[-4rem]">
      {/* Background */}
      <div className="absolute inset-0">
        <Tranquiluxe />
      </div>

      {/* Diagonal white section */}
      <div
        className="absolute inset-0 bg-white left-72"
        style={{
          clipPath: 'polygon(120% -20%, -20% 100%, 120% 120%)',
          transform: 'rotate(-15deg) scale(1.5)',
        }}
      />

      {/* Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center gap-5 top-14">
        <h1 className="text-[120px] font-bold tracking-wider">
          <span className="text-transparent" style={{
            WebkitTextStroke: '2px #fff',
          }}>
            Wel
          </span>
          <span className="text-black">come</span>
        </h1>


        <div className="flex gap-4 text-center">
          <span className="text-2xl">To the only task management platform you'll ever need</span>
        </div>
        <Link
          href="/sign-in"
          className="px-8 py-3 text-lg font-semibold rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:opacity-90 transition-opacity shadow-lg hover:shadow-xl"
        >
          Sign In
        </Link>
      </div>
    </div>
  );
}
