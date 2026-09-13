import { siteConfig } from "@/config/site";
import { Metadata } from "next";
import { NextPage } from "next";
import AboutContent from "@/components/sections/About/AboutContent";

export const metadata: Metadata = {
  title: `About | ${siteConfig.name}`,
  description: `Learn more about StreamAggregator, the ultimate media discovery and high-speed streaming platform.`,
};

const AboutPage: NextPage = () => {
  return <AboutContent />;
};

export default AboutPage;
