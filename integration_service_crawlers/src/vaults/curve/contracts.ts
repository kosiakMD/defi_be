import { abis } from './abis'

export const busd = {
	gauge: {
		address: '0x69Fb7c45726cfE2baDeE8317005d3F94bE838840',
		abi: abis.gauge
	},
	swap: {
		address: '0x79a8C46DeA5aDa233ABaFFD40F3A0A2B1e5A4F27',
		abi: abis.swap
	},
	swapToken: {
		address: '0x3B3Ac5386837Dc563660FB6a0937DFAa5924333B',
		abi: abis.erc20CRV
	},
}

export const pax = {
	gauge: {
		address: '0x64E3C23bfc40722d3B649844055F1D51c1ac041d',
		abi: abis.gauge
	},
	swap: {
		address: '0x06364f10B501e868329afBc005b3492902d6C763',
		abi: abis.swapPAX
	},
	swapToken: {
		address: '0xD905e2eaeBe188fc92179b6350807D8bd91Db0D8',
		abi: abis.erc20
	},
}

export const usdt = {
	gauge: {
		address: '0xBC89cd85491d81C6AD2954E6d0362Ee29fCa8F53',
		abi: abis.gauge
	},
	swap: {
		address: '0x52EA46506B9CC5Ef470C5bf89f17Dc28bB35D85C',
		abi: abis.swapUSDT
	},
	swapToken: {
		address: '0x9fC689CCaDa600B6DF723D9E47D84d76664a1F23',
		abi: abis.erc20CRV
	},
}

export const compound = {
	gauge: {
		address: '0x7ca5b0a2910B33e9759DC7dDB0413949071D7575',
		abi: abis.gauge
	},
	swap: {
		address: '0xA2B47E3D5c44877cca798226B7B8118F9BFb7A56',
		abi: abis.swapCompound
	},
	swapToken: {
		address: '0x845838DF265Dcd2c412A1Dc9e959c7d08537f8a2',
		abi: abis.erc20CRV
	},
}

export const y = {
	gauge: {
		address: '0xFA712EE4788C042e2B7BB55E6cb8ec569C4530c1',
		abi: abis.gauge
	},
	swap: {
		address: '0x45F783CCE6B7FF23B2ab2D70e416cdb7D6055f51',
		abi: abis.swap
	},
	swapToken: {
		address: '0xdF5e0e81Dff6FAF3A7e52BA697820c5e32D806A8',
		abi: abis.erc20CRV
	},
}

export const ren = {
	gauge: {
		address: '0xB1F2cdeC61db658F091671F5f199635aEF202CAC',
		abi: abis.gauge
	},
	swap: {
		address: '0x93054188d876f558f4a66B2EF1d97d16eDf0895B',
		abi: abis.swapREN
	},
	swapToken: {
		address: '0x49849C98ae39Fff122806C06791Fa73784FB3675',
		abi: abis.erc20CRV
	},
}

export const pool3 = {
	gauge: {
		address: '0xbFcF63294aD7105dEa65aA58F8AE5BE2D9d0952A',
		abi: abis.gauge
	},
	swap: {
		address: '0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7',
		abi: abis.swap3pool
	},
	swapToken: {
		address: '0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490',
		abi: abis.erc20CRV
	},
}

export const sbtc = {
	gauge: {
		address: '0x705350c4BcD35c9441419DdD5d2f097d7a55410F',
		abi: abis.gauge
	},
	swap: {
		address: '0x7fC77b5c7614E1533320Ea6DDc2Eb61fa00A9714',
		abi: abis.swapSBTC
	},
	swapToken: {
		address: '0x075b1bb99792c9E1041bA13afEf80C91a1e70fB3',
		abi: abis.erc20CRV
	},
}

export const hbtc = {
	gauge: {
		address: '0x4c18E409Dc8619bFb6a1cB56D114C3f592E0aE79',
		abi: abis.gauge
	},
	swap: {
		address: '0x4CA9b3063Ec5866A4B82E437059D2C43d1be596F',
		abi: abis.swapHBTC
	},
	swapToken: {
		address: '0xb19059ebb43466C323583928285a49f558E572Fd',
		abi: abis.erc20CRV
	},
}

