import {
  FaBolt,
  FaGlobeAmericas,
  FaShieldAlt,
  FaProjectDiagram,
  FaCloud,
  FaCoins,
} from "react-icons/fa";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  "fa-bolt": FaBolt,
  "fa-globe-americas": FaGlobeAmericas,
  "fa-shield-halved": FaShieldAlt,
  "fa-diagram-project": FaProjectDiagram,
  "fa-cloud": FaCloud,
  "fa-coins": FaCoins,
};

const FEATURES = [
  {
    icon: "fa-bolt",
    title: "QuickServer Deployment",
    description:
      "Create a new TF2 Server from scratch in 4 minutes. From 0 to a fully running server with one Discord command.",
  },
  {
    icon: "fa-globe-americas",
    title: "Multi-Regional",
    description:
      "Play in one of 8 supported regions to get the best latency, no matter where you are.",
  },
  {
    icon: "fa-shield-halved",
    title: "DDoS Protection",
    description:
      "Custom developed DDoS Protection with in-game notifications. Get notified in-game when a server is DDoSed and the Shield is enabled.",
  },
  {
    icon: "fa-diagram-project",
    title: "Distributed Infrastructure",
    description:
      "DDoS on one server does not impact other servers. Each server is fully independent.",
  },
  {
    icon: "fa-cloud",
    title: "Cloud-Agnostic",
    description:
      "We use Oracle Cloud and AWS today, but the system is cloud-agnostic — we can add support for more cloud providers as things change.",
  },
  {
    icon: "fa-coins",
    title: "Cost Efficiency",
    description:
      "Servers are terminated after being empty for too long — $0 cost if no servers are running. This system was designed with cost efficiency in mind.",
  },
];

export default function Features() {
  return (
    <section id="features" className="section-anchor py-24 ">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-center mb-3">
          Features
        </h2>
        <p className="text-lg text-text-muted text-center max-w-lg mx-auto">
          Everything you need to run TF2 servers
        </p>
        <div className="grid md:grid-cols-2 gap-6 mt-8">
          {FEATURES.map((feature) => {
            const IconComponent = ICON_MAP[feature.icon];
            return (
              <div
                key={feature.title}
                className="bg-card-bg border border-white/10 rounded-2xl p-8 text-center transition-all duration-250 hover:-translate-y-1 hover:border-accent/30"
              >
                <div className="w-14 h-14 flex items-center justify-center mx-auto mb-4 bg-accent/10 rounded-xl text-2xl text-accent">
                  {IconComponent && <IconComponent />}
                </div>
                <h5 className="text-lg font-semibold mb-2">{feature.title}</h5>
                <p className="text-text-muted text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
