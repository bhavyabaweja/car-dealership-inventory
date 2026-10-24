import { ArrowRight } from "lucide-react";
import showroom from "../assets/hero/showroom.svg";

interface HeroSectionProps {
  /** Whether the page has a categories section to point to. */
  hasCategories: boolean;
}

const primaryLink =
  "flex w-full items-center justify-center gap-2 rounded-lg bg-primary-container px-8 py-3.5 font-display text-base font-bold text-on-primary-container transition-all " +
  "hover:bg-primary hover:shadow-[0_0_24px_rgba(0,212,255,0.4)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container sm:w-auto";
const secondaryLink =
  "flex w-full items-center justify-center rounded-lg border border-white/20 bg-white/5 px-8 py-3.5 font-display text-base font-semibold text-white backdrop-blur-md transition-all " +
  "hover:border-primary-container/60 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-container sm:w-auto";

/**
 * The cinematic top of the page. The backdrop is a drawing of a showroom, kept local and plainly an illustration,
 * so nothing here pretends to be a photograph of a vehicle in the inventory.
 */
export function HeroSection({ hasCategories }: HeroSectionProps) {
  return (
    <section id="hero" className="relative flex min-h-[640px] w-full items-center justify-center overflow-hidden bg-background lg:min-h-[720px]">
      <div aria-hidden="true" className="absolute inset-0 z-0">
        <img src={showroom} alt="" className="size-full object-cover object-center" />
        {/* The design's vignettes: dark at the bottom and edges, so the words stay crisp. */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-background/25 to-background/60" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-7xl flex-col items-center px-4 py-20 text-center md:px-8">
        <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary-container/20 bg-surface-container/75 px-3.5 py-1.5 backdrop-blur-xl">
          <span aria-hidden="true" className="size-2 rounded-full bg-primary-container" />
          <span className="font-display text-xs font-semibold tracking-wider text-primary-container uppercase">Live vehicle inventory</span>
        </p>
        <h1 className="mb-6 max-w-4xl font-display text-4xl leading-[1.08] font-extrabold tracking-tight text-white sm:text-6xl md:text-7xl">
          Find your{" "}
          <span className="bg-gradient-to-r from-white via-primary-container to-blue-400 bg-clip-text text-transparent">perfect drive.</span>
        </h1>
        <p className="mb-10 max-w-2xl text-lg leading-relaxed text-slate-300 sm:text-xl">
          Discover vehicles that match your style, needs and budget. Browse the live inventory, see exactly how many of each are in stock, and
          buy with confidence.
        </p>
        <div className="flex w-full flex-col items-center gap-4 sm:w-auto sm:flex-row">
          <a href="#inventory" className={primaryLink}>
            Explore inventory
            <ArrowRight className="size-[18px]" aria-hidden="true" />
          </a>
          {hasCategories && (
            <a href="#categories" className={secondaryLink}>
              Browse categories
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
