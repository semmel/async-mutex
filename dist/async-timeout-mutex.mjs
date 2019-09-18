/**
 * with-timeout: MutexTimeoutError.js
 *
 * Created by Matthias Seemann on 13.09.2019.
 * Copyright (c) 2019 Matthias Seemann.
 */

class MutexTimeoutError extends Error
{
	constructor() {
		// Pass remaining arguments (including vendor specific ones) to parent constructor
		super("An async mutex has timed out");
		
		// Maintains proper stack trace for where our error was thrown (only available on V8)
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, MutexTimeoutError);
		}
		
		this.name = 'MutexTimeoutError';
	}
}

var MutexTimeoutError_1 = MutexTimeoutError;

const
	createDeferred = function () {
		const
			/** @type {Deferred} */
			myself = Object.create(null);
		
		myself.promise = new Promise(function (resolve, reject) {
			myself.resolve = resolve;
			myself.reject = reject;
		});
		
		return myself;
	},
	
	/**
	 *
	 * @param {Object} [options]
	 * @param {Number} [options.timeout]
	 * @return {Mutex}
	 */
	createMutex = options => {
		let /** @type {Boolean} */
			_pending = false;
			
		const
			/** @type {Mutex} */
			self = Object.create(null),
			/** @type {Array<MutexReleaser>} */
			_queue = [],
			/** @type {(Number|Undefined)} */
			_timeout = options && options.timeout,
			
			_dispatchNext = () => {
				if (_queue.length > 0) {
					_pending = true;
					
					const
						ticketResolver = _queue.shift();
					
					if (ticketResolver) {
						ticketResolver(_dispatchNext);
					}
				}
				else {
					_pending = false;
				}
			};
		
		self.isLocked = () => _pending;
		
		self.acquire = () => {
			const
				ticketDfd = createDeferred();
			
			let
				isTimedOut = false;
			
			if (_timeout) {
				const
					timer = setTimeout(
						() => {
							isTimedOut = true;
							ticketDfd.reject(new MutexTimeoutError_1());
						},
						_timeout
					);
				
				ticketDfd.promise
				.then(
					() => clearTimeout(timer),
					() => undefined // swallow the errors
				);
			}
			
			_queue.push(release => {
				if (isTimedOut) {
					release();
				}
				else {
					ticketDfd.resolve(release);
				}
			});
			
			
			if (!_pending) {
				_dispatchNext();
			}
			
			return ticketDfd.promise;
		};
		
		self.runExclusive = callback => {
			return self.acquire()
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
			});
		};
		
		return self;
	};

var Mutex = createMutex;

var MutexTimeoutError$1 = MutexTimeoutError_1;
var createMutex$1 = Mutex;

var src = {
	MutexTimeoutError: MutexTimeoutError$1,
	createMutex: createMutex$1
};

export default src;
export { MutexTimeoutError$1 as MutexTimeoutError, createMutex$1 as createMutex };
