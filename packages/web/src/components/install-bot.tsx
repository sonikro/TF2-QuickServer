import { FaDiscord, FaUser } from "react-icons/fa";

export default function InstallBot() {
  return (
    <section id="install" className="section-anchor py-24">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-center mb-3">
          Install the Bot
        </h2>
        <p className="text-lg text-text-muted text-center max-w-lg mx-auto">
          Add TF2-QuickServer to your Discord in seconds
        </p>
        <div className="mt-8 flex justify-center">
          <div className="w-full max-w-3xl bg-card-bg border border-[#2ea043]/20 rounded-2xl p-8 sm:p-12 text-center">
            <div className="text-5xl text-[#2ea043] mb-6 flex justify-center">
              <FaDiscord />
            </div>
            <p className="text-lg text-text-muted max-w-lg mx-auto leading-relaxed">
              You can install TF2-QuickServer in any Discord server where you
              have the <strong>Manage Server</strong> permission, or install it
              for your own user account to use across all your servers.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mt-6">
              <a
                href="https://discord.com/oauth2/authorize?client_id=1355639481020977243"
                className="inline-flex items-center gap-2 px-7 py-3 rounded-xl font-semibold text-white no-underline bg-[#2ea043] hover:bg-[#238636] transition-colors"
                target="_blank"
                rel="noopener"
              >
                <FaDiscord />
                Add to Server
              </a>
              <a
                href="https://discord.com/oauth2/authorize?client_id=1355639481020977243"
                className="inline-flex items-center gap-2 px-7 py-3 rounded-xl font-semibold text-white no-underline border border-white/30 hover:bg-white/10 transition-colors"
                target="_blank"
                rel="noopener"
              >
                <FaUser />
                Install for Me
              </a>
            </div>
            <p className="text-sm text-text-muted mt-4 mb-0">
              No credit card required. No setup needed. Works immediately after
              install.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
