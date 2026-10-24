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
      "Add your next payday, your first bill and a first goal, or tap Skip for now on any of them and add them later with the + buttons or from the Finish setting up card on your Dashboard. Then tap Enter App.",
    ],
  },
  {
    title: "Invite someone with a join code",
    steps: [
      "Open Settings: tap your avatar at the top right.",
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
      "Answer each question as it comes up: what it's called, the amount and how often it's paid. Tap Next after each one.",
      "On the due date question, add a date if you know it, so Funded can tell you when it's due. Don't know it yet? Leave it blank and add it later. After 30 days the bill shows an orange Add due date to remind you.",
      "On the last screen, leave Auto-Pay under Optional details on Manual so you can mark it paid yourself. Auto-Pay bills pay themselves.",
      "Tap Add bill.",
    ],
  },
  {
    title: "Add another pay schedule",
    steps: [
      "Go to Payday and tap the + button beside the page title.",
      "Answer each question as it comes up: whether the amount is fixed or varies, how often it comes, the next pay date and, for fixed pay, the amount. Owners first pick whose pay it is. Tap Next after each one, then tap Add pay schedule.",
      "To see it, set the next pay date to today. On the day the pay is due it shows at the top of Payday under Needs you (Log pay, or Enter amount if the pay varies). Tap it when the money lands. If it never arrives, tap Didn't get paid to skip it. If a pay day goes by without you logging it, it becomes a pending pay for you to confirm, and you get a reminder each day until you do.",
    ],
  },
  {
    title: "Add a goal and top it up",
    steps: [
      "Go to Goals and tap the + button beside the page title.",
      "Name your goal, set a target amount, and tap Add goal.",
      "Whenever you put money towards it, tap the + beside the goal.",
      "Not saving yet? Pick Just tracking when you add it. It sits in the Wish list at the bottom with its cost, and Check impact shows what it would do to your household before you commit. Wish list goals are not counted in your totals.",
      "To change a goal or pay schedule later, tap it, then tap the line you want to change.",
    ],
  },
  {
    title: "Mark a bill paid",
    steps: [
      "On Bills, tap the round tick at the right of a bill to mark it paid. Or tap the bill to open it, then tap Mark as Paid.",
      "Each bill says when it is due, like Due in 3 days or 2 days overdue. A Paid bill says Paid.",
      "If it's a repeating bill that was due today or overdue, it moves straight on to its next due date, and a message pops up with an Undo button for a few seconds.",
      "Paying early? It just shows as Paid until its due date. Tap Mark as Unpaid if you didn't mean it.",
      "No due date on a repeating bill? Mark as Paid asks when it's next due. Pick a date and it moves on to it. Skip for now marks it Paid, and it stays Paid until you add a date. Don't ask again for this bill stops the question for good.",
    ],
    note: "Only Manual bills have this button. Auto-Pay bills pay themselves.",
  },
  {
    title: "Change or delete a bill",
    steps: [
      "To change a bill later, tap it, then tap the line you want to change.",
      "Make the change and tap Save.",
      "To remove it, tap Delete at the bottom of the same pop-up. It asks first.",
    ],
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
    title: "Report an issue",
    steps: [
      "Something look wrong, or just confusing? Go to Settings and tap Report an issue.",
      "Give it a short title, then say what happened. Add a screenshot if it helps.",
      "It goes straight to the developer.",
    ],
  },
];

export const billVsExpenseHeading = "Bill or expense?";
export const billVsExpense: string[] = [
  "A bill is something fixed that comes round on a schedule and has a due date, like rent, power or a subscription. You mark it paid, then it moves on to its next due date.",
  "An expense is everyday spending that changes each time, like groceries or fuel. It has no due date and no paid button, but it still counts toward the household total.",
  "Both sit in one list on the Bills page and add up in the total at the top. To add an expense, tap + on Bills and pick Expense on the first card.",
];

export const pageGuide: GuidePage[] = [
  {
    name: "Dashboard",
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
      "Every bill and expense in one list, with the household total at the top. Pick Weekly, Fortnightly, Monthly or Yearly (it is remembered), use the chips to filter, and the magnifier to search. Tap Check impact to see what a new payment plan or subscription would do to your total, without saving anything. Tap one to open it. Paused bills show greyed out and are left out of the total.",
  },
  {
    name: "Goals",
    description:
      "Your savings goals, how close each one is and whether it is on track for its date. The total at the top counts saving goals only. Just tracking goals sit in the Wish list at the bottom.",
  },
  {
    name: "Settings",
    description:
      "Tap your avatar at the top right. Profile, notifications, appearance, household settings, members, the join code and Log out.",
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
    text: "The household timezone is set from the owner's phone when the household is created. Owners should still check it in Settings.",
    ticket: 249,
  },
  {
    text: "On phones the + buttons show only a plus sign. To add an expense, tap + on Bills and pick Expense on the first card.",
  },
];

export const guideFooter =
  "Found something confusing? That's worth reporting too: Settings > Report an issue.";
