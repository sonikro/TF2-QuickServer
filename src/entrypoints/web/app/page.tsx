import { Box, Container, Divider } from '@mui/material';
import CallToActionSection from '../components/landing/CallToActionSection';
import FeaturesSection from '../components/landing/FeaturesSection';
import HeroSection from '../components/landing/HeroSection';
import HowItWorksSection from '../components/landing/HowItWorksSection';
import RegionsSection from '../components/landing/RegionsSection';
import TechStackSection from '../components/landing/TechStackSection';

export default function HomePage() {
  return (
    <Box>
      <Container maxWidth="lg">
        <HeroSection />

        <Divider sx={{ my: 6 }} />

        <FeaturesSection />

        <Divider sx={{ my: 6 }} />

        <HowItWorksSection />

        <Divider sx={{ my: 6 }} />

        <RegionsSection />

        <Divider sx={{ my: 6 }} />

        <TechStackSection />

        <Divider sx={{ my: 6 }} />

        <CallToActionSection />
      </Container>
    </Box>
  );
}
