import Link from "next/link";

export default function HomePage() {
  return (
    <main className="shell shell--landing landing-stage">
      <section className="hero-card landing-card">
        <div className="brand-mark" aria-hidden="true">
          <div className="brand-barbell" />
          <div className="brand-leaf" />
        </div>
        <h1 className="brand-title">
          Lift <span className="brand-title-accent">&amp;</span> Fuel
        </h1>
        <Link href="/onboarding" className="button button--primary start-button">
          Start plan
        </Link>
      </section>
    </main>
  );
}
