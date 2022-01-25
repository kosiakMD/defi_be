# DeFiYield

## Back-End common info:

### Develop process

#### Git Flow

The main branch is `develop`, please fork from it

Branch `master` is for tags only

master -> develop -> ...

[Docs](https://defiyield.atlassian.net/wiki/spaces/PD/pages/194641921/Git+Flow)

##### Branch naming convention

- <i>$user_name</i> - Git user name
- <i>$description</i> - a short descriptor of the task <b>OR</b> JIRA ticket number
- <i>$type</i> - type of work
  - <i><b>TypeEnum</b></i>: feature | bugfix | hotfix | config

branch_name = <i>$user_name</i> / <i>$type:<b>TypeEnum</b></i> / <i>$description</i>

example: `dart-wader/feature/create-Death-star`

example: `leia-organa/hotfix/rescue-humanoids-at-Alderaan`

example: `luck-skywalker/bugfix/destroy-Death-star`

## Services:

### API Gateway [link](./apps/api_gateway)

<b>Should be run the last one as it depends on all the rest</b>

### Account Service [link](./apps/account_service)

### Price Service [link](./apps/price_service)

<b>!Some of other services depend on this one!</b>

### Integration Service [link](./apps/integration_service)

## Install

### Node & npm

- Node v14.18.1
- npm 6.14.15

### Install dependencies

To run install of all services write

`npm install`

If prepare faze (should see message `husky - Git hooks installed`) wasn't done [do postinstall](#postinstall)

### Postinstall

`npx husky install`

### Update dependencies <i><small>(in rare cases)</small></i>

`npm run update`

### Build

`npm run build`

### Run

The best way is to run each service separately to see correct logs:

```
cd ./${service_folder_name}
npm start
```

start development mode `npm start:dev`

start development with watch mode `npm start:debug`

start production mode `npm start:prod`

<b>N.B! First service to run is <u>Price Service</u> because some of other services depend on it.</b>
<b><u>API Gateway Service</u> should be run the last one as it depends on all the rest</b>

## Development

### Coding conventions

We do Linting by using [ESLint](https://eslint.org/) linter with TS plugin and dependency on [Prettier](https://prettier.io/) rules

- `npm run lint` - run ESLint; could be run from the project root or service root pointwise;

- `npm run format` - apply Prettier [rules](/../.prettierrc) to `*.ts` files;
  could be run from the project root or service root pointwise;

### Migrations
We use TypeORM migrations in order to generate or create migrations by hand. If you want to create a migration: 
- Create a new entity or modify existing one. Be aware that entity should always have '.entity.ts' file format;
- Create a build for your particular service or entire project;
- `npm run migration:generate -- -n yourMigrationName` for generating new migration;

OR

- `npm run migration:create -- -n yourMigrationName` for creating a new empty migration;

- `npm run migration` - run migrations against your database;
- `npm run migration:revert` - revert your last migration;

All configurations can be found at <b>ormconfig.js</b> which is in the root directory.

### <span style='display:flex; '>Swagger <img src="https://static1.smartbear.co/swagger/media/assets/images/swagger_logo.svg" width='100'/></span>

We use OpenAPI documentation by [Swagger](https://swagger.io/)

- NestJS [Docs](https://docs.nestjs.com/openapi/introduction)

- Types and Parameters [Docs](https://docs.nestjs.com/openapi/types-and-parameters)

- package [Docs](https://www.npmjs.com/package/@nestjs/swagger)

### Test

Run test `npm run test`

Run Linter checking `npm run lint`

## Development

### Start project

We use different npm scripts to start the project locally. It's usually the same for all services: 
- `npm run ${serviceName}:${mode}` { serviceName: integration-start | lambda_vault-start, mode: dev | debug }

Examples:
- `npm run integration-start:dev`
- `npm run lambda_vault-start:debug`

### Coding conventions

We do Linting by using [ESLint](https://eslint.org/) linter with TS plugin and dependency on [Prettier](https://prettier.io/) rules

- `npm run lint` - run ESLint; could be run from the project root or service root pointwise;

- `npm run format` - apply Prettier [rules](/../.prettierrc) to `*.ts` files;
  could be run from the project root or service root pointwise;

### <span style='display:flex; '>Swagger <img src="https://static1.smartbear.co/swagger/media/assets/images/swagger_logo.svg" width='100'/></span>

We use OpenAPI documentation by [Swagger](https://swagger.io/)

- NestJS [Docs](https://docs.nestjs.com/openapi/introduction)

- Types and Parameters [Docs](https://docs.nestjs.com/openapi/types-and-parameters)

- package [Docs](https://www.npmjs.com/package/@nestjs/swagger)

### Test

Run test `npm run test`

Run Linter checking `npm run lint`


### Access Documentation

To get API documentation of each service need to run each service and get by link path `/api`, e.g. `localhost:3000/api`

### Docker Compose

To start backed with docker compose run (gateway: http://localhost:3000):

`[sudo] docker-compose up`

To start web with docker compose run (url: http://localhost:3333):

`[sudo] docker-compose -f docker-compose-web.yml up`

#### Troubleshooting

`.env` files should use next rules / values:

- hosts to access other services (instead of localhost):
  * `redis`
  * `price-service`
  * `account-service`
  * `integration-service`
- `SERVICE_HOST` should be empty
- next ports should be used:
  * `web`: 3000
  * `gateway-service`: 3001
  * `price-service`: 3002
  * `account-service`: 3003
  * `integration-service`: 3004

To clean up containers run:

`[sudo] docker-compose down --remove-orphans`