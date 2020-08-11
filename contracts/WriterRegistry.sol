// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.6.0;

import { IWriterRegistry } from "./interface/IWriterRegistry.sol";
import { Bitcoin } from "./types/Bitcoin.sol";

contract WriterRegistry is IWriterRegistry {

    string constant ERR_NO_BTC_HASH = "Cannot set empty BTC address";

    // for external enumeration
    address[] internal _writers;

    mapping (address => Bitcoin.Address) internal _btcAddresses;

    function _setBtcAddress(address account, bytes20 btcHash, Bitcoin.Script format) internal {
        require(
            btcHash != 0,
            ERR_NO_BTC_HASH
        );
        _btcAddresses[account].btcHash = btcHash;
        _btcAddresses[account].format = format;
    }

    /**
    * @notice Sets the payout address for the caller.
    *
    * The script format is defined by the `Bitcoin.Script` enum which describes
    * the expected output format (P2SH, P2PKH, P2WPKH).
    *
    * @param btcHash Address hash
    * @param format Payment format
    **/
    function setBtcAddress(bytes20 btcHash, Bitcoin.Script format) external virtual override {
        _setBtcAddress(msg.sender, btcHash, format);
    }

    /**
    * @notice Get the configured BTC address for an account.
    * @param account Minter address
    * @return btcHash Address hash
    * @return format Expected payment format
    **/
    function getBtcAddress(address account) external override view returns (bytes20 btcHash, Bitcoin.Script format) {
        return (_btcAddresses[account].btcHash, _btcAddresses[account].format);
    }

    /**
    * @notice Return all option sellers (may contain null entries if obligations are sold).
    * @dev The caller should check that each account's obligation balance is sufficient.
    * @return Array of all obligation writers / buyers.
    **/
    function allWriters() external override view returns (address[] memory) {
        return _writers;
    }

}