export const susdv2 = {
	gauge: {
		address: '0xA90996896660DEcC6E997655E065b23788857849',
		abi: abis.gauge
	},
	swap: {
		address: '0xA5407eAE9Ba41422680e2e00537571bcC53efBfD',
		abi: abis.swapSUSD
	},
	swapToken: {
		address: '0xC25a3A3b969415c80451098fa907EC722572917F',
		abi: abis.erc20CRV
	},
	reward: {
		address: '0xDCB6A51eA3CA5d3Fd898Fd6564757c7aAeC3ca92',
		abi: abis.rewardSUSD
	}
}

export const gusd = {
	gauge: {
		address: '0xC5cfaDA84E902aD92DD40194f0883ad49639b023',
		abi: abis.gauge
	},
	swap: {
		address: '0x4f062658EaAF2C1ccf8C8e36D6824CDf41167956',
		abi: abis.swapGUSD
	},
	swapToken: {
		address: '0xD2967f45c4f384DEEa880F807Be904762a3DeA07',
		abi: abis.erc20CRV
	},
}

export const husd = {
	gauge: {
		address: '0x2db0E83599a91b508Ac268a6197b8B14F5e72840',
		abi: abis.gauge
	},
	swap: {
		address: '0x3eF6A01A0f81D6046290f3e2A8c5b843e738E604',
		abi: abis.swapHUSD
	},
	swapToken: {
		address: '0x5B5CFE992AdAC0C9D48E05854B2d91C73a003858',
		abi: abis.erc20CRV
	},
}

export const usdk = {
	gauge: {
		address: '0xC2b1DF84112619D190193E48148000e3990Bf627',
		abi: abis.gauge
	},
	swap: {
		address: '0x3E01dD8a5E1fb3481F0F589056b428Fc308AF0Fb',
		abi: abis.swapUSDK
	},
	swapToken: {
		address: '0x97E2768e8E73511cA874545DC5Ff8067eB19B787',
		abi: abis.erc20CRV
	},
}

export const usdn = {
	gauge: {
		address: '0xF98450B5602fa59CC66e1379DFfB6FDDc724CfC4',
		abi: abis.gauge
	},
	swap: {
		address: '0x0f9cb53Ebe405d49A0bbdBD291A65Ff571bC83e1',
		abi: abis.swapUSDN
	},
	swapToken: {
		address: '0x4f3E8F405CF5aFC05D68142F3783bDfE13811522',
		abi: abis.erc20CRV
	},
}

export const musd = {
	gauge: {
		address: '0x5f626c30EC1215f4EdCc9982265E8b1F411D1352',
		abi: abis.gauge
	},
	swap: {
		address: '0x8474DdbE98F5aA3179B3B3F5942D724aFcdec9f6',
		abi: abis.swapMUSD
	},
	swapToken: {
		address: '0x1AEf73d49Dedc4b1778d0706583995958Dc862e6',
		abi: abis.erc20CRV
	},
	reward: {
		address: '0xE6E6E25EfdA5F69687aA9914f8d750C523A1D261',
		abi: abis.rewardSUSD
	},
}

export const multicall = {
	address: '0xeefBa1e63905eF1D7ACbA5a8513c70307C1cE441',
	abi: abis.multicall
}

export const controller = {
	address: '0x2F50D538606Fa9EDD2B11E2446BEb18C9D5846bB',
}

export const rsv = {
	gauge: {
		address: '0x4dC4A289a8E33600D8bD4cf5F6313E43a37adec7',
		abi: abis.gauge
	},
	swap: {
		address: '0xC18cC39da8b11dA8c3541C598eE022258F9744da',
		abi: abis.swapMUSD
	},
	swapToken: {
		address: '0xC2Ee6b0334C261ED60C72f6054450b61B8f18E35',
		abi: abis.erc20CRV
	},
	reward: {
		address: '0xAD4768F408dD170e62E074188D81A29AE31B8Fd8',
		abi: abis.rewardSUSD
	},
}

export const dusd = {
	gauge: {
		address: '0xAEA6c312f4b3E04D752946d329693F7293bC2e6D',
		abi: abis.gauge
	},
	swap: {
		address: '0x8038C01A0390a8c547446a0b2c18fc9aEFEcc10c',
		abi: abis.swapDUSD
	},
	swapToken: {
		address: '0x3a664Ab939FD8482048609f652f9a0B0677337B9',
		abi: abis.erc20CRV
	},
	reward: {
		address: '0xd9Acb0BAeeD77C99305017821167674Cc7e82f7a',
		abi: abis.rewardSUSD
	}
}

