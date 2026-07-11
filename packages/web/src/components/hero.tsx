import Image from "next/image";
import { FaDiscord, FaBook } from "react-icons/fa";

export default function Hero() {
  return (
    <section className="hero-gradient relative flex items-center min-h-screen overflow-hidden pt-18">
      <div className="hero-glow absolute top-[-50%] left-[-50%] w-[200%] h-[200%] pointer-events-none" />
      <div className="max-w-6xl mx-auto px-4 text-center relative z-10">
        <Image
          src="/logo.png"
          alt="TF2-QuickServer Logo"
          width={140}
          height={140}
          className="mx-auto mb-6"
          style={{ filter: "drop-shadow(0 0 30px rgba(243, 156, 18, 0.2))" }}
          priority
        />
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-none mb-3 text-gradient">
          TF2-QuickServer
        </h1>
        <p className="text-lg sm:text-xl text-text-muted max-w-xl mx-auto leading-relaxed">
          Deploy Team Fortress 2 servers directly from Discord.
          <br />
          Powered by Docker &mdash; multi-cloud, global, and ready in minutes.
        </p>
        <div className="flex flex-wrap justify-center gap-3 mt-8">
          <a
            href="https://discord.com/oauth2/authorize?client_id=1355639481020977243"
            className="inline-flex items-center gap-2 px-7 py-3 rounded-xl font-semibold text-white no-underline bg-[#2ea043] hover:bg-[#238636] transition-colors"
            target="_blank"
            rel="noopener"
          >
            <FaDiscord />
            Install the Bot
          </a>
          <a
            href="https://discord.gg/HfDgMj73cW"
            className="inline-flex items-center gap-2 px-7 py-3 rounded-xl font-semibold text-white no-underline bg-[#5865f2] hover:bg-[#4752c4] transition-colors"
            target="_blank"
            rel="noopener"
          >
            <FaDiscord />
            Join Discord
          </a>
          <a
            href="https://github.com/sonikro/TF2-QuickServer/wiki"
            className="inline-flex items-center gap-2 px-7 py-3 rounded-xl font-semibold text-white no-underline border border-white/30 hover:bg-white/10 transition-colors"
            target="_blank"
            rel="noopener"
          >
            <FaBook />
            Wiki
          </a>
        </div>
      </div>
    </section>
  );
}
