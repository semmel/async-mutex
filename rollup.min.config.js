import commonjs from 'rollup-plugin-commonjs';
import { terser } from 'rollup-plugin-terser';

const
	config = {
		input: "src/index.js",
		output: {
			file: "dist/async-timeout-mutex.min.js",
			format: "umd",
			name : "AsyncTimeoutMutex"
		},
		plugins: [commonjs(), terser()]
	};

export default config;
