export default function VideoOverview() {
  return (
    <section id="video" className="py-24 bg-section-bg">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-center mb-3">
          Watch the Overview
        </h2>
        <p className="text-lg text-text-muted text-center max-w-lg mx-auto">
          Learn how TF2-QuickServer works in this walkthrough by{" "}
          <a
            href="https://www.youtube.com/@FrisbeeTF2"
            target="_blank"
            rel="noopener"
            className="text-accent no-underline font-semibold hover:text-[#e67e22]"
          >
            FRISBEE
          </a>
        </p>
        <div className="mt-8 flex justify-center">
          <div className="w-full max-w-3xl">
            <div className="video-wrapper rounded-2xl shadow-[0_0_40px_rgba(243,156,18,0.08)]">
              <iframe
                src="https://www.youtube.com/embed/maqbCCp1tKo"
                title="TF2-QuickServer - A New Competitive Server Hosting System - How to Install & Use"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
