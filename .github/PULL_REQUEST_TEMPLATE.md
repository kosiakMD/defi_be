## JIRA

Include the JIRA task/subtask ID, if available.
[DAS-$INSERT_ID_HERE](https://defiyield.atlassian.net/browse/DAS-$INSERT_ID_HERE)

## Problem

Explain the context and why you're making that change. What is the
problem you're trying to solve? In some cases there is not a problem
and this can be thought of being the motivation for your change.

## Solution

Describe the modifications you've done.

## Result

What will change as a result of your pull request? Note that sometimes this section is unnecessary because it is self-explanatory based on the solution.

### Sanity Check Steps

Scope:

- [ ] Common
- [ ] API Gateway
- [ ] Account Service
- [ ] Integration Service
- [ ] Price Service
- [ ] Swap Service

General:

- [ ] Tested
- [ ] Checked there are no `console.log` except Logger
- [ ] Checked there are no console errors or warnings according to TypeScript rules
- [ ] Checked there are no console errors or warnings according to ESLint and Prettier rules
- [ ] Updated/Removed a common component <i>(module / controller / service / etc)</i> and checked all the calls to it were updated and are still working
- [ ] Created a new component <i>(module / controller / service / etc)</i> and checked no other components play the same role
- [ ] Included a DB integration and checked loading and error states are properly handled and all related mock data was removed
- [ ] All linked JIRA tasks requirements are satisfied
- [ ] Following all project related conventions
