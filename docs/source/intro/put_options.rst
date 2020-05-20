Trustless BTC Put Options
=========================


Actors / Components:
-------------------- 

* **Alice** owns 1 BTC. She wants to purchase a put option, denominated in USDC, and is willing to pay a premium of 10 USDC. 

* **Bob** owns 10k USDC. He wants to sell an "insurance" put option. 

* **Smart contract**: smart contract on Ethereum handling the logic around put options.

* **UI**: web UI with which Alice and Bob interact.

* **Backend**: backed server of the UI.

High Level Protocol
---------------------


1. **Offer Insurance**. Bob creates a put option offer in the smart contract. 

    a. Bob makes a call to the smart contract via the UI, specifying amount (10k USDC), Bitcoin price (e.g. 9k USDC), premium (e.g. 10 USDC) and his Bitcoin address.
    b. Thereby, Bob locks the specified amount of 10k USDC in the smart contract. He can withdraw this amount at any time, **as long as it is not red
    b. The smart contract checks that Bob indeed has sufficient USDC (ERC-20 function call to USDC token contract). 
    c. Smart contract creates and stores Bob's put option offer. 
    d. The UI now displays Bob's put option offer. 


2. **Reserve Option**. Alice selects Bob's put option and makes a "reserves" it for e.g. 2 hours.

    a. Alice selects Bob's option offer in the UI, specifying an amount of USDC. e.g. the full 10k.
    
    b Alice locks 10 USDC in the smart contract (i.e., the premium requested by Bob) 

    c. The smart contract generates a specific format for a Bitcoin "proof of coins" transaction. A "proof of coins" transaction is a Bitcoin tx in which Alice sends coins to herself, proving that she indeed owns sufficient Bitcoin to exercise the put option.
      
       *Option 1*: The TX has an extra OP_RETURN output which contains Alice's Ethereum account identifier. The smart contract can then clearly verify is Alice has sufficient BTC.

       *Option 2*: We require Alice (i) inform the smart contract about her BTC address and (ii) to encode a numeric code in the last 5 digits of the amount transferred in the "proof of coins" TX. In our example: Alice must self-transfer 1BTC = 100,000,000 SAT. So The smart contract requires Alice to encode a random number (e.g. last 3 hex digits of current Ethereum block hash + a counter) in the last digits, e.g. the number ``123435``. Alice must then transfer to herself 100,012,345 SAT. This likely suffices for testnet purposes. Advantage: we support **any** Bitcoin wallet and users can simply scan a QR code to know which Bitcoin payment to make. 

    c. The smart contract locks Bob's 10k USDC for 2 hours. 

    d. The UI displays the option for Alice and Bob as "pending proof of coins". 

3. **Proof of Coins & Underwriting**. Alice make a "proof of coins" transaction. Either she herself or the *backend* submit a Merkle tree proof for the proof of coins transaction. If correct and on time, Alice officially "underwrites" the put option.

   a. Alice makes a payment on Bitcoin (to herself), as defined per the "proof of coin transaction" format above (Option 1 or 2).

   b.  Alice submits a transaction inclusion proof to BTC Relay via the UI (or the backend sends the proof to BTC Relay directly)

   c. BTC Relay verifies the proof and checks that the time (2 hours in our example) has not expired.

      "OK" Case: Alice officially "underwrites" the put option. The smart contract updates the option accordingly. The UI displays the put options as "active" to Alice and Bob. Bob has now earned the premium of 10 USDC.

      "FAIL" Case: Alice fails to give a "proof of coins" on time. Bob can now re-claim his locked USDC and gets to *keep* Alice's premium (or a part of it). Bob can either withdraw his USDC or re-open a new put option (can all be in the same Ethereum transaction)
      

4. **Exercise Option**. Alice exercises the put option by transferring the agreed amount of BTC to Bob's Bitcoin address.

    a. Alice makes a payment to Bob's Bitcoin address of exactly the amount of BTC as per the put option contract (we may need to round to e.g. 2 digits here for convenience)
    b. Alice or the backend submit a transaction inclusion proof to BTC Relay
    c. BTC Relay verifies the transaction proof.

    d. Alice paid Bob. Alice now receives 10k USDC (as agreed) from the smart contract. **END**


4. **Cancel Option**. Alice does not exercise the put option on time.
    a. Alice does not make the correct payment to Bob's Bitcoin address. 
    b. After the option expires, Bob can withdraw his 10k USDC, gets to keep the 10 USDC premium and can re-open a new put option if he likes. **END**