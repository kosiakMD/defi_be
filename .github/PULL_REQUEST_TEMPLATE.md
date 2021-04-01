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

Work Scope:

- [ ] Common
- [ ] API Gateway
- [ ] Account Service
- [ ] Integration Service
- [ ] Price Service
- [ ] Swap Service

Work Checks:

- [ ] <b>Updated/Removed</b> any component <i>(module / controller / service / etc)</i> and checked all the calls to it were updated and are still working
- [ ] <b>Created</b> a new component <i>(module / controller / service / etc)</i> and checked no other components play the same role
- [ ] <b>Updated/Removed/Created</b> any new <b>Common</b> component <i>(interface / DTO / module / etc)</i> and checked no other components play the same role
- [ ] <b>Included a DB integration & Model</b> and checked error states are properly handled and all related mock data was removed
- [ ] <b>Updated a DB interaction & Model</b> and checked <b>Migrations</b> are provided, error states are properly handled, and all related mock data was removed

Rules checks:

- [ ] Tested project `build` and run in production mode `npm run start:prod` with no errors;
- [ ] Checked there are no `console.log` except Logger
- [ ] Checked there are no console errors or warnings according to <b>TypeScript</b> rules
- [ ] Checked there are no console errors according to <b>ESLint</b> and <b>Prettier</b> rules
- [ ] All linked <b>JIRA</b> tasks requirements are satisfied
- [ ] Following <b>all project-related conventions</b>

