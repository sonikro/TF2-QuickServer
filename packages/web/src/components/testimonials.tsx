"use client";

import Image from "next/image";
import { useCallback, useRef } from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

const TESTIMONIALS = [
  {
    player: "eduardofer",
    title: "Head-Admin of Brasil Fortress",
    testimonial:
      "TF2-QuickServer has been an excellent partner for the competitive Team Fortress 2 community. The servers offer great stability, low ping, and consistent performance, becoming essential for competitive matches and championships. Throughout the Brasil Fortress seasons, TF2-QuickServer's infrastructure has always demonstrated reliability, allowing players from different South American countries to compete in balanced, high-quality matches. For anyone looking for quality servers, TF2-QuickServer is a confidently recommended choice.",
    avatar: "/avatars/eduardofer.jpg",
  },
  {
    player: "AC130",
    title: "Head-Admin of FBTF",
    testimonial:
      "After the fall of Server Me SA, the South American community suffered a lot with the absence of stable and high quality servers. TF2-QuickServer solved that issue and went beyond; TF2-QuickServer brought easy to use servers not only for us in South America, but for the majority of other regions who required reliable and free servers. We in South America use TF2-QuickServer as our main form of hosting matches in the principal Brazilian Leagues. Today, we have access to servers to all the regions, thanks to Sonikro and his commitment with the TF2 community to always provide servers that are 100% updated, have all configs, maps and reliability that we require in competitive and other popular game modes.",
    avatar: "/avatars/ac130.jpg",
  },
  {
    player: "erasqer",
    title: "QEL Owner",
    testimonial:
      "I would say QuickServer has been a massive help to QEL and running cups as a whole. It is very easy to use with amazing performance under heavy loads and peak times during a cup when the most amount of players are on, and it is overall very easy to use and setup for even someone playing their first log of TF2. QuickServer also has very good support and help in setting up configs, maps, etc, and any other things that someone would want to add if they are running a cup or scrim. Overall QuickServer is very easy to use and setup for anybody wanting to use it to play TF2 scrims or run an event, it has support for all 3 regions and is a very reliable service.",
    avatar: "/avatars/erasqer.jpg",
  },
  {
    player: "H20Gamez",
    title: "Admin for TFArena, UGC, CLTF2",
    testimonial:
      "Being from NA, TF2-QuickServers was unheard of at the time and only through my friend Dax did I eventually learn about such a great platform. During a time of large growth, especially with newer players, TF2-QuickServers was an asset due to its ease of use in any league server, as well as its importance on being free and fast for all who use it. I am so grateful to see the platform expand to so many more players, especially the NA ones!",
    avatar: "/avatars/h20gamez.jpg",
  },
  {
    player: "Crawdad",
    title: "Competitive TF2 Player",
    testimonial:
      "TF2-QuickServer made setting up a TF2 server incredibly easy. The Discord bot lets me create and manage servers without ever having to visit a website, making the whole process much faster and more convenient. Since it's completely free with no paywall or queue, I can boot up a server whenever I need one without waiting or worrying. It just posts the connect and everything you need to run the server smoothly on your Discord server. I personally like using QuickServer for playing MGE with friends or playing scrims. My experience with QuickServer has been reliable, simple to use, and something I would definitely recommend to anyone looking for a fast and easy way to host a TF2 server.",
    avatar: "/avatars/crawdad.jpg",
  },
  {
    player: "firedust",
    title: "Organizer of br.tf2pickup.org",
    testimonial:
      "QuickServer has really helped us on our community, especially with the br.pickup.org integration, pugs and officials. It has every usable config, really stable servers and smooth gameplay.",
    avatar: "/avatars/firedust.jpg",
  },
];

export default function Testimonials() {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = useCallback((direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({
      left: direction === "left" ? -amount : amount,
      behavior: "smooth",
    });
  }, []);

  return (
    <section id="testimonials" className="section-anchor py-24">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-center mb-3">
          What Players Say
        </h2>
        <p className="text-lg text-text-muted text-center max-w-lg mx-auto">
          Hear from the community that uses TF2-QuickServer
        </p>
        <div className="relative mt-8 group">
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar"
          >
            {TESTIMONIALS.map((item) => (
              <div
                key={item.player}
                className="snap-start shrink-0 w-[80vw] sm:w-[45vw] lg:w-[32vw] max-w-sm bg-card-bg border border-white/10 rounded-2xl p-6 transition-all duration-250 hover:-translate-y-1 hover:border-accent/30"
              >
                <div className="flex items-start gap-4">
                  <Image
                    src={item.avatar}
                    alt={`${item.player} avatar`}
                    width={48}
                    height={48}
                    className="rounded-full shrink-0 mt-0.5"
                  />
                  <div>
                    <p className="text-text-muted text-sm leading-relaxed italic">
                      &ldquo;{item.testimonial}&rdquo;
                    </p>
                    <div className="mt-3">
                      <span className="font-semibold text-accent">
                        {item.player}
                      </span>
                      <span className="text-text-muted text-sm">
                        {" "}
                        &mdash; {item.title}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => scroll("left")}
            aria-label="Previous testimonial"
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 w-10 h-10 flex items-center justify-center rounded-full bg-card-bg border border-white/10 text-text-muted hover:text-accent hover:border-accent/30 opacity-0 group-hover:opacity-100 transition-all duration-250 cursor-pointer"
          >
            <FaChevronLeft />
          </button>
          <button
            onClick={() => scroll("right")}
            aria-label="Next testimonial"
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 w-10 h-10 flex items-center justify-center rounded-full bg-card-bg border border-white/10 text-text-muted hover:text-accent hover:border-accent/30 opacity-0 group-hover:opacity-100 transition-all duration-250 cursor-pointer"
          >
            <FaChevronRight />
          </button>
        </div>
      </div>
    </section>
  );
}
