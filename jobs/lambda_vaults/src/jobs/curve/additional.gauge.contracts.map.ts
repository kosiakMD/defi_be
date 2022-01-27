import { ChainIdEnum } from '@app/common';

export const additionalGaugeContractsMap = new Map([
  [
    ChainIdEnum.ftm,
    new Map([
      [
        '0xdf38ec60c0ec001142a33eaa039e49e9b84e64ed',
        {
          pool: '0x4fc8d635c3cb1d0aa123859e2b2587d0ff2707b1',
          gauge: '0xdee85272eae1ab4afbc6433f4d819babc9c7045a',
          lp: '0xdf38ec60c0ec001142a33eaa039e49e9b84e64ed',
          poolName: 'ironbank',
        },
      ],
      [
        ' 0xd02a30d33153877bc20e5721ee53dedee0422b2f',
        {
          pool: '0x0fa949783947bf6c1b171db13aeacbb488845b3f',
          gauge: '0xd4f94d0aaa640bbb72b5eec2d85f6d114d81a88e',
          lp: '0xd02a30d33153877bc20e5721ee53dedee0422b2f',
          poolName: 'geist',
        },
      ],
    ]),
  ],
  [
    ChainIdEnum.plg,
    new Map([
      [
        '0x8096ac61db23291252574d49f036f0f9ed8ab390',
        {
          pool: '0x751b1e21756bdbc307cbcc5085c042a0e9aaef36',
          gauge: '0xb0a366b987d77b5ed5803cbd95c80bb6deab48c0',
          lp: '0x8096ac61db23291252574d49f036f0f9ed8ab390',
          poolName: 'atricrypto',
        },
      ],
      [
        '0xbece5d20a8a104c54183cc316c8286e3f00ffc71',
        {
          pool: '0x92577943c7ac4accb35288ab2cc84d75fec330af',
          gauge: '0x9bd996db02b3f271c6533235d452a56bc2cd195a',
          lp: '0xbece5d20a8a104c54183cc316c8286e3f00ffc71',
          poolName: 'atrictypto2',
        },
      ],
      [
        '0xf8a57c1d3b9629b77b6726a042ca48990a84fb49',
        {
          pool: '0xc2d95eef97ec6c17551d45e77b590dc1f9117c67',
          gauge: '0xffbacce0cc7c19d46132f1258fc16cf6871d153c',
          lp: '0xf8a57c1d3b9629b77b6726a042ca48990a84fb49',
          poolName: 'ren',
        },
      ],
    ]),
  ],
]);
