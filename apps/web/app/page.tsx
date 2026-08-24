import { cookies } from "next/headers";

import { Dashboard } from "@/app/_components/home";
import {
  CoreExperienceBand,
  CtaBand,
  DifficultyBand,
  Footer,
  Hero,
  IdentityBand,
  Nav,
  ReviewBand,
} from "@/app/_components/landing";
import { Header } from "@/app/_components/layout/Header";

const Home = async () => {
  const isLoggedIn = (await cookies()).has("accessToken");

  if (isLoggedIn) {
    return (
      <main className="bg-canvas flex min-h-[100dvh] flex-col overflow-hidden">
        <Header />
        <Dashboard />
      </main>
    );
  }

  return (
    <main className="bg-canvas flex min-h-[100dvh] flex-col">
      <Nav />
      <Hero />
      <div className="mx-auto w-full max-w-[1400px] px-5 md:px-10">
        <div className="bg-hairline h-px w-full" />
      </div>
      <IdentityBand />
      <CoreExperienceBand />
      <DifficultyBand />
      <ReviewBand />
      <CtaBand />
      <Footer />
    </main>
  );
};

export default Home;
