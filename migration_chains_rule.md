chain_id = 23 -> chain_id = 123. is_tracked = false;
`update assets_new set chain_id = 123, is_tracked = false where chain_id = 23;`

chain_id = 24 -> chain_id = 23;
`update assets_new set chain_id = 23 where chain_id = 24;`

chain_id = 27 -> chain_id = 24;
`update assets_new set chain_id = 24 where chain_id = 27;`

chain_id = 25 -> migrate cosmos assets;

chain_id = 26 -> migrate kava assets;

chain_id = 27 -> migrate osmosis assets;

chain_id = 28 -> migrate secret assets;
