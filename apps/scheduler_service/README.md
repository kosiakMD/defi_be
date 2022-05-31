# Scheduler Service

## Table Of Contents

1. [Installation](#Installation)
2. [Running The Service](#Running-The-Service)
3. [Swagger API](#Swagger-API)

### Installation

```bash
yarn install
yarn scheduler-build
```

### Running The Service

```bash
# watch mode
yarn scheduler-start:dev
```

### Swagger API

[Swagger](http://localhost:3007/api)

### TODO/Ideas

- create search endpoint capable to look up task by method+endpoint so that other services can easily find the ID if the correct task to update/pause/delete/add
- make endpoint+method unique?
- validation if {id} in URL doesn't exist
- history table of success/failures
  - automatic slack notifications after X failures
  - automatic disable after X failures
