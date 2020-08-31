export enum Script {
  p2sh,
  p2pkh,
  p2wpkh
}

export const ErrorCode = {
  // ERC20
  ERR_TRANSFER_EXCEEDS_BALANCE: 'Amount exceeds balance',
  ERR_APPROVE_TO_ZERO_ADDRESS: 'Approve to zero address',
  ERR_TRANSFER_TO_ZERO_ADDRESS: 'Transfer to zero address',
  ERR_APPROVE_FROM_ZERO_ADDRESS: 'Approve from zero address',
  ERR_TRANSFER_FROM_ZERO_ADDRESS: 'Transfer from zero address',

  // OptionPairFactory
  ERR_NOT_SUPPORTED: 'Collateral not supported',

  // Expirable
  ERR_INIT_EXPIRED: 'Cannot init expired',
  ERR_EXPIRED: 'Contract has expired',
  ERR_NOT_EXPIRED: 'Contract not expired',
  ERR_WINDOW_ZERO: 'Window cannot be zero',

  // Obligation
  ERR_INVALID_OUTPUT_AMOUNT: 'Invalid output amount',
  ERR_NO_BTC_ADDRESS: 'Account lacks BTC address',
  ERR_INSUFFICIENT_OBLIGATIONS: 'Seller has insufficient obligations',
  ERR_INVALID_REQUEST: 'Cannot exercise without an amount',
  ERR_SUB_WITHDRAW_BALANCE: 'Insufficient pool balance',
  ERR_SUB_WITHDRAW_AVAILABLE: 'Insufficient available',
  ERR_ZERO_STRIKE_PRICE: 'Requires non-zero strike price',

  // Treasury
  ERR_INSUFFICIENT_DEPOSIT: 'Insufficient deposit amount',
  ERR_INSUFFICIENT_LOCKED: 'Insufficient collateral locked',
  ERR_INSUFFICIENT_UNLOCKED: 'Insufficient collateral unlocked',

  // WriterRegistry
  ERR_NO_BTC_HASH: 'Cannot set empty BTC address',

  // BTCReferee
  ERR_INVALID_OUT_HASH: 'Invalid output hash',
  ERR_TX_NOT_INCLUDED: 'Cannot verify tx inclusion',
  ERR_INVALID_REQUEST_ID: 'Invalid request id',

  // Ownable
  ERR_CALLER_NOT_OWNER: 'Ownable: caller is not the owner'
};

export const Uniswap = {
  mainnet: '0xc0a47dFe034B400B47bDaD5FecDa2621de6c4d95',
  ropsten: '0x9c83dCE8CA20E9aAF9D3efc003b2ea62aBC08351',
  rinkeby: '0xf5D915570BC477f9B8D6C0E980aA81757A3AaC36',
  kovan: '0xD3E51Ef092B2845f10401a0159B2B96e8B6c3D30',
  görli: '0x6Ce570d02D73d4c384b46135E87f8C592A8c86dA'
};

export const WETH = {
  mainnet: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
};

export const USDT = {
  mainnet: '0xdac17f958d2ee523a2206206994597c13d831ec7'
};
