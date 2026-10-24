# Household

Who uses Funded together and how they settle what they owe. A household is the shared space everything else in the app belongs to.

## Language

### The group

**Household**:
The shared space a group of people manage bills, goals and pay together in. A person belongs to exactly one household at a time.
_Avoid_: Group, family account, team, workspace

**Member**:
A person in a household, either an owner or a regular member. A pending member has been added but has not accepted yet, so is not yet in the household. Also called a Contributor when shown by what they pay or earn.
_Avoid_: User (for a person in a household), roommate, partner

**Owner**:
A member with owner rights. The person who created the household starts as the owner, and owners can make other accepted members owners, or demote them, so a household can have several owners, but the last remaining owner cannot demote themselves (make someone else an owner first). Owners manage other members, choose the household timezone, and are the only ones who can delete the household.
_Avoid_: Admin, host, creator

**Household name**:
The name the household shows in Settings and on the identity card. Owners change it from Settings > Household > Household name (blank names are refused; the database allows only owners).
_Avoid_: Family name, group name

**Join code**:
The temporary six-digit code an existing member shares so someone else can join the household. It expires and can be regenerated.
Any member can view and copy it; only owners can change it, and only owners see the "+" on Members that opens it. Only owners also change the household name, payment mode and timezone (the database enforces this, R28 #415).
_Avoid_: Invite link, invite code, PIN, password

**Onboarding**:
The first-run setup that either creates a new household or joins one by join code. Creating starts on a full-screen Welcome (Create a household / Join with a code), then one-question screens for Household name and Payment mode (Direct Pay by default); the household is created once, when Next is tapped on Payment mode, and quitting before that creates nothing. Then the Setup hub, where a first payday, bill and goal are all optional; household name and payment mode are not. Anything left unticked shows on the owner's Finish setting up card. Joining by code opens a full-screen join screen (one question: the join code, six letters or digits shown as ABC-123) and then goes straight into the app.
Built (R31, #418; R32, #419): the full-screen Welcome, Household name, Payment mode and the optional **Setup hub** with Add your pay, Add a bill, Add a goal rows (each opens the normal step flow over the hub and ticks when saved; a ticked row stays tappable) and an always-available "Enter app" plus a Getting started guide link. The household is created only once name and Payment mode are both chosen, in one write; quitting earlier restarts at Welcome. A joiner types the code on the full-screen join screen (R33, #420; Back returns to Welcome) and goes straight into the app (their nudge is the Dashboard's "Set up your pay"). A wrong or expired code shows an inline red line on the join screen and changes nothing.
_Avoid_: Sign-up wizard, tutorial, welcome flow

**Setup hub**:
The optional last onboarding screen after the household is created: three rows (pay, bill, goal) that each open the normal step flow and show a green tick once saved, with "Enter app" always available. Replaces the Setup Complete screen and the three "Skip for now" screens. Anything unticked feeds the owner's Finish setting up card.
_Avoid_: Checklist, Setup Complete

**Leave household**:
Removing yourself from your household. A regular member, or an owner while another owner remains, leaves and the household carries on. An owner who is the only owner while other accepted members remain must either make an accepted member the new owner and then leave, or delete the household. A sole member can only delete, and so can an only owner whose only other members are pending (they are not in the household yet, so cannot be given ownership).
_Avoid_: Delete account, quit, unsubscribe

**Delete household**:
The owner-only action that permanently removes the household and everything in it for every member. Only available to an owner with no other owner, and it needs DELETE typed to confirm. Other members get no notice; they land on the create-or-join screen the next time they open the app.
_Avoid_: Delete account

### Settling bills

**Payment mode**:
The household-wide choice of how bills are settled, either Joint Fund or Direct Pay. Switching it resets every bill's contributor splits.
_Avoid_: Mode, billing type, split mode

**Joint Fund**:
The payment mode where the household shares one bank account that bills are paid from, and each member contributes into it.
_Avoid_: Shared account, pot, kitty

**Direct Pay**:
The payment mode where there is no shared account and members transfer directly per bill split.
_Avoid_: Individual pay, split pay, roommate mode

**Contribution**:
The amount a member regularly puts into the Joint Fund, set per member with its own frequency.
_Avoid_: Deposit, transfer, allowance

**Bill split**:
How one bill's cost is divided between members, by percentage or by dollar amount. A bill with no split is paid entirely by its assignee.
_Avoid_: Share, cut, division

**Contributor** (alias of Member):
A member, when shown by what they pay or earn (bill splits, the Joint Fund, the Payday filter). Same person as a Member; use Member when the payment context does not matter.
_Avoid_: Participant, user
