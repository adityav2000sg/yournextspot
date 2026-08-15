import type { Category, Spot } from "../types";

export type TimeBlock =
  | "breakfast"
  | "coffee_work"
  | "lunch"
  | "dinner"
  | "late_drinks"
  | "quiet_hours";

export type TimeFitSignal = "good_now" | "better_later" | "hours_unknown";

export interface SingaporeTimeContext {
  hour: number;
  minute: number;
  timeLabel: string;
  dayLabel: string;
  block: TimeBlock;
  modeLabel: string;
  statusLabel: string;
  helper: string;
}

export interface SpotTimeFit {
  signal: TimeFitSignal;
  label: string;
  tone: "aqua" | "gilt" | "mist" | "orchid" | "ember";
  score: number;
  reason: string;
  hoursLabel: string;
  hoursDetail: string;
}

export interface TimePlan {
  block: TimeBlock;
  label: string;
  detail: string;
  category: Category;
  signal: string;
  now: boolean;
}

const SGT_FORMAT = new Intl.DateTimeFormat("en-SG", {
  timeZone: "Asia/Singapore",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const SGT_DAY_FORMAT = new Intl.DateTimeFormat("en-SG", {
  timeZone: "Asia/Singapore",
  weekday: "short",
  day: "2-digit",
  month: "short",
});

export function getSingaporeTimeContext(date = new Date()): SingaporeTimeContext {
  const parts = SGT_FORMAT.formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  const block = blockForHour(hour);
  const meta = blockMeta(block);

  return {
    hour,
    minute,
    timeLabel: SGT_FORMAT.format(date),
    dayLabel: SGT_DAY_FORMAT.format(date),
    block,
    ...meta,
  };
}

export function timePlans(context: SingaporeTimeContext): TimePlan[] {
  const plans: Omit<TimePlan, "now">[] = [
    {
      block: "breakfast",
      label: "Breakfast",
      detail: "Early tables, easy coffee, low-friction starts.",
      category: "restaurant",
      signal: "Morning",
    },
    {
      block: "coffee_work",
      label: "Coffee / work",
      detail: "Cafes for laptop blocks, resets, and quiet catch-ups.",
      category: "coffee",
      signal: "Cafe mode",
    },
    {
      block: "lunch",
      label: "Lunch",
      detail: "Fast enough for the day, good enough to remember.",
      category: "restaurant",
      signal: "Midday",
    },
    {
      block: "dinner",
      label: "Dinner",
      detail: "The main decision window for dates, teams, and friends.",
      category: "restaurant",
      signal: "Prime time",
    },
    {
      block: "late_drinks",
      label: "Late drinks",
      detail: "Bars and nightcaps once dinner is settled.",
      category: "bar",
      signal: "After dinner",
    },
  ];

  return plans.map((plan) => ({
    ...plan,
    now:
      plan.block === context.block ||
      (plan.block === "late_drinks" && context.block === "quiet_hours"),
  }));
}

export function evaluateTimeFit(
  spot: Spot,
  context: SingaporeTimeContext = getSingaporeTimeContext()
): SpotTimeFit {
  const categoryScore = categoryTimeScore(spot.category, context.block);
  const score = Math.max(-4, Math.min(4, categoryScore));

  if (context.block === "quiet_hours") {
    return {
      signal: "hours_unknown",
      label: "Hours unknown",
      tone: "ember",
      score,
      reason:
        "It is late in Singapore, and this dataset does not have verified opening hours yet.",
      hoursLabel: "Hours not verified",
      hoursDetail: "Check live hours before moving.",
    };
  }

  if (score >= 2.5) {
    return {
      signal: "good_now",
      label: "Fits this time",
      tone: "aqua",
      score,
      reason: goodNowReason(spot.category, context.block),
      hoursLabel: "Hours not verified",
      hoursDetail: "Time fit is inferred from category, not live opening hours.",
    };
  }

  if (score <= -2.5) {
    return {
      signal: "better_later",
      label: "Better later",
      tone: "gilt",
      score,
      reason: betterLaterReason(spot.category, context.block),
      hoursLabel: "Hours not verified",
      hoursDetail: "Opening hours are not in the dataset yet.",
    };
  }

  return {
    signal: "hours_unknown",
    label: "Hours unknown",
    tone: "mist",
    score,
    reason:
      "The category can work, but exact hours are not verified in the current dataset.",
    hoursLabel: "Hours not verified",
    hoursDetail: "Use Maps or the venue page before committing.",
  };
}

export function categoryTimeScore(category: Category, block: TimeBlock) {
  const table: Record<TimeBlock, Record<Category, number>> = {
    breakfast: { restaurant: 2.5, coffee: 3.4, bar: -4 },
    coffee_work: { restaurant: -0.4, coffee: 4, bar: -3.5 },
    lunch: { restaurant: 4, coffee: 0.8, bar: -3.2 },
    dinner: { restaurant: 4, coffee: -2.4, bar: 1.4 },
    late_drinks: { restaurant: -0.8, coffee: -3.4, bar: 4 },
    quiet_hours: { restaurant: -2.2, coffee: -4, bar: 1.7 },
  };
  return table[block][category];
}

export function categoryModeLabel(category: Category) {
  if (category === "coffee") return "Coffee mode";
  if (category === "bar") return "Drinks mode";
  return "Meal mode";
}

function blockForHour(hour: number): TimeBlock {
  if (hour >= 5 && hour < 10) return "breakfast";
  if ((hour >= 10 && hour < 12) || (hour >= 14 && hour < 17)) return "coffee_work";
  if (hour >= 12 && hour < 14) return "lunch";
  if (hour >= 17 && hour < 21) return "dinner";
  if (hour >= 21 || hour < 2) return "late_drinks";
  return "quiet_hours";
}

function blockMeta(block: TimeBlock) {
  const meta: Record<
    TimeBlock,
    Pick<SingaporeTimeContext, "modeLabel" | "statusLabel" | "helper">
  > = {
    breakfast: {
      modeLabel: "Breakfast window",
      statusLabel: "Morning picks",
      helper: "Prioritize breakfast, coffee, and easy-start restaurants.",
    },
    coffee_work: {
      modeLabel: "Coffee / work block",
      statusLabel: "Cafe-friendly",
      helper: "Coffee spots get the strongest lift right now.",
    },
    lunch: {
      modeLabel: "Lunch window",
      statusLabel: "Midday decision",
      helper: "Restaurants rank higher for a clean lunch pull.",
    },
    dinner: {
      modeLabel: "Dinner window",
      statusLabel: "Prime meal time",
      helper: "Restaurants and polished occasion picks get a stronger signal.",
    },
    late_drinks: {
      modeLabel: "Late drinks",
      statusLabel: "Night mode",
      helper: "Bars rank higher; exact closing times are not verified.",
    },
    quiet_hours: {
      modeLabel: "Quiet hours",
      statusLabel: "Check hours",
      helper: "The app can suggest a direction, but live opening hours need checking.",
    },
  };
  return meta[block];
}

function goodNowReason(category: Category, block: TimeBlock) {
  if (category === "coffee") {
    return block === "breakfast"
      ? "Coffee fits the morning start in Singapore."
      : "Coffee is the strongest fit for this work/reset block.";
  }
  if (category === "bar") {
    return "The current window favors drinks and after-dinner energy.";
  }
  if (block === "breakfast") return "This can work as an early meal pick.";
  if (block === "lunch") return "This lines up with the lunch decision window.";
  return "This lines up with the dinner decision window.";
}

function betterLaterReason(category: Category, block: TimeBlock) {
  if (category === "bar") return "This is more naturally a later drinks pick.";
  if (category === "coffee") return "This is stronger in a coffee or work block.";
  if (block === "late_drinks") return "This is more naturally a lunch or dinner pick.";
  return "This category is not the cleanest fit for the current window.";
}
