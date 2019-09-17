import commonjs from 'rollup-plugin-commonjs';

const
	config = {
		input: "src/index.js",
		output: {
			file: "dist/async-timeout-mutex.js",
			format: "umd",
			name : "AsyncTimeoutMutex"
		},
		plugins: [commonjs()]
	};

export default config;
