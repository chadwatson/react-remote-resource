import store, { RESET_ALL_RESOURCES } from "./store";

const resetAllResources = () => store.dispatch({ type: RESET_ALL_RESOURCES });

export default resetAllResources;
