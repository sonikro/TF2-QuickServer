const COMMANDS = [
  {
    command: "/create-server <region>",
    description:
      "Launches a server in the selected region (prompts for variant)",
  },
  {
    command: "/get-my-servers",
    description:
      "Retrieves all your active server details (IPs, passwords, etc.)",
  },
  {
    command: "/get-guild-servers",
    description:
      "Lists all active servers for the Discord guild (IPs, passwords, etc.)",
    badge: "Admin",
  },
  {
    command: "/status",
    description: "Shows current status of all servers across all regions",
  },
  {
    command: "/terminate-servers",
    description: "Terminates all servers created by the user",
  },
  {
    command: "/set-user-data <steamId>",
    description: "Sets SteamID for Sourcemod admin permissions",
  },
];

export default function Commands() {
  return (
    <section id="commands" className="section-anchor py-24">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-center mb-3">
          Discord Commands
        </h2>
        <p className="text-lg text-text-muted text-center max-w-lg mx-auto">
          Control everything from your chat
        </p>
        <div className="mt-8 flex justify-center">
          <div className="w-full max-w-4xl overflow-x-auto">
            <table className="w-full border-collapse rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-accent/10">
                  <th className="text-left p-4 font-semibold text-accent border-b-2 border-accent/20">
                    Command
                  </th>
                  <th className="text-left p-4 font-semibold text-accent border-b-2 border-accent/20">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMMANDS.map((cmd) => (
                  <tr
                    key={cmd.command}
                    className="border-b border-white/5 even:bg-white/2"
                  >
                    <td className="p-4 align-top">
                      <code className="inline-code whitespace-nowrap">
                        {cmd.command}
                      </code>
                    </td>
                    <td className="p-4 align-top text-[#e6edf3]">
                      {cmd.badge && (
                        <span className="inline-block bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded me-1.5 align-middle">
                          {cmd.badge}
                        </span>
                      )}
                      {cmd.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
