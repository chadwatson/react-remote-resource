import uuid from "uuid/v1";
import store, { selectResource, RECEIVE_STATE } from "./store";

const createRemoteResource = loader => {
  const resourceId = uuid();

  const getResourceState = () =>
    selectResource(store.getState(), { resourceId });

  const setResourceState = nextState => {
    dispatch({
      type: RECEIVE_STATE,
      state:
        typeof nextState === "function"
          ? nextState(getResourceState())
          : nextState
    });
  };

  const dispatch = action => store.dispatch({ ...action, resourceId });

  return {
    id: resourceId,
    loader,
    refresh: (...args) =>
      loader(getResourceState(), true)(...args).then(setResourceState),
    pendingLoaders: {
      queue: [],
      promisesById: new Map()
    },
    getState: getResourceState,
    setState: setResourceState,
    subscribe: onChange => {
      let currentState = getResourceState();
      return store.subscribe(() => {
        const nextResourceState = getResourceState();
        if (nextResourceState !== currentState) {
          currentState = nextResourceState;
          onChange();
        }
      });
    }
  };
};

export default createRemoteResource;
