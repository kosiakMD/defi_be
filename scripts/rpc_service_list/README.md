## RPC DB migration script
Create or edit json file `rpclist.json`.
#### Format JSON:
```json
[
  {
    "chain_id": 1,
    "endpoints": [
      {
        "endpoint": "https://rpc.chain1.url1",
        "priority": 10,
        "is_enabled": true
      },
      {
        "endpoint": "https://rpc.chain1.url2",
        "priority": 5
      }
    ]
  },
  {
    "chain_id": 2,
    "endpoints": [
      {
        "endpoint": "https://rpc.chain2.url"
      }
    ]
  }
]
```
You can skip parameters `priority` and `is_enabled`. It will be set to the default values (`priority=7`, `is_enabled=true`).

#### Environments
Create `.env` file with variables or set all env with parameters for run script:
`DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD, DB_DATABASE, JSON_FILE`

`JSON_FILE` it's filename with JSON data.<br />
`DB_*` it's PostgresSQL parameters.

### Run migration command:
#### Use docker:
```shell
docker run -it --rm --name postgre \
 -v "$PWD":/usr/src/myapp -w /usr/src/myapp \
 -e DB_HOST="xxxxxx.rds.amazonaws.com" \
 -e DB_PORT="5432" \
 -e DB_USERNAME="username" \
 -e DB_PASSWORD="password" \
 -e DB_DATABASE="rpc" \
 -e JSON_FILE="rpc_list.json" \
 python:3.10.4 sh -c "pip install -q psycopg2 && python rpc_service_list.py"
```