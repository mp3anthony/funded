/**
 * Public guide content (#247). Linked from the website; URL must not change.
 * Update when user-visible behaviour changes (docs/conventions.md). Delete a
 * goodToKnow item when its ticket closes.
 */

export interface GuideMission {
  title: string;
  steps: string[];
  note?: string;
}

export interface GuidePage {
  name: string;
  description: string;
}

export interface GoodToKnowItem {
  text: string;
  /** The ticket this item works around. Data only, never rendered. */
  ticket?: number;
}

export const guideTitle = "Getting started";
export const guideSubtitle = "The basics of Funded, in a few short missions.";

export const installHeading = "Install the app first";
export const installSteps: string[] = [
  "Funded is made to live on your phone's home screen, like any other app.",
  "On iPhone: open this page in Safari, tap the Share button, then Add to Home Screen, then Add. Open Funded from the new icon.",
  "On Android: open it in Chrome, tap the menu, then Add to Home screen or Install app.",
  "Notifications only reach your phone from the installed app. In a Safari tab the option doesn't even appear.",
  "Already opened Funded from your home screen? You're all set.",
];

export const introLines: string[] = [
  "Every mission below is optional. Do them in any order, skip what doesn't fit, and explore as much as you like.",
  "This guide only covers the basics. There's plenty more to find on your own.",
  "Missions 2 and 3 need two people: one starts a household and shares a code, the other joins with it. On your own? Skip them.",
];

export const missions: GuideMission[] = [
  {
    title: "Start a household",
    steps: [
      "Open Funded and tap Need an account? Sign Up. Confirm your email from the link we send, then sign in.",
      "Choose Create a Household and give it a name.",
      "Pick a payment mode. Direct Pay: everyone pays their share of each bill directly. Joint Fund: bills come out of one shared account that everyone puts money into. You can change this later in Settings.",
      "When asked, add your next payday and your first bill, then tap Enter App.",
    ],
  },
  {
    title: "Invite someone with a join code",
    steps: [
      "Open Settings: tap your avatar at the top right, then Settings.",
      "Tap Join code, or + Invite member under Members.",
      "Share the six-character code. It lasts 24 hours. If it runs out, tap New code.",
    ],
    note: "Living solo? Skip this one.",
  },
  {
    title: "Join a household with a code",
    steps: [
      "For the second person: sign up and confirm your email, the same as mission 1.",
      "Don't create a household. Choose Join via Code instead.",
      "Type the code you were sent and tap Join.",
    ],
    note: "You can only be in one household at a time.",
  },
  {
    title: "Add another bill",
    steps: [
      "Go to Bills and tap the + button beside the page title.",
      "Fill in the name, amount and how often it's paid.",
      "Give it a due date. Funded needs it to know when the bill is due.",
      "Leave Payment Type on Manual so you can mark it paid yourself. Auto-Pay bills pay themselves.",
      "Tap Save Bill.",
    ],
  },
  {
    title: "Add another pay schedule",
    steps: [
      "Go to Payday and tap the + button beside the page title.",
      "Choose whose pay it is, the next pay date, how often it comes, and whether the amount is fixed or varies.",
      "To see Log Pay, set the next pay date to today. Log Pay appears on the day the pay is due (Enter Pay Amount if the pay varies). Tap it when the money lands. A past date is logged for you as a pending pay to confirm instead.",
    ],
  },
  {
    title: "Add a goal and top it up",
    steps: [
      "Go to Goals and tap the + button beside the page title.",
      "Name your goal, set a target amount, and tap Create Goal.",
      "Whenever you put money towards it, tap Add Amount under the goal.",
    ],
  },
  {
    title: "Mark a bill paid",
    steps: [
      "On Bills, tap a bill to open it, then tap Mark as Paid.",
      "If it's a repeating bill that was due today or overdue, it moves straight on to its next due date, and a message pops up with an Undo button for a few seconds.",
      "Paying early? It just shows as Paid until its due date. Tap Mark as Unpaid if you didn't mean it.",
    ],
    note: "Only Manual bills have this button. Auto-Pay bills pay themselves.",
  },
  {
    title: "Turn on notifications and pick a time",
    steps: [
      "Do this in the installed app.",
      "Go to Settings, tap Notifications, then tap the Settings tab at the top.",
      "If Push on this device says Needs attention, tap it, then Enable push notifications, and allow notifications when your iPhone asks.",
      "Tap Notify me at and pick the hour you'd like reminders to arrive.",
    ],
  },
  {
    title: "Report a bug",
    steps: [
      "Something look wrong, or just confusing? Go to Settings and tap Report a bug.",
      "Give it a short title and say what happened. Add a screenshot if it helps.",
      "It goes straight to the developer.",
    ],
  },
];

export const billVsExpenseHeading = "Bill or expense?";
export const billVsExpense: string[] = [
  "A bill is something fixed that comes round on a schedule and has a due date, like rent, power or a subscription. You mark it paid, then it moves on to its next due date.",
  "An expense is everyday spending that changes each time, like groceries or fuel. It has no due date and no paid button, but it still counts toward the household total.",
  "Both sit in one list on the Bills page and add up in the total at the top. To add an expense, tap + on Bills, then flip the Item Type switch at the top to Expense.",
];

export const pageGuide: GuidePage[] = [
  {
    name: "Home",
    description:
      "Your Dashboard. Household Health, Upcoming Bills, Savings Goals and Recent Activity at a glance.",
  },
  {
    name: "Payday",
    description:
      "Pay schedules, logging pay, confirming pending pay and recent pay history.",
  },
  {
    name: "Bills",
    description:
      "Every bill and expense in one list, with the household total at the top. Tap one to open it.",
  },
  {
    name: "Goals",
    description: "Your savings goals and how close each one is.",
  },
  {
    name: "Settings",
    description:
      "Tap your avatar at the top right. Profile, notifications, appearance, household settings, members and the join code.",
  },
  {
    name: "Bell",
    description:
      "Appears beside your avatar only when you have unread notifications. Tap it to read them.",
  },
];

export const goodToKnowHeading = "Good to know";
export const goodToKnow: GoodToKnowItem[] = [
  {
    text: "If you created the household, Leave household deletes it and everything in it for every member. Other members can leave safely.",
    ticket: 251,
  },
  { text: "Always give a bill a due date.", ticket: 250 },
  {
    text: "Household owner: check Settings > Timezone. It starts as Australia/Sydney, so change it if you live somewhere else.",
    ticket: 249,
  },
  {
    text: "On phones the + buttons show only a plus sign. Expenses are added with the Item Type switch at the top of Add Bill.",
  },
];

export const guideFooter =
  "Found something confusing? That's worth reporting too: Settings > Report a bug.";
