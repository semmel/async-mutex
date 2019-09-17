[![Dependencies](https://david-dm.org/semmel/async-timeout-mutex.svg)](https://david-dm.org/semmel/async-timeout-mutex.svg)
# What is it?

This package implements a mutex for synchronizing asynchronous operations in
JavaScript.

The term "mutex" usually refers to a data structure used to synchronize
concurrent processes running on different threads. For example, before accessing
a non-threadsafe resource, a thread will lock the mutex. This is guranteed
to block the thread until no other thread holds a lock on the mutex and thus
enforces exclusive access to the resource. Once the operation is complete, the
thread releases the lock, allowing other threads to aquire a lock and access the
resource.

While Javascript is strictly single-threaded, the asynchronous nature of its
execution model allows for race conditions that require similar synchronization
primitives. Consider for example a library communicating with a web worker that
needs to exchange several subsequent messages with the worker in order to achieve
a task. As these messages are exchanged in an asynchronous manner, it is perfectly
possible that the library is called again during this process. Depending on the
way state is handled during the async process, this will lead to race conditions
that are hard to fix and even harder to track down.

This library solves the problem by applying the concept of mutexes to Javascript.
A mutex is locked by providing a worker callback that will be called once no other locks
are held on the mutex. Once the async process is complete (usually taking multiple
spins of the event loop), a callback supplied to the worker is called in order
to release the mutex, allowing the next scheduled worker to execute.

# How to use it?

## Installation

You can install the library into your project via npm

    npm install async-timeout-mutex

## Importing

ES5 / CommonJS
```javascript
var createMutex = require('async-timeout-mutex').createMutex;
```

Browser
```html
<script src="async-timeout-mutex.js"></script>
```

##  API

### Creating

ES5/ES6
```javascript
const mutex = createMutex({timeout: 500});
```

Create a new mutex.

### Locking

ES5/ES6
```javascript
mutex
    .acquire()
    .then(function(release) {
        // ...
    });
```

`acquire` returns an (ES6) promise that will resolve as soon as the mutex is
available and ready to be accessed. The promise resolves with a function `release` that
must be called once the mutex should be released again.

**IMPORTANT:** Failure to call `release` will hold the mutex locked and will
lilely deadlock the application. Make sure to call `release` under all circumstances
and handle exceptions accordingly.

If a `timeout` duration was specified when creating the Mutex with `createMutex`, the `.acquire` promise
will reject with a `MutexTimeoutError` when the waiting period had elapsed before a lock on the mutex could be obtained.

##### Async function example

```javascript
const release = await mutex.acquire();
try {
    const i = await store.get();
    await store.put(i + 1);
} finally {
    release();
}
```

### Synchronized code execution

ES5/ES6
```javascript
mutex
    .runExclusive(function() {
        // ...
    })
    .then(function(result) {
        // ...
    });
```

##### Async function example

This example is equivalent to the `async`/`await` example that
locks the mutex directly:

```javascript
await mutex.runExclusive(async () => {
    const i = await store.get();
    await store.put(i + 1);
});
```

`runExclusive` schedules the supplied callback to be run once the mutex is unlocked.
The function is expected to return a promise. Once the promise is resolved (or rejected), the mutex is released.
`runExclusive` returns a promise that adopts the state of the function result.

The mutex is released and the result rejected if an exception occurs during execution
if the callback.

### Checking whether the mutex is locked

ES5/ES6
```javascript
mutex.isLocked();
```

# License

Feel free to use this library under the conditions of the MIT license.
