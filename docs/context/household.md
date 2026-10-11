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
A member with owner rights. The person who created the household starts as the owner, and owners can make other accepted members owners, or demote them, so a household can have several owners. Owners manage other members, choose the household timezone, and are the only ones who can delete the household.
_Avoid_: Admin, host, creator

**Join code**:
The temporary six-digit code an existing member shares so someone else can join the household. It expires and can be regenerated.
_Avoid_: Invite link, invite code, PIN, password

**Onboarding**:
The first-run setup that either creates a new household or joins one by join code. Creating walks through household, payment mode, a first payday, a first bill and a first goal, then a Setup Complete screen. The payday, bill and goal steps can each be skipped with "Skip for now"; household and payment mode cannot. Joining by code goes straight into the app.
_Avoid_: Sign-up wizard, tutorial, welcome flow

**Leave household**:
Removing yourself from your household. A regular member, or an owner while another owner remains, leaves and the household carries on. An owner who is the only owner while other accepted members remain must either make an accepted member the new owner and then leave, or delete the household. A sole member can only delete. Pending members are not in the household yet, so they cannot be given ownership.
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
