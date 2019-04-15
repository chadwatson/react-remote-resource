import { curry } from "ramda";

const withTimeout = curry((ms, loader) => {
  let lastFetch = null;

  return (currentState, refresh) => (...args) => {
    const now = Date.now();

    if (refresh || lastFetch + ms < now) {
      lastFetch = now;
      return loader(currentState, true)(...args);
    }

    return currentState;
  };
});

export default withTimeout;
