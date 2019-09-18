# Changelog

## Project `async-mutex`

### 0.1.0

 * Initial release

### 0.1.1

 * Fix documentation for `acquire`

### 0.1.2

 * Move to yarn
 * Add tslint
 * Switch tests to use ES6
 * Add isLocked()

### 0.1.3

 * Move deps to devDependencies (thanks to Meirion Hughes for the PR)
 * Upgrade deps

## Project `async-timeout-mutex`

### 0.2.0
* Initial release under the name `async-timeout-mutex`
* __Breaking:__ A mutex is no longer an instance of the class `Mutex` 
but created form a factory function `createMutex`
* `timeout` option when creating a mutex.
* __Breaking:__ The `mutex.acquire()` promise rejects when the timeout duration has passed before  
the mutex could be acquired.
* __Breaking:__ Source files converted from TypeScript to JavaScript