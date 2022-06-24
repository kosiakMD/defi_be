#!/bin/sh
sed -i.back '/"type": "module"/d' node_modules/@saberhq/solana-contrib/package.json 
sed -i.back '/"type": "module"/d' node_modules/@saberhq/option-utils/package.json 
