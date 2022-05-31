## Terminology

### Core

- A `Platform` is a website or project where you can interact with directly, usually withdrawing or depositing funds.
- A `Protocol` is a single, or group of contracts which you can deposit into, as it makes sense. Usually these are divided per 'feature', so that if a Platform has both lending & farming, these are likely to be two separate 'protocols'. Likewise, as in the case of PancakeSwap, there is a MasterChef for general farming, then additional Syrup Pools. They way we fetch the list of opportunities (pools), and calculate rewards are different between both, so they have been added as separate Protocols to make development & integrations easier.
- `Opportunity` is a single pool, yield farm, lending opportunity, algo-stable. Essentially it is a generic name for a single user deposit of any kind. Most protocols (i.e. MasterChef) are made of many pools, so therefore have many `Opportunities`

### Opportunity DTO types/phases

- `Minimal`
  - Minimal raw data directly from onchain, thegraph, or a third party API
  - tokens are just the address,
  - numbers are big strings (not normalized to decimal format yet).
- `Opportunity`
  - Formatted opportunity, ready to be displayed on the front end.
  - This should have full token details, prices, APR, APY, TVL and anything else that makes sense for the opportunity type
- `UserEntry`
  - Same as the above opportunity, however it will have user balances included.

### Opportunity Token Types

- `Supplied` - this is a token that has been deposited/supplied to a protocol by the user
- `Rewarded` - this is a token that has been earned/claimable/emitted to a user
- `Borrowed` - this is a token the user has borrowed (likely using one or more supplied token as collateral). The total of borrowed tokens is a negative (debt)

---

## Architecture

### Platform Service

<!-- TODO -->

### Platform

Every Platform extends `RootPlatform` and implement the 'register' function. This is where you can register all the `Protocols` for a specific `Platform`. When registering new platforms here, you must call the async function `registerProtocol` and pass in the protocol template (see below) along with any required initialization parameters. Commonly this would include a contract address, or API endpoint to fetch the data from.

### Protocol

Every protocol extends 'RootProtocol'. From there, each network type has a base class that is for shared code between all protocols on that network i.e. `EVMCore` for all common EVM related, `SolanaCore`, `TerraCore` etc. As they each have different ways of interacting with Web3, each of these categories will handle the majority of data fetching differently from each other. The primary functions which will need to be implemented are `initialize`, `getCacheableOpportunityData`, `formatOpportunity`, `getUsersData`.

- `initialize` - This is called when the protocol is accessed. It is often used on EVM chains, to fetch the ABI and parse it for the functions needed to get the opportunities data and the users data.
- `getCachableOpportunityData` This will fetch all available opportunities. For a masterchef, this will loop through all available pools and fetch the needed details. For beefy, it would loop through all available vaults. for a lending protocol such as Aave, it would get a list of all available lending & borrowing opportunities. This just fills in the required data that can be cached for an extended period of time. For example, instead of saving the entire token with its price & total Supply, or reserves for an LP, it would simply save the token address, and the realtime data can be fetched later, then merged & formatted in `formatOpportunity`
- `formatOpportunity` gets called when an opportunity (pool) is accessed. It passes in a single cached opportunity, and a list of tokens used by the protocol, and will return the fully detailed pool with live prices, etc.
- `getUsersData` will get passed in the will list of pools (with live prices & token details included) and here we just need to loop through the user addresses and check balances in each pool

### Templates

Each concrete protocol implementation is based on a template. At the time of writing the most commonly used template is `MasterChef`. When adding a new masterchef farm, hopefully this (or another existing) template can be used, and the act of adding the protocol is simply registering it on the platform & passing the required parameters. Of course this won't work in every instance, so the templates are designed to be extended, and over-written. Simple create a new class template (trying to match naming conventions, so others will know have some hints as to what the new template is for) and modify it as needed. If none of the templates match at all, then creating a new Protocol template as described above is required.

### Caching

All minimal opportunity data is cached, and can be safely cached for an extended period of time as it doesn't include frequently changing variables such as a tokens price, total supply, or underlying reserves. There are two caching strategies for this data, the Primary, and the Fallback.

- `Primary` - Each protocol can be individually cached via an API call. This will fetch the required data (calling `getCachableOpportunityData`) and cache each pool to be accessed later
- `Fallback` - When a pool is accessed (such as checking a users positions, or viewing all available opportunities) it will attempt to retrieve the pools from the cache. If no cached pools are found, then instead of failing, it will call the cache pools function, cache them for next time, and proceed from there. This will have negative performance for a subset of users, so ideally is not used, however it is useful if the scheduled job fails, and for local development where you will likely not have a scheduled job running regularly.

### General Data Flow

Assuming all the required functions above are implemented, every **_protocol_** has two main public interfaces `getPoolData` which will return all available opportunities for that protocol, and `getUsersData` which will return all user positions in said opportunities. Moving up the stack, every **_platform_** has the same two functions, with the addition of a `chains` parameter. This will merge and format all the data for all the protocols belonging to that platform (filtered to the requested chains)
