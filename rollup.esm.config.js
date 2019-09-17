import commonjs from 'rollup-plugin-commonjs';

const
	config = {
		input: "src/index.js",
		output: {
			file: "dist/async-timeout-mutex.mjs",
			format: "esm"
		},
		plugins: [commonjs()]
	};

export default config;
