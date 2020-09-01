import {ethers} from '@nomiclabs/buidler';
import {Signer, constants} from 'ethers';
import chai from 'chai';
import {solidity} from 'ethereum-waffle';
import {MockBtcReferee} from '../../typechain/MockBtcReferee';
import {MockBtcRefereeFactory} from '../../typechain/MockBtcRefereeFactory';
import * as bitcoin from 'bitcoinjs-lib';
import {btcToSatoshi} from '../../lib/conversion';
import {Script} from '../../lib/constants';

chai.use(solidity);
const {expect} = chai;

const NETWORK = bitcoin.networks.testnet;

describe('BTCReferee.sol', () => {
  let signers: Signer[];
  let btcReferee: MockBtcReferee;

  beforeEach(async () => {
    signers = await ethers.getSigners();

    const btcRefereeFactory = new MockBtcRefereeFactory(signers[0]);
    btcReferee = await btcRefereeFactory.deploy();
  });

  const p2shTx =
    '0x020000000001012be04b0a3994d305b9f55951463efe49de3e9e11055cb804a6ad2310e027a17101' +
    '00000023220020f5372152ce2767111d524eda3c5856c6bae58f768af4bf728ba194dff7ddb87afdff' +
    'ffff02d09351020000000017a91407c1b300f59509ad9a07c89b4b26563ed2160ab38796c410000000' +
    '0000160014db99ee82cb653f5a9b5406e16d72a22bafad4fa20400473044022030ca938aa060eb6103' +
    '74fc91df22981c48417ab7c3bfcb744ff0eaa09b7c45910220142a872ebb0cb2bfcef8ec2651afd854' +
    '01f4e402c48709cbcd62e27f729c59fe01473044022021d16208eac06aa5420245feb43f22befee14a' +
    'e06034db935cb2679bbcdc035702202e131ab279adaf06a30f379dd2fc461da0790b6ef6a253a45084' +
    'abce5c129f5a0147522103c88759b2728ea7ccf697d13602bf80ceb2e5c08ec45d1fb53d6f646e4d34' +
    '55332103d41e3ec0c2ce0b255bc1dc15ce61770112f20e8a5e66c083825b813f77bafd8752ae800f1b00';

  it('should successfully extract p2sh output', async () => {
    const payment = bitcoin.payments.p2sh({
      address: '2MsxEm5ugk4hR9naBiA8gNH6syFdAcjALHQ',
      network: NETWORK
    });
    const btcHash = payment.hash!;

    const {amount} = await btcReferee.extractOutput(p2shTx, btcHash, Script.p2sh);
    expect(amount).to.eq(btcToSatoshi(0.38900688));
  });

  it('should not extract incorrect script (p2sh)', async () => {
    const payment = bitcoin.payments.p2sh({
      address: '2MsxEm5ugk4hR9naBiA8gNH6syFdAcjALHQ',
      network: NETWORK
    });
    const btcHash = payment.hash!;

    const {amount} = await btcReferee.extractOutput(p2shTx, btcHash, Script.p2pkh);
    expect(amount).to.eq(constants.Zero);
  });

  // d9c9213136854a53211f1c80d202b743dfe971867558fd2c5628fe781a7f7ba9
  const p2pkhTx0 =
    '0x0200000001f76fec5260faa8f39fbd8f17f5acb2bd50260fa715347201657fceaefc14a102' +
    '000000006a47304402203f09be3d47d77f6a0948023aa80dc849128ce5a9cb017ed3c2413abb' +
    '74accf9c022019da8fed912a6b5b01aa6088fee3bdeb0d237d37072e29fb7b238932bf140cd0' +
    '012103785122f4493e03a7082398099e8f159a293ba496344c1c9b673074b1318ee336feffff' +
    'ff02acfad806000000001976a914679775af720fa9bf3602150ee699ad7e2a24d96888ac4e90' +
    'b76e200000001976a914e5ea7e9aae7df252796864912f0df41b4b956f4488ace3c01300';

  it('should successfully extract p2pkh output', async () => {
    const payment = bitcoin.payments.p2pkh({
      address: 'mpxhLRAzfGc6tH55kzG9NfZ3b2VZdo3Gq9',
      network: NETWORK
    });
    const btcHash = payment.hash!;

    const {amount} = await btcReferee.extractOutput(p2pkhTx0, btcHash, Script.p2pkh);
    expect(amount).to.eq(btcToSatoshi(1.14883244));
  });

  it('should not extract incorrect script (p2pkh)', async () => {
    const payment = bitcoin.payments.p2pkh({
      address: 'mpxhLRAzfGc6tH55kzG9NfZ3b2VZdo3Gq9',
      network: NETWORK
    });
    const btcHash = payment.hash!;

    const {amount} = await btcReferee.extractOutput(p2shTx, btcHash, Script.p2wpkh);
    expect(amount).to.eq(constants.Zero);
  });

  // 777fc7368170497035a176c3c9cbd3561c4f5d0e147efefd8fd642a5ccd81a26
  const p2pkhTx1 =
    '0x0100000001ba804de05af33903ff4abb03f8c89c08e3a9d106aa137d70a847d36c2297383e' +
    '000000006b483045022100a81044ca5e2869837d8624f12caf4f690adfdae7786545bca95337' +
    'c3d3f9d30f022019204133cf9744041bfe12609b4b8527f81e1d0ba97d4f186d1d2b2dfe187b' +
    '5b0121028c71cc6ac7ecb5f0559f43a7a21066a088fa88637b4f35e775ce9f1d16a8e2b6ffff' +
    'ffff0264000000000000001976a9140e333880329368987577d7e81a2207938cccd53788ac00' +
    '00000000000000226a20bb098b68899b1f586de557dae6bae76093ae4206039c43c89031ae77' +
    '352268ba00000000';

  it('should successfully extract p2pkh output and op_return', async () => {
    const payment = bitcoin.payments.p2pkh({
      address: 'mgp37ciqPF6BQDiv1hhrjFaPxUE2rkSqgR',
      network: NETWORK
    });
    const btcHash = payment.hash!;

    const {data, amount} = await btcReferee.extractOutput(p2pkhTx1, btcHash, Script.p2pkh);
    expect(amount).to.eq(btcToSatoshi(0.000001));
    expect(data).to.eq('0xbb098b68899b1f586de557dae6bae76093ae4206039c43c89031ae77352268ba');
  });

  const p2wpkhTx0 =
    '0x02000000000103adbd70d005de0da198443510bf9ebee467430a52b32dcefab6cd30439792ca7301' +
    '00000000fdffffffd7f39f49b86629f424eef093bf18ace94ff3dcb2cdd8889431e54980f2f70b6e00' +
    '00000000fdffffff174378c00591be16087edda13100b3e21b11d743b596cbba6eadedebdc228ca300' +
    '00000000fdffffff02b9520f0000000000160014921dc66ef429aae7d2cdbe2ec541cae6c6f0924740' +
    '0d030000000000160014ada017613556001d6ae3bbaaff3653ed5a80b8bf024730440220682fca4273' +
    '9ab9f0f13cd0f83875ed4a4a7a42450c48010eed305a782575305a022076eab56f9792a6152c59d309' +
    'af5b7925150efdc60386c4bcbc363f1738577e5f0121025b5424e82f8c4313f6ec880724aab8cd78ed' +
    '059b3115fd5075b63b3c3524134b0247304402206909c2f861d99ba60ef5f4521021dc5daa73c8317e' +
    'f95f974ca312ec820d2e2a02207200904855f6d5a80fe664dbdc38f1ee997f34b9021bea494681cc28' +
    '06ae0bb20121025b5424e82f8c4313f6ec880724aab8cd78ed059b3115fd5075b63b3c3524134b0247' +
    '304402205265f0cf634f8f5276b3667582051c60508aa014e4f71c2513d081a17232ea5d0220543bfd' +
    '96f7394cafa1871b7e918d4347a26649fb0dc05d9bb12e8f94300047070121025b5424e82f8c4313f6' +
    'ec880724aab8cd78ed059b3115fd5075b63b3c3524134b250a1b00';

  it('should successfully extract p2wpkh output', async () => {
    const payment = bitcoin.payments.p2wpkh({
      address: 'tb1q4kspwcf42cqp66hrhw407djna4dgpw9lsnfx5e',
      network: NETWORK
    });
    const btcHash = payment.hash!;

    const {amount} = await btcReferee.extractOutput(p2wpkhTx0, btcHash, Script.p2wpkh);
    expect(amount).to.eq(btcToSatoshi(0.002));
  });

  it('should not extract incorrect script (p2wpkh)', async () => {
    const payment = bitcoin.payments.p2wpkh({
      address: 'tb1q4kspwcf42cqp66hrhw407djna4dgpw9lsnfx5e',
      network: NETWORK
    });
    const btcHash = payment.hash!;

    const {amount} = await btcReferee.extractOutput(p2shTx, btcHash, Script.p2sh);
    expect(amount).to.eq(constants.Zero);
  });

  const p2wpkhTx1 =
    '0x01000000000101747c038ceb0a5ab9edd61d39f3d3c611cd52ccd0f519d9ad93ccf1f81a0fc5d301' +
    '00000000ffffffff026400000000000000160014867a55207369ad0fe47cf3cfd2ecbaef2446c8b400' +
    '00000000000000226a206217fb6a2ad9bb6ce6e2b27545fea21416aaf9a401f86f10f8f914dc47f757' +
    'f002483045022100e9af70c449a0303371324f61b3c30e631525046f289ecf51b5cff9752cd512dc02' +
    '2059339ddd77f94f03aaa4f4ef4a0b63d9aaf22fd05b5bd795c853bb37b240e83c01210290465bd783' +
    'baaa9d52df3b57e31cef7df72c0cbd10afe6a10e3cfbd9477c8acf00000000';

  it('should successfully extract p2wpkh output and op_return', async () => {
    const payment = bitcoin.payments.p2wpkh({
      address: 'tb1qsea92grndxksleru708a9m96aujydj95s5edsj',
      network: NETWORK
    });
    const btcHash = payment.hash!;

    const {data, amount} = await btcReferee.extractOutput(p2wpkhTx1, btcHash, Script.p2wpkh);
    expect(amount).to.eq(btcToSatoshi(0.000001));
    expect(data).to.eq('0x6217fb6a2ad9bb6ce6e2b27545fea21416aaf9a401f86f10f8f914dc47f757f0');
  });

  const p2wpkhTx2 =
    '0x01000000000101747c038ceb0a5ab9edd61d39f3d3c611cd52ccd0f519d9ad93ccf1f81a0fc5d301' +
    '00000000ffffffff026400000000000000160014867a55207369ad0fe47cf3cfd2ecbaef2446c8b400' +
    '00000000000000166a14c783df8a850f42e7f7e57013759c285caa701eb60247304402200b89a0ad9a' +
    '73eb8a1d5cfcb9c0e925fcfc8629fe4249fa052395b7172958fb300220344d5c3b44caa85573dcbeef' +
    'bfa310a9f465dec4751d9097c18e510038aa0bf701210290465bd783baaa9d52df3b57e31cef7df72c' +
    '0cbd10afe6a10e3cfbd9477c8acf00000000';

  it('should fail to extract incorrect op_return', async () => {
    const payment = bitcoin.payments.p2wpkh({
      address: 'tb1qsea92grndxksleru708a9m96aujydj95s5edsj',
      network: NETWORK
    });
    const btcHash = payment.hash!;

    const {data, amount} = await btcReferee.extractOutput(p2wpkhTx2, btcHash, Script.p2wpkh);
    expect(amount).to.eq(btcToSatoshi(0.000001));
    expect(data).to.eq('0x0000000000000000000000000000000000000000000000000000000000000000');
  });
});
