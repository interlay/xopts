Trustless BTC Put Options
=========================


Actors / Components
-------------------

* **Alice** owns 1 BTC. She wants to purchase a put option, denominated in USDC, and is willing to pay a premium of 10 USDC.

* **Bob** owns 10k USDC. He wants to sell an "insurance" put option for a premium of 10 USDC.

* **Smart contracts**: an OptionPool smart contract on Ethereum handling the creation of new put options and multiple put option smart contracts for each combination of premium, strike price, and expiry time handling the logic around put options.

* **UI**: web UI with which Alice and Bob interact.

* **Backend**: backend server of the UI.


High Level Protocol
-------------------

1. **Underwrite**. Bob offers others to buy insurance against a BTC to USDC price drop. Bob creates a put option offer in the smart contract that allows others to sell their BTC against a minimum price in USDC (strike price) for a set period (expiry time) in return for paying a premium.

    a. Bob makes a call to the OptionPool smart contract via the UI, specifying:

        - a strike price (e.g. 9k USDC)
        - the premium (e.g. 10 USDC)
        - an expiry time (e.g. two weeks from today)
        - and his Bitcoin address.

    b. By making the call in a. Bob creates a new smart contract that encodes the put option.

    c. Thereby, Bob locks the specified strike price of 9k USDC for 1 BTC in the smart contract. He can withdraw this amount only after the expiry time of the option has passed.

    d. By locking the strike price as collateral in the smart contract we ensure that Alice can execute the option at any time.

    e. The smart contract creates a set number of put option tokens. Each put option token underwrites a fraction of 1 BTC. For example, if 9000 USDC worth of collateral underwrite 1 BTC, we could create 10,000 put option tokens that together underwrite 1 BTC. That way, if e.g. Alice only wants to insure 0.5 BTC, Alice would just buy 5,000 put option tokens for a premium of 5 USDC. Furthermore, a second party, Charlie, could use the remaining 5,000 put option tokens to insure another 0.5 BTC of his for 5 USDC premium.

    f. Put option tokens are ERC20 compatible and can be traded on Uniswap as long as their expiry time is not up. This allows Alice to resell her put option tokens in case she e.g. has sold her BTC otherwise or she thinks she does not need the option any longer.

    g. By creating put option tokens, Bob grants the put option contract access rights to the tokens to allow the contract to sell these tokens to Alice.

    h. The UI now displays Bob's put option offer. It shows that 1 BTC can be insured at a strike price of 9000 USDC, for a time of two weeks, and at a premium of 10 USDC.

    i. Another underwriter, Dave, can decide to deposit USDC into the same contract that Bob has created minting more put option tokens with the same premium, strike price, and expiry date and thereby increasing liquidity. Dave could also create a new put option smart contract if he wishes to have different premium, strike price, or expiry time.


2. **Insure**. Alice obtains insurance against a BTC price drop relative to USDC. She selects Bob's put option and buys it for the indicated premium. This gives her the option, but not the obligation, to sell BTC within the expiry time of the option for the strike price deposited by Bob.

    a. Alice selects Bob's option contract in the UI, specifying an amount of BTC she wants to insure. For example, at a strike price of 9000 USDC she can insure 1 BTC for a premium of 10 USDC for a preiod of two weeks (as in the example above).

        **Note** that Alice does *not* directly have to deal with Bob. Rather, she buys the insurance against the contract and obtains put options tokens in return. Each put option token can have a different underwriter. For example, if Bob, Dave, and Eve all deposited USDC into Bob's put option contract, they would have all created put option tokens with their respective BTC addresses attached to them. When Alice executes the insurance, she would have to send BTC to Bob, Dave, and Eve.

    b. Alice locks 10 USDC in the smart contract (i.e., the premium requested by Bob).

    c. The smart contract generates a specific format for a Bitcoin "proof of coins" transaction. A "proof of coins" transaction is a Bitcoin tx in which Alice sends coins to herself, proving that she indeed owns sufficient Bitcoin to exercise the put option. The locking transaction follows the :ref:`mint_protocol` protocol.

       *Option 1*: The TX has an extra OP_RETURN output which contains Alice's Ethereum account identifier. The smart contract can then clearly verify is Alice has sufficient BTC.

       *Option 2*: We require Alice (i) inform the smart contract about her BTC address and (ii) to encode a numeric code in the last 5 digits of the amount transferred in the "proof of coins" TX. In our example: Alice must self-transfer 1BTC = 100,000,000 SAT. So The smart contract requires Alice to encode a random number (e.g. last 3 hex digits of current Ethereum block hash + a counter) in the last digits, e.g. the number ``123435``. Alice must then transfer to herself 100,012,345 SAT. This likely suffices for testnet purposes. Advantage: we support **any** Bitcoin wallet and users can simply scan a QR code to know which Bitcoin payment to make.

    d. As specificed, in the :ref:`mint_protocol` protocol, Alice submits a transaction inclusion proof to BTC Relay via the UI (or the backend sends the proof to BTC Relay directly).

    e. BTC Relay verifies the proof and checks that the time (2 weeks in our example) has not expired.

       "OK" Case: Alice officilly bought the put option. The smart contract assigns the put option to Alice. Bob has now earned the premium of 10 USDC.

       "FAIL" Case: Alice fails to give a "proof of coins" on time. Bob gets to *keep* Alice's premium (or a part of it).

    e. The UI displays that 100% of the available insurance tokens of Bob's contract are currently utilized in the "OK" case.

    f. If new underwriters decide to deposit USDC into Bob's contract, the UI needs to update the utilization and allow Alice and others to obtain more insurance against the put option contract.

..     d. The UI displays the option for Alice and Bob as "pending proof of coins".
..
.. 3. **Proof of Coins & Underwriting**. Alice make a "proof of coins" transaction. Either she herself or the *backend* submit a Merkle tree proof for the proof of coins transaction. If correct and on time, Alice officially "underwrites" the put option.
..
..    a. Alice makes a payment on Bitcoin (to herself), as defined per the "proof of coin transaction" format above (Option 1 or 2).
..
..    b.  Alice submits a transaction inclusion proof to BTC Relay via the UI (or the backend sends the proof to BTC Relay directly)
..
..    c. BTC Relay verifies the proof and checks that the time (2 hours in our example) has not expired.
..
..       "OK" Case: Alice officially "underwrites" the put option. The smart contract updates the option accordingly. The UI displays the put options as "active" to Alice and Bob. Bob has now earned the premium of 10 USDC.
..
..       "FAIL" Case: Alice fails to give a "proof of coins" on time. Bob can now re-claim his locked USDC and gets to *keep* Alice's premium (or a part of it). Bob can either withdraw his USDC or re-open a new put option (can all be in the same Ethereum transaction)
..

4. **Exercise Option**. Alice exercises the put option by transferring the agreed amount of BTC to Bob's Bitcoin address.

    a. Alice makes a payment to Bob's Bitcoin address of exactly the amount of BTC as per the put option contract (we may need to round to e.g. 2 digits here for convenience)

    b. Alice or the backend submit a transaction inclusion proof to BTC Relay

    c. BTC Relay verifies the transaction proof.

    d. Alice paid Bob. Alice now receives 9,000 USDC (as agreed) from the smart contract. **END**

    e. [OPTIONAL] If Alice bought put options from multiple parties, she repeats this step with each underwriter.



4. **Cancel Option**. Alice does not exercise the put option on time.

    a. Alice does not make the correct payment to Bob's Bitcoin address.
    b. After the option expires, Bob can withdraw his 9,000 USDC, gets to keep the 10 USDC premium and can re-open a new put option if he likes. **END**
