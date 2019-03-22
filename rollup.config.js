import babel from "rollup-plugin-babel";
import { uglify } from "rollup-plugin-uglify";
import peerDepsExternal from "rollup-plugin-peer-deps-external";

export default {
  input: "src/index.js",
  output: {
    file: "dist/cjs.js",
    format: "cjs"
  },
  plugins: [
    peerDepsExternal(),
    babel({
      exclude: "node_modules/**",
      babelrc: false,
      presets: [
        ["@babel/preset-env", { modules: false }],
        "@babel/preset-react"
      ]
    }),
    uglify()
  ]
};
