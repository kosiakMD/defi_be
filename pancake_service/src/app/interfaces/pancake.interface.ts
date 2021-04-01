export interface Pancake {
	id: string
  projectName: string
  reserveUSD: number
  fee24h: number
  APY: {
    day: number
    week: number
    month: number
  }
  IL: {
    day: number,
    dayUSD: number,
    week: number,
    weekUSD: number,
    month: number,
    monthUSD: number
  }
  tokens: {
    name: string
    percentage: number
  }[]
}