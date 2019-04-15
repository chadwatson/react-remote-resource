import { curry } from "ramda";

const withLens = curry(
  (getter, setter, loader) => (currentState, refresh) => (...args) =>
    refresh || !getter(currentState)(...args)
      ? loader(...args).then(setter(currentState)(...args))
      : currentState
);

export default withLens;
