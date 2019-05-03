import store, { RESET_RESOURCES } from "./store";

const resetResources = resources =>
  store.dispatch({ type: RESET_RESOURCES, resources });

export default resetResources;
