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
  [
    ChainIdEnum.arbi,
    new Map([
      [
        '0x7f90122bf0700f9e7e1f688fe926940e8839f353',
        {
          pool: '0x7f90122bf0700f9e7e1f688fe926940e8839f353',
          gauge: '0xbF7E49483881C76487b0989CD7d9A8239B20CA41',
          lp: '0x7f90122bf0700f9e7e1f688fe926940e8839f353',
          poolName: '2pool',
        },
      ],
      [
        '0x3E01dD8a5E1fb3481F0F589056b428Fc308AF0Fb',
        {
          pool: '0x3E01dD8a5E1fb3481F0F589056b428Fc308AF0Fb',
          gauge: '0xC2b1DF84112619D190193E48148000e3990Bf627',
          lp: '0x3E01dD8a5E1fb3481F0F589056b428Fc308AF0Fb',
          poolName: 'ren',
        },
      ],
    ]),
  ],
  [
    ChainIdEnum.opt,
    new Map([
      [
        '0x1337BedC9D22ecbe766dF105c9623922A27963EC',
        {
          pool: '0x1337BedC9D22ecbe766dF105c9623922A27963EC',
          gauge: '0x7f90122BF0700F9E7e1F688fe926940E8839F353',
          lp: '0x1337BedC9D22ecbe766dF105c9623922A27963EC',
          poolName: '2pool',
        },
      ],
    ]),
  ],
  [
    ChainIdEnum.harm,
    new Map([
      [
        '0xc5cfada84e902ad92dd40194f0883ad49639b023',
        {
          pool: '0xc5cfada84e902ad92dd40194f0883ad49639b023',
          gauge: '0xbf7e49483881c76487b0989cd7d9a8239b20ca41',
          lp: '0xc5cfada84e902ad92dd40194f0883ad49639b023',
          poolName: '3pool',
        },
      ],
      [
        '0x99e8ed28b97c7f1878776ed94ffc77cabfb9b726',
        {
          pool: '0x0e3dc2bcbfea84072a0c794b7653d3db364154e0',
          gauge: '0xf98450b5602fa59cc66e1379dffb6fddc724cfc4',
          lp: '0x99e8ed28b97c7f1878776ed94ffc77cabfb9b726',
          poolName: 'wtricrypto',
        },
      ],
    ]),
  ],
  [
    ChainIdEnum.gnosis,
    new Map([
      [
        '0x1337bedc9d22ecbe766df105c9623922a27963ec',
        {
          pool: '0x7f90122bf0700f9e7e1f688fe926940e8839f353',
          gauge: '0x78cf256256c8089d68cde634cf7cdefb39286470',
          lp: '0x1337bedc9d22ecbe766df105c9623922a27963ec',
          poolName: '3pool',
        },
      ],
    ]),
  ],
]);
