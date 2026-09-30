# Household

Who uses Funded together and how they settle what they owe. A household is the shared space everything else in the app belongs to.

## Language

### The group

**Household**:
The shared space a group of people manage bills, goals and pay together in. A person belongs to exactly one household at a time.
_Avoid_: Group, family account, team, workspace

**Member**:
A person in a household, either its owner or a regular member. A member can be shown as pending until they accept.
_Avoid_: User (for a person in a household), roommate, partner

**Owner**:
The member who created the household. Owners manage other members, choose the household timezone, and are the only ones who can delete the household.
_Avoid_: Admin, host, creator

**Join code**:
The temporary six-digit code an existing member shares so someone else can join the household. It expires and can be regenerated.
_Avoid_: Invite link, invite code, PIN, password

**Onboarding**:
The first-run setup that either creates a new household or joins an existing one by join code, then captures the payment mode, a first payday and a first bill.
_Avoid_: Sign-up wizard, tutorial, welcome flow

**Leave household**:
Removing yourself from your household. For a regular member the household carries on; for the owner it deletes the household and everything in it for every member.
_Avoid_: Delete account, quit, unsubscribe

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

**Contributor**:
A member who carries a share of a bill split or puts a contribution into the Joint Fund.
_Avoid_: Participant, payer (except "Assignee (Payer)" on a bill)
