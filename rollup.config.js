import babel from "rollup-plugin-babel";
import { uglify } from "rollup-plugin-uglify";

export default {
  input: "src/index.js",
  output: {
    file: "dist/cjs.js",
    format: "cjs"
  },
  plugins: [
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
