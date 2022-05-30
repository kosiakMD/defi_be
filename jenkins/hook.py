#!/usr/bin/env python
#How to use script:
#python hook.py price development 2bd9439 master
#Where:
##price - name of service to build
##development - eviroment where to build
##2bd9439 docker container tag
##master - branch for template/values
import requests
import json
import sys

url = "https://spinnaker-api.defyield.xyz/webhooks/webhook/"+sys.argv[1]

payload = json.dumps({
  "parameters": {
    "environment": sys.argv[2],
    "namespace": "defiyield",
    "replicas": sys.argv[5],
    "revision": sys.argv[3],
    "template_branch": sys.argv[4],
    "template_version": sys.argv[6]
  }
})
headers = {
  'Content-Type': 'application/json'
}

response = requests.request("POST", url, headers=headers, data=payload)

print(response.text)
