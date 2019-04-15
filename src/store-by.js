import { curry } from "ramda";
import withLens from "./with-lens";

const storeBy = curry((createKey, load) =>
  withLens(
    (currentState = {}) => (...args) => currentState[createKey(...args)],
    (currentState = {}) => (...args) => data => ({
      ...currentState,
      [createKey(...args)]: data
    }),
    load
  )
);

export default storeBy;
