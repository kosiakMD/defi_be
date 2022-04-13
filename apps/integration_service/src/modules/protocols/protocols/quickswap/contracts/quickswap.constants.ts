export const QUICKSWAP_REWARDS_TOKEN_ADDRESS = '0x831753dd7087cac61ab5644b308642cc1c33dc13';

export const QUICKSWAP_REWARDS_DUAL_TOKEN_ADDRESS = [
  '0xf28164a485b0b2c90639e47b0f377b4a438a16b1', // token A
  '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270', // token B
];

export const QUICKSWAP_ADDITIONAL_PAIRS = ['0x16041694941a5ae759e91a3bb7dde5b4f4312104'];

const lowerContractAddresses = ({ stakingContractAddress, pairAddress }) => ({
  stakingContractAddress: stakingContractAddress.toLowerCase(),
  pairAddress: pairAddress.toLowerCase(),
});

export const QUICKSWAP_STAKING_DUAL_CONTRACTS = [
  {
    stakingContractAddress: '0x14977e7E263FF79c4c3159F497D9551fbE769625',
    pairAddress: '0x6e7a5fafcec6bb1e78bae2a1f0b612012bf14827',
  },
].map(lowerContractAddresses);

export const QUICKSWAP_STAKING_CONTRACTS = [
  {
    stakingContractAddress: '0x8d6b2dBa9e85b897Dc97eD262C1aa3e4D76477dF',
    pairAddress: '0x4a35582a710e1f4b2030a3f826da20bfb6703c09',
  },
  {
    stakingContractAddress: '0x45a5CB25F3E3bFEe615F6da0731740093F59b768',
    pairAddress: '0xf6422b997c7f54d1c6a6e103bcb1499eea0a7046',
  },
  {
    stakingContractAddress: '0xbB703E95348424FF9e94fbE4FB524f6d280331B8',
    pairAddress: '0x853ee4b2a13f8a742d64c8f088be7ba2131f670d',
  },
  {
    stakingContractAddress: '0xAFB76771C98351Aa7fCA13B130c9972181612b54',
    pairAddress: '0x2cf7252e74036d1da831d11089d326296e64a728',
  },
  {
    stakingContractAddress: '0x8ff56b5325446aae6efbf006a4c1d88e4935a914',
    pairAddress: '0xadbf1854e5883eb8aa7baf50705338739e558e5b',
  },
  {
    stakingContractAddress: '0x7ca29f0db5db8b88b332aa1d67a2e89dfec85e7e',
    pairAddress: '0x019ba0325f1988213d448b3472fa1cf8d07618d7',
  },
  {
    stakingContractAddress: '0x070d182eb7e9c3972664c959ce58c5fc6219a7ad',
    pairAddress: '0xdc9232e2df177d7a12fdff6ecbab114e2231198d',
  },
  {
    stakingContractAddress: '0x573bb5ccc26222d8108edacfcc7f7cb9e388af10',
    pairAddress: '0x90bc3e68ba8393a3bf2d79309365089975341a43',
  },
  {
    stakingContractAddress: '0xd1c762861aae85df2e586a668a793aaff820932b',
    pairAddress: '0x1bd06b96dd42ada85fdd0795f3b4a79db914add5',
  },
  {
    stakingContractAddress: '0x5ce139242c77fc31479e5329626fef736ac8cebe',
    pairAddress: '0x10062ec62c0be26cc9e2f50a1cf784a89ded075f',
  },
  {
    stakingContractAddress: '0xf036557fdd98485d34ae8b7d8111de2624aead1f',
    pairAddress: '0xe89fae1b4ada2c869f05a0c96c87022dadc7709a',
  },
  {
    stakingContractAddress: '0xb47f7120a57381c217e4d6f3a79f066bfaae6c93',
    pairAddress: '0x8c1b40ea78081b70f661c3286c74e71b4602c9c0',
  },
  {
    stakingContractAddress: '0xbfbecaf31f6aa873660d5b7c98fd8cbd542cc0fd',
    pairAddress: '0x74214f5d8aa71b8dc921d8a963a1ba3605050781',
  },
  {
    stakingContractAddress: '0x97d69e23df7bbb01f9ea78b5651cb6ad125d6d9a',
    pairAddress: '0x5ca6ca6c3709e1e6cfe74a50cf6b2b6ba2dadd67',
  },
  {
    stakingContractAddress: '0x89666405fe76bac78379938ef280739a815c1437',
    pairAddress: '0x30167fea9499c11795bfd104667240bdac939d3a',
  },
  {
    stakingContractAddress: '0x8f2ac4ec8982bf1699a6eed696e204fa2ccd5d91',
    pairAddress: '0xf6a637525402643b0654a54bead2cb9a83c8b498',
  },
  {
    stakingContractAddress: '0x9bb7c0a778676689e86602d905c4013221acc7c6',
    pairAddress: '0xf7135272a5584eb116f5a77425118a8b4a2ddfdb',
  },
  {
    stakingContractAddress: '0x5c1186f784a4fefd53dc40c492b02deed97e7944',
    pairAddress: '0x5ef8747d1dc4839e92283794a10d448357973ac0',
  },
  {
    stakingContractAddress: '0xdeb69421fc2fba0c3b4f8b1ae291029f7cca344e',
    pairAddress: '0x253d637068fbf11b18d0f2a1bf3b167d37802687',
  },
  {
    stakingContractAddress: '0x8cfad56eb742ba8caea813e47779e9c38f27ca6e',
    pairAddress: '0x1f1e4c845183ef6d50e9609f16f6f9cae43bc9cb',
  },
  {
    stakingContractAddress: '0x695886a14d48a916fe10a84b3c8f5d9fbf33d7f4',
    pairAddress: '0xad431d0bde99e21d9848691615a0756a09ed3dce',
  },
  {
    stakingContractAddress: '0xd7b606ac407652fdb4bf7a7f17987c24047631ba',
    pairAddress: '0x7ca8e540df6326005b72661e50f1350c84c0e55d',
  },
  {
    stakingContractAddress: '0x9f37ef37818b3b81cd8600d602dc5d8df7b9e3e4',
    pairAddress: '0x62052b489cb5bc72a9dc8eeae4b24fd50639921a',
  },
  {
    stakingContractAddress: '0x7ec53d48808fc741917d7d2146ea94b21ced90c8',
    pairAddress: '0x29429e4099ed88884729b8fa800b9c65dbe57b63',
  },
  {
    stakingContractAddress: '0x7110e7024b72b98ba245538ded099a659351ebd7',
    pairAddress: '0x15551bedc20b01b473da93e6cfa29b1eb7baeabb',
  },
  {
    stakingContractAddress: '0xa8be0f0a7e432d5b12e3f84117da74ebe3da7c59',
    pairAddress: '0xe4139dbf19e9c8d880f915711c8674022979d432',
  },
  {
    stakingContractAddress: '0x2b3b9f20b56a8ca413081af69c6eb37dc3aeb868',
    pairAddress: '0xe169a660d720917b4fb7e95f045b6f60a64eb10a',
  },
  {
    stakingContractAddress: '0xe1fe89651932d84e7880651187547869ca524976',
    pairAddress: '0xdfa81e266ff54a7d9d26c5083f9631e685d833d7',
  },
  {
    stakingContractAddress: '0xcba63630bdae39f28814dff40d535dbc4ff083e4',
    pairAddress: '0xc52f4e49c7fb3ffceb48ad06c3f3a17ad5c0dbfe',
  },
  {
    stakingContractAddress: '0xde571d6ee61a9ce8358b9cf011452ff5290acc21',
    pairAddress: '0xbedee6a7c572aa855a0c84d2f504311d482862f4',
  },
  {
    stakingContractAddress: '0x4e2d84aa0d38b59655f1d3d6c1e67723bf2bfcad',
    pairAddress: '0xb61fbe5aac9e91c16f477c8505cf21fb919048f6',
  },
  {
    stakingContractAddress: '0xa5d7a868a596289feafb36cabc50e84a8f13750f',
    pairAddress: '0x85ba262be13329a2db5acf9aa46ac2345b5df4ff',
  },
  {
    stakingContractAddress: '0x2ddc1cabfcbbe4768fb198059f02ed9a0a99a6c3',
    pairAddress: '0x5f98d4150e299df500c2a9463c66985025494e63',
  },
  {
    stakingContractAddress: '0x6668241bb8d34731f6dd8eb4c83ce819b5990b2d',
    pairAddress: '0x5a25c9e27097ebac600ed1df3f31441272af9d38',
  },
  {
    stakingContractAddress: '0x0e5a923524fc0a14fa4ab108145e4a019d2f2c6a',
    pairAddress: '0x592d8faea9e740facbd6115abd92d2e6acb2f8f1',
  },
  {
    stakingContractAddress: '0x8b20fb818ead157c18ea297f06726588b04e2980',
    pairAddress: '0x5701026955d90e9d9ea79eba2cc70596a6a7accd',
  },
  {
    stakingContractAddress: '0x79d6fb23cd4667331c17c564357be8a705eb6bcd',
    pairAddress: '0x4f76de0543f06b7879ebf5c2908cefc478e29fa2',
  },
  {
    stakingContractAddress: '0x4d756a5e49a2b4cafba6c3e615e1e22189ddb0ba',
    pairAddress: '0xfd0e242c95b271844bf6860d4bc0e3e136bc0f7c',
  },
  {
    stakingContractAddress: '0x219ab685344518c60efb399a039ebc73cc4f1471',
    pairAddress: '0xfcb980cfd282027b7a0544802a03b8af63ee9cc4',
  },
  {
    stakingContractAddress: '0x5dd915407a2aa5dfa4fb9309dfec717646bb8ce1',
    pairAddress: '0xca8e44fdf749a7c5c28bc927726ea21ccd669969',
  },
  {
    stakingContractAddress: '0x77eb20d5eb77b6ba543734d903fe1259d551cbd3',
    pairAddress: '0x9e2b254c7d6ad24afb334a75ce21e216a9aa25fc',
  },
  {
    stakingContractAddress: '0x1ddf6be5b3c6fe04e5161701e2753b28bbf85dc2',
    pairAddress: '0x87d68f797623590e45982ad0f21228557207fdda',
  },
  {
    stakingContractAddress: '0x270be4f2b283496c761f6eba7165028c41d6b769',
    pairAddress: '0x7805b64e2d99412d3b8f10dfe8fc55217c5cc954',
  },
  {
    stakingContractAddress: '0xf42405d54c8f443126ac06a47b5023bbfc7a85d3',
    pairAddress: '0x66ff795535cf162d29f6b15ed546a3e148eff0fb',
  },
  {
    stakingContractAddress: '0x5191c8391db53f409b8170fac88d517ace1edee4',
    pairAddress: '0x604229c960e5cacf2aaeac8be68ac07ba9df81c3',
  },
  {
    stakingContractAddress: '0xcc4ad7131f02974d408a6bcad26e09d790a68dd7',
    pairAddress: '0x23e93ce78d7fb5287e4b6a8d91403bc5e7ac845a',
  },
  {
    stakingContractAddress: '0x6554ac50164be2fbb5cea44f5042afc5f533d5a5',
    pairAddress: '0x222789b185a145ccbd19803a448143252612d012',
  },
  {
    stakingContractAddress: '0x4326c97b0c3f8e4247365fcaaeb2110d4ead7f17',
    pairAddress: '0x1c75bd54ad15449d12e6c24a9b5e8ce1a62c567c',
  },
  {
    stakingContractAddress: '0xed8413ecec87c3d4664975743c02db3b574012a7',
    pairAddress: '0xf04adbf75cdfc5ed26eea4bbbb991db002036bdd',
  },
  {
    stakingContractAddress: '0x02e33e4713cf231d4b7a9894de3f075a16e19201',
    pairAddress: '0xeb477ae74774b697b5d515ef8ca09e24fee413b5',
  },
  {
    stakingContractAddress: '0x92efadd7e1d625aee3a32cdf0baa7641e2afdd13',
    pairAddress: '0xd5211a55d978bf651b9da899cc8bb09491ff39a1',
  },
  {
    stakingContractAddress: '0xea4fdb87e55ac455ddf0ab96dd23fe1242600c4d',
    pairAddress: '0xcddf91a44c579765227722da371136a4f12dc81b',
  },
  {
    stakingContractAddress: '0x413313f565f1b442114425bbad342024d37900fa',
    pairAddress: '0xbea282f98df962c54be80a2050a211b64ff1aee0',
  },
  {
    stakingContractAddress: '0xe229c421f2079900e1544e4c98ee165afae78203',
    pairAddress: '0xb980171e5647a8531d3b28134622d225bc3cdb82',
  },
  {
    stakingContractAddress: '0xd23a615e206150d94f376641527f405be24e70cc',
    pairAddress: '0xb56843b5550e3f78613ca5abf6bd6ae6f84cd11e',
  },
  {
    stakingContractAddress: '0xb3cf543c9403fc0312e3f2d39d6f748245d40814',
    pairAddress: '0xb417da294ae7c5cbd9176d1a7a0c7d7364ae1c4e',
  },
  {
    stakingContractAddress: '0xe2519a7b81cf038c055ddd667a9c06a0790945f4',
    pairAddress: '0xab1403de66519b898b38028357b74df394a54a37',
  },
  {
    stakingContractAddress: '0xcb1b532f13c45a601f2d2ebd651dec8f738d2969',
    pairAddress: '0xa28864af52aedcef717c34bffca2ccf9d6aa23cc',
  },
  {
    stakingContractAddress: '0x02fdc298a125ee8afd2cef81f1c7120e3d0afce6',
    pairAddress: '0x972d0c9d46742d04a35e2521e8ff1657e8107b2c',
  },
  {
    stakingContractAddress: '0x722796b1f84a1e023672d1d7f3d6c4cd2689e669',
    pairAddress: '0x8df6f7da556b9e70e272434bdc581dbb4848dffc',
  },
  {
    stakingContractAddress: '0x99640eeda4b97e7760ae077e2b4a089f629c1a9f',
    pairAddress: '0x8bab360e41468dff5326df636e2377a858ad0670',
  },
  {
    stakingContractAddress: '0x590226869c2a1334394392231ed6de5f63c9dc98',
    pairAddress: '0x898386dd8756779a4ba4f1462891b92dd76b78ef',
  },
  {
    stakingContractAddress: '0x9ec201d943a16b57d2238cdfa469c22afd77b9e4',
    pairAddress: '0x856ad56defbb685db8392d9e54441df609bc5ce1',
  },
  {
    stakingContractAddress: '0xd02b619cda463bc63fe6addf36d3e2370d8b1742',
    pairAddress: '0x82f1676ef298db09da935f4cb7bd3c44fb73d83a',
  },
  {
    stakingContractAddress: '0x568f468e4b5eccbf308216c8115813ce481d15cd',
    pairAddress: '0x8167d3156fccdbaf3e43ae019a0e842e5d1f1ac1',
  },
  {
    stakingContractAddress: '0xe12cf778da0494919567b27426fb85bcf22b9782',
    pairAddress: '0x7de19d534c6ecc2f5e236349d36b7d5bb645bfef',
  },
  {
    stakingContractAddress: '0x96ca8ec02c59bf85a9f12b2e1214850edd775490',
    pairAddress: '0x67b8e4082a59ef8ca0ac7df11af58c11b4ccfbee',
  },
  {
    stakingContractAddress: '0x4cce973585bbff82fe5574752bb329a7ad737f66',
    pairAddress: '0x666dd949db4f3807c6e8e360a79473a5f0c7075a',
  },
  {
    stakingContractAddress: '0xc255ff6e74c7c6d7f24d6f7d6d7de8faf762785d',
    pairAddress: '0x602fe85ceba5d27fd4d48c241cfb83ce045a179d',
  },
  {
    stakingContractAddress: '0x36cf81d44f0f01bb0aaf01ec836792ce809dd501',
    pairAddress: '0x5938dc50094e151c7dd64e5b774a2a91cd414daf',
  },
  {
    stakingContractAddress: '0x473f341f5adfecabf19b5a7299015ddfa0e1c091',
    pairAddress: '0x4e56843592da70ce073ad6599b3fb3ce3bf02f3b',
  },
  {
    stakingContractAddress: '0x3a353b71ae9b6c688ac474ad07632b8e0d499264',
    pairAddress: '0x40a5df3e37152d4daf279e0450289af76472b02e',
  },
  {
    stakingContractAddress: '0xed9c0a272001b796087fd16cad762717bef1e687',
    pairAddress: '0x3dd6a0d31818fdacd2724f2b0b3b220f14a54215',
  },
  {
    stakingContractAddress: '0x1301ae3e88021532fba7722a0b7bc8e2e071d196',
    pairAddress: '0x3ba7afa5f600be15607b89d03f98aa791c8ecef8',
  },
  {
    stakingContractAddress: '0xed345d7a19daa7d5a00285f04f342d0ba344bd99',
    pairAddress: '0x36d906b17371678ba39de21b8631854c9490e87e',
  },
  {
    stakingContractAddress: '0x056ab2768c1018b16e7d0d9c5053c05e1ea82379',
    pairAddress: '0x2d252d4a903a450afa9dac54cb696f0690259a62',
  },
  {
    stakingContractAddress: '0xad9e0d2fc293fd9a0f6c3c16c16a69d36b6d3b06',
    pairAddress: '0x25d56e2416f20de1efb1f18fd06dd12efec3d3d0',
  },
  {
    stakingContractAddress: '0x1f5fe1c32dbfe8811adb3d81b047240d2782eb83',
    pairAddress: '0x12909209228cedad659a6e13d41f82a4d53ee8d1',
  },
  {
    stakingContractAddress: '0x2f58b48a013bade935e43f7bcc31f1378ae68d55',
    pairAddress: '0x082b58350a04d8d38b4bcae003bb1191b9aae565',
  },
  {
    stakingContractAddress: '0x026c9182ae247675ccedffe18b32cf4fff08b828',
    pairAddress: '0xf745a6358790f7a2ef5da0538b714cbbcc635c40',
  },
  {
    stakingContractAddress: '0x97efe8470727fee250d7158e6f8f63bb4327c8a2',
    pairAddress: '0x59153f27eefe07e5ece4f9304ebba1da6f53ca88',
  },
  {
    stakingContractAddress: '0xd7ba0fc827fd629f0a1fa8f189bd93ea860ae051',
    pairAddress: '0x7e1cf35e362caea8c1a132ba4e4222080f26d8b0',
  },
  {
    stakingContractAddress: '0x162e50560d701ddea3187f0e4a637960b77d9616',
    pairAddress: '0x5f819f510ca9b1469e6a3ffe4ecd7f0c1126f8f5',
  },
  {
    stakingContractAddress: '0xbd5f8b3663f5ce456c9f53b26b0f6bc3ea22b6aa',
    pairAddress: '0xe55739e1feb9f9aed4ce34830a06ca6cc37494a0',
  },
  {
    stakingContractAddress: '0x8917692e0bdb47af1d36837805e141ed79065dfc',
    pairAddress: '0xeaa5e4620373d9ded4dcb9267f46fcfc6698c867',
  },
  {
    stakingContractAddress: '0x8782772e35e262ba7f481dddb015424fc1aabc62',
    pairAddress: '0xd2eeeedfcaf1457f7bc9cba28d5316f73bb83b49',
  },
  {
    stakingContractAddress: '0xcfca8d0fcec1a3a30b6f9b963f1794c3b8f8e391',
    pairAddress: '0xbf453e64ee7f43513afdc801f6c0fab250fbcf09',
  },
  /**
   * Commented because one of the pair token is not verified.
   * It causes an error.
   *
   * @pair
   *
   * QUICK
   * 0x831753DD7087CaC61aB5644b308642cc1c33Dc13
   *
   * Staked GHST-QUICK LP
   * 0xa02d547512bb90002807499f05495fe9c4c3943f
   *
   */
  // {
  //   stakingContractAddress: '0xa132faD61EDe08f1f288a35ff4c10dcD1cB9E107',
  //   pairAddress: '0x9bcfd9b9a5cbe2669ad30b0ad02693afac0485f1',
  // },
  {
    stakingContractAddress: '0xdac489d994d12be53388d4db3cac5135177390f0',
    pairAddress: '0x976b7b7fe4293111cacd946c422a64f24a223564',
  },
  {
    stakingContractAddress: '0x42e939e60cdd95af8e35a2f8b729e4b34317b537',
    pairAddress: '0x81e796089262df8569ff11d8d3a43bfb5c4d9e26',
  },
  {
    stakingContractAddress: '0x679993a5cf340f18d2be82bb1d075483dcf07c42',
    pairAddress: '0x7600cc75fa9045986efe0bddee8e18621a8dd49e',
  },
  {
    stakingContractAddress: '0x58e52a5bb13c4474a1954cc013b3b70c87ccbc92',
    pairAddress: '0x20e28214946b4e0f18b2c1aa7c976df087695a5d',
  },
  {
    stakingContractAddress: '0x1fddd7f3a4c1f0e7494aa8b637b8003a64fde21a',
    pairAddress: '0x160532d2536175d65c03b97b0630a9802c274dad',
  },
  {
    stakingContractAddress: '0x3868163fb27bc3b45f5e581d6920466b6515396f',
    pairAddress: '0x1585d301b58661bc0cb5a8eba24ecae7b4600470',
  },
  {
    stakingContractAddress: '0xfdc02dc768a587514b992b03fb713f74061764a2',
    pairAddress: '0x096c5ccb33cfc5732bcd1f3195c13dbefc4c82f4',
  },
  {
    stakingContractAddress: '0x670f566ca98c8a28d9cec9b3a58ce18bd4c14f0c',
    pairAddress: '0xb96fb16fefd59e51d4a76be6050df3e50c916451',
  },
  {
    stakingContractAddress: '0x72ed24d2b2d98d3c4b5297ce244f623b9357f798',
    pairAddress: '0x4b4c614b9219397c02296f6f4e2351259840b3c7',
  },
  {
    stakingContractAddress: '0x219670f92cc0e0ef1c16bdb0ae266f0472930906',
    pairAddress: '0xcc203f45a31ae086218170f6a9e9623fa1655486',
  },
  {
    stakingContractAddress: '0x1067112e5db21aec7eb144c5773f8aef8c85966a',
    pairAddress: '0x7622804ba94940a9efddd1546d12d8d0d6a16e53',
  },
  {
    stakingContractAddress: '0x34d4257c4935673fb5059f29602b9aae9dea0296',
    pairAddress: '0x47be4b1b6921a36591142e108b8c9e04bb55e015',
  },
  {
    stakingContractAddress: '0xe818cbee29477e6c6915df1e9757dd663f10106d',
    pairAddress: '0x4fa5e499eea684c2fee4b67e96271ee916c26155',
  },
  {
    stakingContractAddress: '0x214249a7bd9a6c10adff8fad70749ebf8108494a',
    pairAddress: '0x0712323f8451cf7acc1141083baa60cc70dc32a8',
  },
  /** old pairs */
  {
    stakingContractAddress: '0x251d9837a13f38f3fe629ce2304fa00710176222',
    pairAddress: '0x2cf7252e74036d1da831d11089d326296e64a728',
  },
  {
    stakingContractAddress: '0x785aacd49c1aa3ca573f2a32bb90030a205b8147',
    pairAddress: '0x4a35582a710e1f4b2030a3f826da20bfb6703c09',
  },
  {
    stakingContractAddress: '0xb26bfcd52d997211c13ae4c35e82ced65af32a02',
    pairAddress: '0xf6422b997c7f54d1c6a6e103bcb1499eea0a7046',
  },
  {
    stakingContractAddress: '0x6c6920ad61867b86580ff4afb517bec7a499a7bb',
    pairAddress: '0x6e7a5fafcec6bb1e78bae2a1f0b612012bf14827',
  },
  {
    stakingContractAddress: '0x4a73218ef2e820987c59f838906a82455f42d98b',
    pairAddress: '0x853ee4b2a13f8a742d64c8f088be7ba2131f670d',
  },
].map(lowerContractAddresses);
