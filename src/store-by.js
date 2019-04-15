import withLens from "./with-lens";

const storeBy = createKey =>
  withLens(
    (currentState = {}) => (...args) => currentState[createKey(...args)],
    (currentState = {}) => (...args) => data => ({
      ...currentState,
      [createKey(...args)]: data
    })
  );

export default storeBy;
