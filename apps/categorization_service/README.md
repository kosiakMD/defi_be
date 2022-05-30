# Categorization Tool Service

## Table Of Contents
1. [Installation](#Installation)
2. [Backing Services](#Backing-Services)
3. [Backing Services](#Backing-Services)
4. [DB migrations](#DB-migrations)
5. [Running The Service](#Running-The-Service)
6. [Swagger API](#Swagger-API)
7. [Docs](#Docs)

### Installation

```bash
yarn install
yarn categorization_service-build
```

### Backing Services

#### Start Services
```bash
docker-compose -f apps/categorization_service/docker-compose.yml up -d
```

#### Stop Services
Add ```--volume``` option if you want to clean up the data.
```bash
docker-compose -f apps/categorization_service/docker-compose.yml down
```

### DB migrations

#### Migrations Up
##### Local Development
```bash
npm run categorization_service-migration:run-dev
```
##### Environment
```bash
npm run categorization_service-migration:run
```

#### Migration Down
##### Local Development
```bash
npm run categorization_service-migration:revert-dev
```
##### Environment
```bash
npm run categorization_service-migration:revert
```

#### Create New Migration
##### Local Development
```bash
npm run categorization_service-migration:generate-dev -- -n ${YOUR_MIGRATION_NAME}
```

### Running The Service

```bash
# watch mode
npm run categorization_service-start:dev
```

### Swagger API
http://localhost:3000/api

### Docs

#### Responsibilities
* fetch data from aggregators
* parse websites of protocols
* fetch ABI and source code of contracts from explorers
* compare contracts based on ABI and source code

#### Technical Details
Categorization Tool Service uses Bull Queue based on Redis to process tasks. These are types of tasks which are currently supported:

* **fetch_protocols** - fetch protocols data from aggregators (defilama, vfat.tools, multifarm.fi)
* **parse_protocols_main_page** - parse protocols websites for app, docs, github links
* **parse_protocols_app_page** - parse app links for docs and github links
* **parse_protocols_docs_page** - parse docs links for contract addresses
* **parse_protocols_github_page** - fetch .vy and .sol files from github
* **crawl_html** - crawl html for app and docs links
* **fetch_abi** - fetch ABI and ABI Code for the contracts
* **analyse_contracts** - match contract ABI
* **analyse_contracts_against_templates** - match contract ABI

All the tasks are processed sequentially (it might be changed in the future). It is possible to trigger each individual task via API:
```bash
curl http://localhost:3000/command?command=$TASK_NAME -H "content-type:application/json"
```

To trigger executing all tasks in the described order use **start_fetching** as a name of the task (according to the diagram here: https://defiyield.atlassian.net/wiki/spaces/PD/pages/572260357/Categorization+Tool)

### Additional Notes

#### Select contracts analysis result
```sql
with filtered_contracts_analysis AS (
    select c1.abi,
           p1.name,
           c1.address,
           ca.abi_code_similarity,
           ca.abi_json_similarity,
           c2.address,
           p2.name,
           c2.abi,
           row_number()
           over (partition by right(c1.address::text, -1)::varbit # right(c2.address::text, -1)::varbit) as rn
    from contracts_analysis ca
             left join contracts c1 on ca.contract_id = c1.id
             left join protocols p1 on p1.id = c1.protocol_id
             left join contracts c2 on ca.counterpart_contract_id = c2.id
             left join protocols p2 on p2.id = c2.protocol_id
    order by ca.abi_code_similarity desc, ca.abi_json_similarity desc -- most similar ones come first
    -- limit 100 -- uncomment/update it if needed
)
select fca.*
from filtered_contracts_analysis fca
where fca.rn = 1;
```
