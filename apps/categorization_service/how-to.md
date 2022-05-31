# Categorization Service: How To

## Table Of Contents

1. [Swagger API](#Swagger-API)
2. [Contracts Analysing](#Contracts-Analysing)
3. [Queue Management](#Queue-Management)
4. [Commands](#Commands)

### Swagger API

- localhost - http://localhost:3000/api
- dev - https://devcategorization.defiyield.app/api/

### Contracts Analysing

1. Find similar contracts
   Use this API: https://devcategorization.defiyield.app/api/#/Categorization%20Tool%20Service/AppController_getSimilarContracts

- address - contract address you want to fetch similar contracts for
- minRate - minimum number of rate similarity from 0 to 1
  If you don't receive any results most likely the contract is not in the database. To add the contract and analyze it use the second request

2. Add contract to analyse by comparing to all existing ones
   Use this API: https://devcategorization.defiyield.app/api/#/Categorization%20Tool%20Service/AppController_contractAnalyse

- address - contract address you want to add and analyse
  Note: analysing of the contract is done asynchronously, so you should wait a bit to get results. If you want to check active job and jobs which are in the queue please use the following API: https://devcategorization.defiyield.app/api/#/Common/StatusController_status.

### Queue Management

API: https://devcategorization.defiyield.app/api/#/Queue%20Management

1. Clean-up the queue
   You can remove tasks from the queue by the status, see the API: https://devcategorization.defiyield.app/api/#/Queue%20Management/QueueManagementController_cleanQueue
2. Abort the task
   Some tasks can be aborted. To abort the task use this API: https://devcategorization.defiyield.app/api/#/Queue%20Management/QueueManagementController_abortActiveTask

### Commands

The functioning of the service is based on tasks. So there is API which allows to run those task individually if needed. But generally all required tasks are run on daily basis and there is no need to run them manually.
