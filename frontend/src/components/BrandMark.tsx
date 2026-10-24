import { BRAND_NAME } from "../brand";

/** The product name as the design sets it: "Auto" in white, "Vault" in electric cyan. */
export function BrandMark({ className = "" }: { className?: string }) {
  const split = BRAND_NAME.indexOf("Vault");

  return (
    <span className={`font-display text-xl font-bold tracking-tight text-on-surface ${className}`}>
      {BRAND_NAME.slice(0, split)}
      <span className="text-primary-container">{BRAND_NAME.slice(split)}</span>
    </span>
  );
}
