# Assets Service

## Table Of Contents
1. [Installation](#Installation)
2. [DB migrations](#DB-migrations)
3. [Running The Service](#Running-The-Service)
4. [Swagger API](#Swagger-API)
5. [Docs](#Docs)

### Installation

```bash
yarn install
yarn assets-build
```

### DB migrations

#### Migrations Up
##### Local Development
```bash
npm run assets-migration:run-dev
```
##### Environment
```bash
npm run assets-migration:run
```

#### Migration Down
##### Local Development
```bash
npm run assets-migration:revert-dev
```
##### Environment
```bash
npm run assets-migration:revert
```

#### Create New Migration
##### Local Development
```bash
npm run assets-migration:generate-dev -- -n ${YOUR_MIGRATION_NAME}
```

### Running The Service

```bash
# watch mode
npm run assets-start:dev
```

### Swagger API
http://localhost:3000/api

### Docs
