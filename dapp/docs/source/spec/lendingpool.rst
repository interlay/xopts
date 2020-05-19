.. _pool-sc:

Lending Pool
============

Goes here.


Functions
:::::::::

.. _deposit:

deposit
-------

Deposit an amount of ``flashBTC`` into the lending pool.

Specification
.............

*Function Signature*

``deposit(receiver, amount, timelock, )``

*Parameters*

.. * ````: 

*Events*

.. * ````:


Function Definition
...................

* The requested `amount` must be equal to the UTXO used for locking and will be verified through the BTC Relay.
* The `timelock` must be equal to the UTXO timelock and will be verified through the BTC Relay.
* The locked Bitcoin transaction must be included in a Bitcoin block that is part of the longest chain as stored in the BTC Relay with the necessary confirmations.
* If all checks, succeeds the function calls :ref:`mint` to create ``flashBTC`` for  

.. _extend:

Extend
------


.. _borrow:

Borrow
------


.. _flash-borrow:

Flash Borrow
------------

