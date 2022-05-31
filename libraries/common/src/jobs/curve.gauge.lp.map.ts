// TODO: will be removed later
export const nonRegisterGaugeLpDataMap = new Map<string, LpData>([
  [
    '0x3a283d9c08e8b55966afb64c515f5143cf907611',
    {
      pool: '0xb576491f1e6e5e62f1d8f26062ee822b40b0e0d4',
      gauge: '0x7e1444ba99dcdffe8fbdb42c02f0005d14f13be1',
    },
  ],
  [
    '0x6ba5b4e438fa0aaf7c1bd179285af65d13bd3d90',
    {
      pool: '0x618788357d0ebd8a37e763adab3bc575d54c2c7d',
      gauge: '0x66ec719045bbd62db5ebb11184c18237d3cc2e62',
    },
  ],
  [
    '0x09f4b84a87fc81fc84220fd7287b613b8a9d4c05',
    {
      pool: '0x83f252f036761a1e3d10daca8e16d7b21e3744d7',
      gauge: '0xd69ac8d9d25e99446171b5d0b3e4234dad294890',
    },
  ],
  [
    '0x571ff5b7b346f706aa48d696a9a4a288e9bb4091',
    {
      pool: '0x8925d9d9b4569d737a48499def3f67baa5a144b9',
      gauge: '0x8101e6760130be2c8ace79643ab73500571b7162',
    },
  ],
  [
    '0x86a91b50af95ff1d9d53ca1e4963ef06d8b31369',
    {
      pool: '0x36965b1a6b97c1b33416e5d53fb5621ade1f1e80',
      gauge: '0x174baa6b56ffe479b604cc20f22d09ad74f1ca49',
    },
  ],
  [
    '0xed4064f376cb8d68f770fb1ff088a3d0f3ff5c4d',
    {
      pool: '0x8301ae4fc9c624d1d396cbdaa1ed877821d7c511',
      gauge: '0x1cebdb0856dd985fae9b8fea2262469360b8a3a6',
    },
  ],
]);

export interface LpData {
  gauge: string;
  coins?: number;
  pool?: string;
}
