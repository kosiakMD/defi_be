import { ChainIdEnum } from '../../enum';
import { Address } from '../../types';

// https://docs.abracadabra.money/our-ecosystem/our-contracts
export const Cauldrons: Map<ChainIdEnum, Address[]> = new Map([
  [
    ChainIdEnum.ftm,
    [
      '0x8E45Af6743422e488aFAcDad842cE75A09eaEd34',
      '0xd4357d43545F793101b592bACaB89943DC89d11b',
      '0xed745b045f9495B8bfC7b58eeA8E0d0597884e12',
    ],
  ],
  [
    ChainIdEnum.eth,
    [
      '0x7b7473a76d6ae86ce19f7352a1e89f6c9dc39020',
      '0x05500e2ee779329698df35760bedcaac046e7c27',
      '0x003d5a75d284824af736df51933be522de9eed0f',
      '0x98a84eff6e008c5ed0289655ccdca899bcb6b99f',
      '0xebfde87310dc22404d918058faa4d56dc4e93f0a',
      '0x0bca8ebcb26502b013493bf8fe53aa2b1ed401c1',
      '0x920d9bd936da4eafb5e25c6bdc9f6cb528953f9f',
      //   '0x4eaed76c3a388f4a841e9c765560bbe7b3e4b3a0',
      '0x252dcf1b621cc53bc22c256255d2be5c8c32eae4',
      //   '0x35a0dd182e4bca59d5931eae13d0a2332fa30321',
      '0xc1879bf24917ebe531fbaa20b0d05da027b592ce',
      '0x9617b633ef905860d919b88e1d9d9a6191795341',
      '0xcfc571f3203756319c231d3bc643cee807e74636',
      '0x3410297d89dcdaf4072b805efc1ef701bb3dd9bf',
      '0x59e9082e068ddb27fc5ef1690f9a9f22b32e573f',
      //   '0x257101f20cb7243e2c7129773ed5dbbcef8b34e0',
      '0x390db10e65b5ab920c19149c919d970ad9d18a41',
      '0x5ec47ee69bede0b6c2a2fc0d9d094df16c192498',
      // Below Here are deprecated
      '0x6cbAFEE1FaB76cA5B5e144c43B3B50d42b7C8c8f',
      '0x551a7CfF4de931F32893c928bBc3D25bF1Fc5147',
      '0x6Ff9061bB8f97d948942cEF376d98b51fA38B91f',
      '0xbb02A884621FB8F5BFd263A67F58B65df5b090f3',
      '0xC319EEa1e792577C319723b5e60a15dA3857E7da',
      '0xFFbF4892822e0d552CFF317F65e1eE7b5D3d9aE6',
      //   '0x806e16ec797c69afa8590A55723CE4CC1b54050E',
      //   '0x6371EfE5CD6e3d2d7C477935b7669401143b7985',
      '0xbc36fde44a7fd8f545d459452ef9539d7a14dd63',
    ],
  ],
  [
    ChainIdEnum.avax,
    [
      '0x3CFEd0439aB822530b1fFBd19536d897EF30D2a2',
      '0x3b63f81Ad1fc724E44330b4cf5b5B6e355AD964B',
      '0x95cCe62C3eCD9A33090bBf8a9eAC50b699B54210',
      '0x35fA7A723B3B39f15623Ff1Eb26D8701E7D6bB21',
      '0x0a1e6a80E93e62Bd0D3D3BFcF4c362C40FB1cF3D',
      '0x2450Bf8e625e98e14884355205af6F97E3E68d07',
      '0xAcc6821d0F368b02d223158F8aDA4824dA9f28E3',
      // Below Here are Depercated
      '0x56984F04d2d04B2F63403f0EbeDD3487716bA49d',
    ],
  ],
  [
    ChainIdEnum.arbi,
    [
      '0xC89958B03A55B5de2221aCB25B58B89A000215E6', //
    ],
  ],
  [
    ChainIdEnum.bnb,
    [
      '0xF8049467F3A9D50176f4816b20cDdd9bB8a93319', //
      '0x692CF15F80415D83E8c0e139cAbcDA67fcc12C90',
    ],
  ],
]);
