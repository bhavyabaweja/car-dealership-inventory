import { Layers, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router";
import { BrandMark } from "../BrandMark";

/** The gradient the design puts on the key word of a showcase headline. */
export const HEADLINE_HIGHLIGHT = "bg-gradient-to-r from-primary-container to-sky-400 bg-clip-text text-transparent";

interface AuthShowcaseProps {
  /** The photograph behind everything. It is decoration, so it carries no description. */
  photograph: string;
  /** The small pill beside the brand. */
  tag: string;
  /** The line of capitals above the headline. */
  overline: string;
  headline: ReactNode;
  description: string;
  /** What signing up or in gives, said plainly: each of these must be something the app does. */
  points: { icon: LucideIcon; label: string }[];
}

/**
 * The left half of the sign-in and sign-up pages, from the Stitch designs: a night-time photograph of a car, the brand over
 * it, and a glass card that says what an account gives. Pure decoration beside the form, so it is left out entirely below
 * the desktop breakpoint, where the form should come first and the photograph would only push it down.
 * On a short screen the card keeps just its headline, so that it does not cover the car.
 */
export function AuthShowcase({ photograph, tag, overline, headline, description, points }: AuthShowcaseProps) {
  return (
    <div className="relative hidden flex-col justify-between overflow-hidden bg-background p-12 lg:flex lg:w-[55%]">
      <img
        src={photograph}
        alt=""
        width={1376}
        height={768}
        loading="lazy"
        decoding="async"
        className="absolute inset-0 size-full object-cover object-center"
      />
      {/* Vignettes: the photograph fades into the page at the bottom and into the form on the right. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/40 to-background/60" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-background" />
      <div aria-hidden="true" className="pointer-events-none absolute -top-32 -left-32 size-96 rounded-full bg-primary-container/10 blur-3xl" />

      <div className="relative z-10 flex items-center justify-between gap-4">
        <Link
          to="/"
          className="group flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-container"
        >
          <span className="grid size-10 place-items-center rounded-xl border border-primary-container/40 bg-surface-container shadow-glow transition-transform duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100">
            <Layers className="size-5 text-primary-container" strokeWidth={2.2} aria-hidden="true" />
          </span>
          <BrandMark className="text-2xl font-extrabold" />
        </Link>

        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur-md">
          <span aria-hidden="true" className="size-1.5 animate-ping rounded-full bg-primary-container motion-reduce:animate-none" />
          <span className="text-[11px] font-semibold tracking-widest text-on-surface uppercase">{tag}</span>
        </span>
      </div>

      <div className="relative z-10 mt-auto pt-8">
        <div className="relative max-w-xl overflow-hidden rounded-2xl border border-white/8 bg-surface-container/70 p-8 shadow-2xl backdrop-blur-xl">
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-primary-container/80 to-transparent" />
          <p className="mb-3 font-display text-xs font-bold tracking-[0.2em] text-primary-container uppercase">{overline}</p>
          {/* Not a heading: the page's own heading is the form's. */}
          <p className="mb-3 font-display text-5xl leading-[1.15] font-extrabold tracking-tight text-white [@media(max-height:800px)]:mb-0">
            {headline}
          </p>
          <p className="mb-6 text-base leading-relaxed text-on-surface-variant [@media(max-height:800px)]:hidden">{description}</p>
          <ul className="grid grid-cols-3 gap-2.5 border-t border-white/10 pt-4 [@media(max-height:800px)]:hidden">
            {points.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2">
                <Icon className="size-4 shrink-0 text-primary-container" aria-hidden="true" />
                <span className="text-[11px] leading-tight font-medium text-on-surface-variant">{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
