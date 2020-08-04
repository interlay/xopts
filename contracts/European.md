# European



> Contract module which provides a timed access control mechanism,
specifically to model a European Option with an expiry and settlement phase.
It must be used through inheritance which provides several modifiers.

## `hasExpired()`



Throws if called before the configured timestamp

## `notExpired()`



Throws if called after the configured timestamp

## `canExercise()`



Throws if called after the exercise window has expired

## `canRefund()`



Throws if called before the exercise window has expired





