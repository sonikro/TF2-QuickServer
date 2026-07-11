import Navbar from "@/components/navbar";
import Hero from "@/components/hero";
import Features from "@/components/features";
import Stats from "@/components/stats";
import VideoOverview from "@/components/video-overview";
import HowItWorks from "@/components/how-it-works";
import InstallBot from "@/components/install-bot";
import Regions from "@/components/regions";
import Commands from "@/components/commands";
import Footer from "@/components/footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Stats />
        <VideoOverview />
        <HowItWorks />
        <InstallBot />
        <Regions />
        <Commands />
      </main>
      <Footer />
    </>
  );
}
