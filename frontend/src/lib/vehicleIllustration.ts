import coupe from "../assets/vehicles/coupe.svg";
import generic from "../assets/vehicles/generic.svg";
import hatchback from "../assets/vehicles/hatchback.svg";
import sedan from "../assets/vehicles/sedan.svg";
import suv from "../assets/vehicles/suv.svg";
import truck from "../assets/vehicles/truck.svg";

export type IllustrationKind = "suv" | "sedan" | "hatchback" | "truck" | "coupe" | "generic";

const IMAGES: Record<IllustrationKind, string> = { suv, sedan, hatchback, truck, coupe, generic };

/**
 * Words that name a body style, most specific first: "luxury SUV" is an SUV, "sports sedan" a sedan.
 * The first style with a word in the category wins.
 */
const STYLES: ReadonlyArray<[IllustrationKind, RegExp]> = [
  ["suv", /suv|crossover|utility/],
  ["truck", /truck|pick-?up/],
  ["hatchback", /hatch/],
  ["sedan", /sedan|saloon|limousine/],
  ["coupe", /coupe|sport|convertible|roadster|luxury|performance/],
];

/**
 * The drawing for a vehicle card. The database holds no photographs, so a card shows an illustration of the
 * kind of car its category names: never the actual vehicle. A category it cannot place gets a plain car.
 */
export function illustrationFor(category: string): { kind: IllustrationKind; src: string } {
  const text = category.toLowerCase(); // the patterns are not anchored, so surrounding spaces change nothing
  const kind = STYLES.find(([, words]) => words.test(text))?.[0] ?? "generic";
  return { kind, src: IMAGES[kind] };
}
