import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { fadeInUp, fadeIn, staggerContainer } from "@/lib/motion";
import heroImage from "@/img/image.png";

export default function LandingPage() {
  return (
    <div className="bg-background-app text-text-primary">

      {/* ================= NAVBAR ================= */}
      <header className="sticky top-0 z-50 bg-background-app/80 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-brand-primary">Collabry</h1>

          <nav className="hidden md:flex gap-8 text-sm text-text-secondary">
            <a href="#features" className="hover:text-brand-primary">Features</a>
            <a href="#how" className="hover:text-brand-primary">How it works</a>
            <a href="#pricing" className="hover:text-brand-primary">Pricing</a>
          </nav>

          <div className="flex gap-3">
            <a
              href="/auth"
              className="px-4 py-2 rounded-lg text-sm text-brand-primary border border-border hover:bg-surface-base transition"
            >
              Login
            </a>
            <a
              href="/auth"
              className="px-4 py-2 rounded-lg text-sm bg-brand-primary text-text-inverse hover:bg-brand-primary/90 transition"
            >
              Get Started
            </a>
          </div>
        </div>
      </header>

      {/* ================= HERO ================= */}
      <motion.section
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="relative overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-16 items-center">

          <motion.div variants={fadeInUp}>
            <h2 className="text-5xl font-semibold leading-tight mb-6">
              Manage Projects. <br />
              Control Access. <br />
              <span className="text-brand-secondary">Scale with Confidence.</span>
            </h2>

            <p className="text-text-secondary text-lg mb-8">
              A modern enterprise platform for structured workflows.
            </p>

            <div className="flex gap-4">
              <a
                href="/register"
                className="px-6 py-3 rounded-xl bg-brand-primary text-text-inverse font-medium hover:bg-brand-primary/90"
              >
                Get Started
              </a>
              <a
                href="#demo"
                className="px-6 py-3 rounded-xl border border-border text-text-primary"
              >
                Request Demo
              </a>
            </div>
          </motion.div>

          <motion.div variants={fadeIn}>
            <img
              src={heroImage}
              className="relative rounded-2xl shadow-xl"
              alt="Dashboard preview"
            />
          </motion.div>
        </div>
      </motion.section>

      {/* ================= TRUST ================= */}
      <section className="py-16 border-t border-border">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-sm text-text-secondary mb-8">
            Trusted by fast-growing teams and enterprises
          </p>
          <div className="flex justify-center gap-10 opacity-70">
            <span>Acme Corp</span>
            <span>NovaTech</span>
            <span>Cloudify</span>
            <span>Zenware</span>
            <span>Buildify</span>
          </div>
        </div>
      </section>

      {/* ================= FEATURES ================= */}
      <section id="features" className="py-24 bg-background-app">
        <div className="max-w-7xl mx-auto px-6">
          <h3 className="text-3xl font-semibold mb-12 text-center">
            Everything you need to run your organization
          </h3>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              ["Role-Based Access", "Control permissions across teams and projects."],
              ["Smart Project Tracking", "Monitor progress with clarity and insight."],
              ["Team Collaboration", "Communicate and collaborate in real time."],
              ["Real-Time Analytics", "Make data-driven decisions instantly."],
              ["Enterprise Security", "Secure by design with role isolation."],
              ["Scalable Architecture", "Built for startups to enterprises."]
            ].map(([title, desc]) => (
              <div
                key={title}
                className="bg-surface-base p-6 rounded-xl border border-border hover:shadow-md transition"
              >
                <h4 className="font-medium mb-2">{title}</h4>
                <p className="text-sm text-text-secondary">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section id="how" className="py-24">
        <div className="max-w-6xl mx-auto px-6">
          <h3 className="text-3xl font-semibold text-center mb-12">
            How it works
          </h3>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              "Create Workspace",
              "Assign Roles",
              "Track Progress",
              "Analyze & Scale",
            ].map((step, i) => (
              <div
                key={step}
                className="bg-surface-base p-6 rounded-xl border border-border text-center"
              >
                <div className="text-brand-accent font-semibold mb-2">
                  Step {i + 1}
                </div>
                <p className="font-medium">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="py-24 bg-brand-primary text-text-inverse">
        <div className="max-w-5xl mx-auto text-center px-6">
          <h3 className="text-3xl font-semibold mb-4">
            Start building smarter today
          </h3>
          <p className="mb-8 text-text-inverse/80">
            Join teams that manage work with clarity and confidence.
          </p>
          <a
            href="/register"
            className="inline-flex items-center gap-2 bg-surface-base text-brand-primary px-6 py-3 rounded-xl font-medium hover:opacity-90"
          >
            Get Started <ArrowRight size={18} />
          </a>
        </div>
      </section>

      {/* ================= FOOTER ================= */}
      <footer className="bg-background-app border-t border-border py-10">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-6 text-sm text-text-secondary">
          {[
            ["Product", ["Features", "Security", "Roadmap"]],
            ["Company", ["About", "Careers", "Contact"]],
            ["Resources", ["Docs", "API", "Support"]],
            ["Legal", ["Privacy", "Terms"]],
          ].map(([title, items]) => (
            <div key={title}>
              <h4 className="font-medium text-text-primary mb-2">{title}</h4>
              {items.map((i) => (
                <p key={i}>{i}</p>
              ))}
            </div>
          ))}
        </div>
      </footer>
    </div>
  );
}
