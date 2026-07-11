type Step = {
  number: number;
  title: (string | { code: string })[];
  description: (string | { code: string })[];
};

const STEPS: Step[] = [
  {
    number: 1,
    title: ["Install the Bot"],
    description: [
      "Add TF2-QuickServer to your Discord server with one click.",
    ],
  },
  {
    number: 2,
    title: ["Run ", { code: "/create-server <region>" }],
    description: ["Choose a region near you for the best latency."],
  },
  {
    number: 3,
    title: ["Select a Variant"],
    description: [
      "Pick a server config like ",
      { code: "standard-competitive" },
      " or your custom variant.",
    ],
  },
  {
    number: 4,
    title: ["Receive Connection Info"],
    description: [
      "Get SDR, direct, and STV addresses along with passwords instantly.",
    ],
  },
  {
    number: 5,
    title: ["Connect & Play"],
    description: [
      "Join the server and play. The server auto-terminates after 10 minutes of idle.",
    ],
  },
];

function renderNodes(nodes: Step["title"]) {
  return nodes.map((node, i) =>
    typeof node === "string" ? (
      <span key={i}>{node}</span>
    ) : (
      <code key={i} className="inline-code">
        {node.code}
      </code>
    )
  );
}

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="section-anchor py-24">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-center mb-3">
          How It Works
        </h2>
        <p className="text-lg text-text-muted text-center max-w-lg mx-auto">
          From command to server in five simple steps
        </p>
        <div className="mt-8 max-w-3xl mx-auto">
          <div className="flex flex-col gap-0">
            {STEPS.map((step) => (
              <div
                key={step.number}
                className="flex items-start gap-5 py-5 px-6 border-l-2 border-accent/20 rounded-r-xl transition-colors duration-200 hover:bg-accent/3 relative"
              >
                <div className="w-10 h-10 min-w-10 flex items-center justify-center rounded-full bg-linear-to-br from-accent to-[#e67e22] text-black font-bold text-base z-10">
                  {step.number}
                </div>
                <div className="flex-1">
                  <h5 className="font-semibold mb-1">
                    {renderNodes(step.title)}
                  </h5>
                  <p className="text-text-muted m-0">
                    {renderNodes(step.description)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
