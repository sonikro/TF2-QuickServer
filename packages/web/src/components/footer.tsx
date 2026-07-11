import Image from "next/image";
import {
  FaDiscord,
  FaBook,
  FaHeartbeat,
  FaBug,
  FaGithub,
  FaCode,
} from "react-icons/fa";

export default function Footer() {
  return (
    <footer className="bg-[#0a0e14] border-t border-white/5 py-12 pb-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <h5 className="text-base font-semibold mb-4 flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="TF2-QuickServer"
                width={28}
                height={28}
              />
              TF2-QuickServer
            </h5>
            <p className="text-sm text-text-muted mt-2">
              Deploy Team Fortress 2 servers from Discord. Multi-cloud, global,
              and ready in minutes.
            </p>
          </div>
          <div>
            <h5 className="text-base font-semibold mb-4">Get Started</h5>
            <ul className="list-none p-0 m-0 space-y-2">
              <li>
                <a
                  href="https://discord.com/oauth2/authorize?client_id=1355639481020977243"
                  className="text-text-muted no-underline text-sm hover:text-accent transition-colors"
                  target="_blank"
                  rel="noopener"
                >
                  <FaDiscord className="me-2 inline" />
                  Install Bot
                </a>
              </li>
              <li>
                <a
                  href="https://discord.gg/HfDgMj73cW"
                  className="text-text-muted no-underline text-sm hover:text-accent transition-colors"
                  target="_blank"
                  rel="noopener"
                >
                  <FaDiscord className="me-2 inline" />
                  Join Discord
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/sonikro/TF2-QuickServer/wiki"
                  className="text-text-muted no-underline text-sm hover:text-accent transition-colors"
                  target="_blank"
                  rel="noopener"
                >
                  <FaBook className="me-2 inline" />
                  Wiki
                </a>
              </li>
              <li>
                <a
                  href="https://status.sonikro.com/"
                  className="text-text-muted no-underline text-sm hover:text-accent transition-colors"
                  target="_blank"
                  rel="noopener"
                >
                  <FaHeartbeat className="me-2 inline" />
                  Status
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h5 className="text-base font-semibold mb-4">Resources</h5>
            <ul className="list-none p-0 m-0 space-y-2">
              <li>
                <a
                  href="https://github.com/sonikro/TF2-QuickServer/issues"
                  className="text-text-muted no-underline text-sm hover:text-accent transition-colors"
                  target="_blank"
                  rel="noopener"
                >
                  <FaBug className="me-2 inline" />
                  Report a Bug
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/sonikro/TF2-QuickServer"
                  className="text-text-muted no-underline text-sm hover:text-accent transition-colors"
                  target="_blank"
                  rel="noopener"
                >
                  <FaGithub className="me-2 inline" />
                  GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/sonikro/TF2-QuickServer/blob/main/docs/api/openapi.yaml"
                  className="text-text-muted no-underline text-sm hover:text-accent transition-colors"
                  target="_blank"
                  rel="noopener"
                >
                  <FaCode className="me-2 inline" />
                  API Spec
                </a>
              </li>
            </ul>
          </div>
        </div>
        <hr className="mt-8 mb-6 border-white/10" />
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
          <p className="text-sm text-text-muted m-0">
            &copy; 2025-2026 TF2-QuickServer. MIT License.
          </p>
          <p className="text-sm text-text-muted m-0">
            Logo by{" "}
            <a
              href="https://www.instagram.com/thecleandesign/"
              target="_blank"
              rel="noopener"
              className="text-text-muted hover:text-accent transition-colors"
            >
              kcaugolden
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
