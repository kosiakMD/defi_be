#!/bin/sh
sed '/"type": "module"/d' node_modules/@saberhq/solana-contrib/package.json -i
sed '/"type": "module"/d' node_modules/@saberhq/option-utils/package.json -i
