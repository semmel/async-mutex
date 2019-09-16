const
	MutexTimoutError = require('./MutexTimeoutError'),
	
	/**
	 * @typedef {function(void): void} MutexReleaser
	 */
	
	/**
	 * @typedef AsynchronousWorkerFunction
	 * @template T
	 * @function
	 * @return {Promise<T>}
	 */
	
	/**
	 * @typedef {Object} Mutex
	 * @template T
	 * @property {function(): Boolean} isLocked
	 * @property {function(): Promise<MutexReleaser>} acquire
	 * @property {function(AsynchronousWorkerFunction<T>): Promise<T>} runExclusive
	 */
	
	/**
	 * @typedef {Object} Deferred
	 * @property {function} resolve
	 * @property {function} reject
	 * @property {Promise} promise
	 */
	
	/**
	 *
	 * @return {Deferred}
	 */
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
				console.log(_queue.length);
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
							ticketDfd.reject(new MutexTimoutError());
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

module.exports = createMutex;
