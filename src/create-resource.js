import { useState, useEffect, useCallback, useContext, useRef } from "react";
import uuid from "uuid/v1";
import store, { selectResource, RECEIVE_STATE } from "./store";
import Context from "./Context";

const createResource = ({
  selectState,
  setState,
  loader,
  hasState = value => value !== undefined
}) => {
  const resourceId = uuid();

  const getResourceState = () =>
    selectResource(store.getState(), { resourceId });

  const setResourceState = nextState => {
    store.dispatch({
      type: RECEIVE_STATE,
      resourceId,
      state:
        typeof nextState === "function"
          ? nextState(getResourceState())
          : nextState
    });
  };

  const setEntryState = args => state =>
    setResourceState(setState(getResourceState(), args, state));

  const subscribe = onChange => {
    let currentState = getResourceState();
    return store.subscribe(() => {
      const nextResourceState = getResourceState();
      if (nextResourceState !== currentState) {
        currentState = nextResourceState;
        onChange();
      }
    });
  };

  const pendingLoaders = new Map();

  return {
    id: resourceId,
    getState: getResourceState,
    setState: setResourceState,
    refresh: (...args) => loader(...args).then(setEntryState(args)),
    useState: (...args) => {
      const renderCount = useRef(0);
      renderCount.current += 1;

      const resourceState = getResourceState();
      const entryState = selectState(resourceState, args);
      const [, setState] = useState(entryState);
      const { registerError } = useContext(Context);
      const entryId = args.length ? args.join("-") : "INDEX";

      useEffect(() => {
        let prevState = entryState;

        // Important! The return value is used to unsubscribe from the store
        return subscribe(() => {
          const nextEntryState = selectState(getResourceState(), args);
          /* istanbul ignore else */
          if (nextEntryState !== prevState) {
            setState(nextEntryState);
          }

          prevState = nextEntryState;
        });
      }, args);

      if (pendingLoaders.get(entryId)) {
        throw pendingLoaders.get(entryId);
      }

      if (!hasState(entryState, args)) {
        pendingLoaders.set(
          entryId,
          loader(...args)
            .then(setEntryState(args))
            .catch(registerError)
            .finally(() => {
              pendingLoaders.delete(entryId);
            })
        );
        throw pendingLoaders.get(entryId);
      }

      return [entryState, useCallback(setEntryState(args), args)];
    },
    subscribe
  };
};

export default createResource;
