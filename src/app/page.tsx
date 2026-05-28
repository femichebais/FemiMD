import Link from "next/link";
import {
  ArrowRight,
  Stethoscope,
  Brain,
  MagnifyingGlass,
  ClipboardText,
  Heartbeat,
} from "@phosphor-icons/react/dist/ssr";
import {
  CCard,
  CLinkButton,
  CEyebrow,
} from "@/components/clinical/primitives";

export default function Home() {
  return (
    <div className="clinical min-h-screen flex flex-col bg-clinical-bg">
      {/* Top nav */}
      <header className="sticky top-0 z-20 border-b border-clinical-border bg-clinical-bg/85 backdrop-blur">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-6 px-5 md:px-8 h-16">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 font-semibold text-[17px] text-clinical-fg"
          >
            <span
              className="grid place-items-center h-7 w-7 rounded-clinical bg-clinical-primary text-clinical-primary-fg text-[13px] font-bold shadow-clinical-elegant"
              aria-hidden
            >
              F
            </span>
            Femi
          </Link>
          <nav className="flex items-center gap-1">
            <Link
              href="/login"
              className="text-[14px] font-medium text-clinical-muted-fg hover:text-clinical-fg transition-colors px-3 py-1.5 rounded-clinical hover:bg-clinical-muted"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="text-[14px] font-medium text-clinical-primary hover:text-clinical-fg transition-colors px-3 py-1.5 rounded-clinical hover:bg-clinical-muted"
            >
              Sign up
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-24">
            <div className="max-w-2xl relative">
              <CEyebrow className="mb-5">
                Clinical education for students
              </CEyebrow>
              <h1 className="font-serif text-[48px] md:text-[68px] leading-[1.02] tracking-[-0.025em] text-clinical-fg font-medium mb-6">
                Be the doctor.
                <br />
                Solve the case.
              </h1>
              <p className="text-[18px] md:text-[20px] leading-[1.55] text-clinical-muted-fg mb-9 max-w-xl">
                Real patients. Real symptoms. Real decisions — minus the
                lecture. Step into the clinic, ask the questions, run the
                exam, and make the call.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <CLinkButton href="/signup" size="lg" variant="primary">
                  Create an account
                  <ArrowRight weight="bold" className="h-4 w-4" />
                </CLinkButton>
                <Link
                  href="/login"
                  className="text-[14px] font-medium text-clinical-muted-fg hover:text-clinical-fg transition-colors px-3 py-2"
                >
                  Already have one? Log in
                </Link>
                <a
                  href="#how-it-works"
                  className="text-[14px] font-medium text-clinical-muted-fg hover:text-clinical-fg transition-colors px-3 py-2"
                >
                  How it works
                </a>
              </div>
            </div>
          </div>
          {/* Decorative blurs — kept off the small-screen viewport. */}
          <div
            aria-hidden
            className="hidden md:block absolute top-10 right-[-160px] h-96 w-96 rounded-full bg-clinical-primary-glow/15 blur-3xl pointer-events-none"
          />
          <div
            aria-hidden
            className="hidden md:block absolute bottom-[-80px] right-40 h-72 w-72 rounded-full bg-clinical-primary/10 blur-3xl pointer-events-none"
          />
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          className="bg-clinical-hero border-y border-clinical-border"
        >
          <div className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-20">
            <div className="max-w-2xl mb-12">
              <CEyebrow className="mb-3">How it works</CEyebrow>
              <h2 className="font-serif text-[32px] md:text-[40px] leading-[1.1] tracking-[-0.02em] text-clinical-fg font-medium">
                A patient walks in. The clock starts.
              </h2>
              <p className="mt-4 text-[16px] leading-[1.6] text-clinical-muted-fg">
                Each case is a few short stages — minutes, not hours. The
                questions you ask and the exams you run all count.
              </p>
            </div>

            <ol className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Step
                index={1}
                icon={Stethoscope}
                title="Ask the right questions"
                body="Pick what to ask the patient. Symptom timing and triggers are the diagnostic clues."
              />
              <Step
                index={2}
                icon={MagnifyingGlass}
                title="Run a targeted exam"
                body="Choose what to examine — just like in a real clinic. Every pick adds to the picture."
              />
              <Step
                index={3}
                icon={Brain}
                title="Reason to a diagnosis"
                body="Weigh the findings. Commit to a diagnosis and a disposition. No backtracking."
              />
              <Step
                index={4}
                icon={ClipboardText}
                title="Get instant feedback"
                body="See your score, the best picks, and the clinical takeaway — then test what stuck."
              />
            </ol>
          </div>
        </section>

        {/* What you'll learn */}
        <section className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-20">
          <div className="grid gap-10 lg:grid-cols-[1fr_2fr] items-start">
            <div>
              <CEyebrow className="mb-3">What you&rsquo;ll learn</CEyebrow>
              <h2 className="font-serif text-[32px] md:text-[40px] leading-[1.1] tracking-[-0.02em] text-clinical-fg font-medium">
                Think like a clinician — one decision at a time.
              </h2>
              <p className="mt-4 text-[16px] leading-[1.6] text-clinical-muted-fg">
                Femi is for high-school and undergrad students who want to
                feel real medicine before med school. Every attempt is
                kept. Retakes append — they don&rsquo;t overwrite.
              </p>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              <Feature
                title="History-taking"
                body="Which questions actually move a diagnosis forward — and which don&rsquo;t."
              />
              <Feature
                title="Physical exam"
                body="Where to look, what it means, and when to stop."
              />
              <Feature
                title="Differential reasoning"
                body="Building the right shortlist, then committing without flinching."
              />
              <Feature
                title="Disposition"
                body="What happens next — admit, discharge, refer — and why."
              />
            </ul>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-clinical-border bg-clinical-muted/40">
          <div className="max-w-3xl mx-auto px-5 md:px-8 py-16 md:py-20 text-center">
            <Heartbeat
              weight="duotone"
              className="h-10 w-10 text-clinical-primary mx-auto mb-5"
            />
            <h2 className="font-serif text-[32px] md:text-[40px] leading-[1.1] tracking-[-0.02em] text-clinical-fg font-medium mb-4">
              Ready when the patient walks in.
            </h2>
            <p className="text-[16px] leading-[1.6] text-clinical-muted-fg mb-7 max-w-xl mx-auto">
              Create an account in seconds — we&apos;ll approve access and
              email you when you&apos;re in.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <CLinkButton href="/signup" size="lg" variant="primary">
                Sign up
                <ArrowRight weight="bold" className="h-4 w-4" />
              </CLinkButton>
              <Link
                href="/login"
                className="text-[14px] font-medium text-clinical-muted-fg hover:text-clinical-fg transition-colors px-3 py-2"
              >
                Already have an account?
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-clinical-border">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-6 flex flex-wrap items-center justify-between gap-3 text-[12px] text-clinical-muted-fg">
          <span>Femi Medical &middot; Clinical education platform</span>
          <Link
            href="/login"
            className="hover:text-clinical-fg transition-colors"
          >
            Log in
          </Link>
        </div>
      </footer>
    </div>
  );
}

function Step({
  index,
  icon: Icon,
  title,
  body,
}: {
  index: number;
  icon: typeof Stethoscope;
  title: string;
  body: string;
}) {
  return (
    <li>
      <CCard className="p-5 h-full">
        <div className="flex items-center gap-3 mb-3">
          <span className="grid place-items-center h-10 w-10 rounded-clinical bg-clinical-primary-soft text-clinical-primary">
            <Icon weight="duotone" className="h-5 w-5" />
          </span>
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-clinical-muted-fg">
            Step {index}
          </span>
        </div>
        <h3 className="font-serif text-[18px] leading-tight text-clinical-fg font-medium mb-1.5">
          {title}
        </h3>
        <p className="text-[14px] leading-[1.55] text-clinical-muted-fg">
          {body}
        </p>
      </CCard>
    </li>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <li>
      <CCard className="p-5 h-full">
        <p className="font-serif text-[18px] leading-tight text-clinical-fg font-medium mb-1.5">
          {title}
        </p>
        <p className="text-[14px] leading-[1.55] text-clinical-muted-fg">
          {body}
        </p>
      </CCard>
    </li>
  );
}
