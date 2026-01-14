import { Layout } from '@/components/layout/Layout';
import { HeroSection } from '@/components/home/HeroSection';
import { FeaturesSection } from '@/components/home/FeaturesSection';
import { ExamsPreviewSection } from '@/components/home/ExamsPreviewSection';
import { CTASection } from '@/components/home/CTASection';

const Index = () => {
  return (
    <Layout>
      <HeroSection />
      <FeaturesSection />
      <ExamsPreviewSection />
      <CTASection />
    </Layout>
  );
};

export default Index;
