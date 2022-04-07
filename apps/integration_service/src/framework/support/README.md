# Terminology

---
### Data Flow (Caching Pools)
- Fetch all available pools/opportunities
- Cache minimal data (token addresses, but not prices)

### Data Flow (fetching opportunities)
- Retrieve cached pools
- if required inject with extra 'real time' data
- Format Opportunities - replace token addresses, with fully priced tokens, normalize decimals etc

### Data Flow (user positions)
- Fetch formatted opportunities (see above)
- add user balances
- filter to only include user pools

---

## Function Naming Conventions
fetch____
 - these are async functions that fetch data from an external source
format____ these are sync functions that just transform the supplied data into a specific output

---

## 'Pool' types
### Minimal
Minimal raw data directly from onchain, thegraph, or a third party API
- tokens are just the address,
- numbers are big strings (not normalized to decimal format yet).

### Opportunity
Formatted pool position. This should have full token details, APR, APY, TVL and anything else that makes sense for the opportunity type

---

### UserEntry
Same as an 'opportunity' except with the user balance included

## Token Types
### Supplied
this is a token that has been deposited/supplied to a protocol by the user

### Rewarded
this is a token that has been earned/claimable/emitted to a user

### Borrowed
this is a token the user has borrowed (likely using a supplied token as collateral). The total of borrowed tokens is a negative (debt)
