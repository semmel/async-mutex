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

module.exports = MutexTimeoutError;