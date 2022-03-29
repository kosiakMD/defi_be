## Installation

```bash
$ npm install
```

## Backing Services

### Start Services
```bash
$ docker-compose -f apps/categorization_tool/docker-compose.yml up -d
```

### Stop Services
Add ```--volume``` option if you want to clean up the data.
```bash
$ docker-compose -f apps/categorization_tool/docker-compose.yml down
```

## DB migrations

### Migrations Up
```bash
$ npm run categorization_tool-migration:run
```

### Migration Down
```bash
$ npm run categorization_tool-migration:revert
```

### Create New Migration
```bash
$ npm run categorization_tool-migration:generate -- -n ${YOUR_MIGRATION_NAME}
```

## Running the app

```bash
# watch mode
$ npm run categorization_tool-start:dev
```

## API Usage

### Swagger API
http://localhost:3000/api

### CLI
#### Run fetching of data from all aggregators
```bash
curl -X POST http://localhost:3000/command --data '{"command":"start_fetching"}' -H "content-type:application/json"
```

#### Run crawling of html
```bash
curl -X POST http://localhost:3000/command --data '{"command":"crawl_html"}' -H "content-type:application/json"
```

#### Run fetching of ABI
```bash
curl -X POST http://localhost:3000/command --data '{"command":"fetch_abi"}' -H "content-type:application/json"
```
