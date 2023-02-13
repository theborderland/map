import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import serve from 'rollup-plugin-serve';
import { terser } from 'rollup-plugin-terser';

// `npm run build` -> `production` is true
// `npm run dev` -> `production` is false
const production = !process.env.ROLLUP_WATCH;

console.log('is production?', production);

export default {
    input: 'src/main.js',
    output: {
        file: 'public/bundle.js',
        format: 'iife', // immediately-invoked function expression — suitable for <script> tags
        sourcemap: true,
    },
    plugins: [
        resolve(), // tells Rollup how to find includes in node_modules
        typescript({ compilerOptions: { target: 'ESNEXT' } }), // convert from typescript to javascript
        commonjs(), // converts to ES modules
        production && terser(), // minify, but only in production
        !production &&
            serve({
                port: 3001,
            }),
    ],
};