export const tbtc = {
	gauge: {
		address: '0x6828bcF74279eE32f2723eC536c22c51Eed383C6',
		abi: abis.gauge
	},
	swap: {
		address: '0xC25099792E9349C7DD09759744ea681C7de2cb66',
		abi: abis.swapTBTC
	},
	swapToken: {
		address: '0x64eda51d3Ad40D56b9dFc5554E06F94e1Dd786Fd',
		abi: abis.erc20CRV
	},
	reward: {
		address: '0xAF379f0228ad0d46bB7B4f38f9dc9bCC1ad0360c',
		abi: abis.rewardSUSD
	}
}

export const poolInfo = {
	compound: {
		swap: compound.swap.address,
		swapToken: compound.swapToken.address,
		name: 'compound',
		gauge: compound.gauge.address,
	},
	usdt: {
		swap: usdt.swap.address,
		swapToken: usdt.swapToken.address,
		name: 'usdt',
		gauge: usdt.gauge.address,
	},
	y: {
		swap: y.swap.address,
		swapToken: y.swapToken.address,
		name: 'y',
		gauge: y.gauge.address,
	},
	busd: {
		swap: busd.swap.address,
		swapToken: busd.swapToken.address,
		name: 'busd',
		gauge: busd.gauge.address,
	},
	susdv2: {
		swap: susdv2.swap.address,
		swapToken: susdv2.swapToken.address,
		name: 'susdv2',
		gauge: susdv2.gauge.address,
	},
	pax: {
		swap: pax.swap.address,
		swapToken: pax.swapToken.address,
		name: 'pax',
		gauge: pax.gauge.address,
	},
	ren: {
		swap: ren.swap.address,
		swapToken: ren.swapToken.address,
		name: 'ren',
		gauge: ren.gauge.address,
	},
	sbtc: {
		swap: sbtc.swap.address,
		swapToken: sbtc.swapToken.address,
		name: 'sbtc',
		gauge: sbtc.gauge.address,
	},
	hbtc: {
		swap: hbtc.swap.address,
		swapToken: hbtc.swapToken.address,
		name: 'hbtc',
		gauge: hbtc.gauge.address,
	},
	"3pool": {
		swap: pool3.swap.address,
		swapToken: pool3.swapToken.address,
		name: '3pool',
		gauge: pool3.gauge.address,
	},
	gusd: {
		swap: gusd.swap.address,
		swapToken: gusd.swapToken.address,
		name: 'gusd',
		gauge: gusd.gauge.address,
	},
	husd: {
		swap: husd.swap.address,
		swapToken: husd.swapToken.address,
		name: 'husd',
		gauge: husd.gauge.address,
	},
	usdk: {
		swap: usdk.swap.address,
		swapToken: usdk.swapToken.address,
		name: 'usdk',
		gauge: usdk.gauge.address,
	},
	usdn: {
		swap: usdn.swap.address,
		swapToken: usdn.swapToken.address,
		name: 'usdn',
		gauge: usdn.gauge.address,
	},
	musd: {
		swap: musd.swap.address,
		swapToken: musd.swapToken.address,
		name: 'musd',
		gauge: musd.gauge.address,
	},
	rsv: {
		swap: rsv.swap.address,
		swapToken: rsv.swapToken.address,
		name: 'rsv',
		gauge: rsv.gauge.address,
	},
	tbtc: {
		swap: tbtc.swap.address,
		swapToken: tbtc.swapToken.address,
		name: 'tbtc',
		gauge: tbtc.gauge.address,
	},
	dusd: {
		swap: dusd.swap.address,
		swapToken: dusd.swapToken.address,
		name: 'dusd',
		gauge: dusd.gauge.address,
	},
}

export const decodedGauges = [
	compound.gauge.address,
	usdt.gauge.address,
	y.gauge.address,
	busd.gauge.address,
	pax.gauge.address,
	ren.gauge.address,
	susdv2.gauge.address,
	sbtc.gauge.address,
	hbtc.gauge.address,
	pool3.gauge.address,
	gusd.gauge.address,
	husd.gauge.address,
	usdk.gauge.address,
	usdn.gauge.address,
	musd.gauge.address,
	rsv.gauge.address,
	tbtc.gauge.address,
	dusd.gauge.address,
]
