import MutexTimoutError from './MutexTimeoutError';

/**
 * @typedef {function(void): void} MutexReleaser
 */

class Mutex {
    constructor(options) {
        /**
         *
         * @type {Array<MutexReleaser>}
         * @private
         */
        this._queue = [];
        /**
         *
         * @type {Boolean}
         * @private
         */
        this._pending = false;
    }
    
    isLocked() {
        return this._pending;
    }
    
    /**
     *
     * @return {Promise<MutexReleaser>}
     */
    acquire() {
        const ticket = new Promise(resolve => this._queue.push(resolve));

        if (!this._pending) {
            this._dispatchNext();
        }

        return ticket;
    }
    
    /**
     * @template T
     * @param {function(): (T|Promise<T>} callback
     * @return {Promise<T>}
     */
    runExclusive(callback)  {
        return this
            .acquire()
            .then(release => {
                    let result;

                    try {
                        result = callback();
                    } catch (e) {
                        release();
                        throw(e);
                    }

                    return Promise
                        .resolve(result)
                        .then(
                            x => {
                                release();
                                return x;
                            },
                            e => {
                                release();
                                throw e;
                            }
                        );
                }
            );
    }

    _dispatchNext() {
        if (this._queue.length > 0) {
            this._pending = true;
            this._queue.shift()!(this._dispatchNext.bind(this));
        } else {
            this._pending = false;
        }
    }
}

export default Mutex;
