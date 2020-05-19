.. _treasury:

Treasury
========

The mighty ERC20 goes here.

Functions
:::::::::

.. _mint:

mint
----

Specification
.............

*Function Signature*

``mint(reciver, amount, timelock)``

*Parameters*

* ``receiver``: The receiver of the minted ``flashBTC``.
* ``amount``: The amount of ``flashBTC``.
* ``timelock``: The time the ``flashBTC`` are valid for.

*Events*

* ``Minted(receiver, amount, timelock)``:


Function Definition
...................

* This function can only be called by the :ref:`pool-sc` contract.
* Mints an ``amount`` of ``flashBTC`` to a ``receiver`` given a ``timelock``.
* The minted ``flashBTC`` need to expire after the timelock minus a global safety delay are reached.

transfer
--------


