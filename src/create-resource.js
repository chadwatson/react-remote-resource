import { useState, useEffect, useCallback, useContext } from "react";
import uuid from "uuid/v1";
import { curry } from "ramda";
import store, { selectResource, RECEIVE_STATE } from "./store";
import Context from "./Context";

const createResource = curry(
  (entryGetter, entrySetter, entryPredicate, loader) => {
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

    const setEntryState = curry((args, state) =>
      setResourceState(entrySetter(getResourceState(), args, state))
    );

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
      useEntry: (...args) => {
        const resourceState = getResourceState();
        const [state, setState] = useState(entryGetter(resourceState, args));
        const { registerError } = useContext(Context);
        const entryId = args.length ? args.join("-") : "INDEX";

        useEffect(
          () =>
            // Important! The return value is used to unsubscribe from the store
            subscribe(() => {
              const nextState = getResourceState();
              if (nextState !== state) {
                setState(nextState);
              }
            }),
          [state]
        );

        if (pendingLoaders.get(entryId)) {
          throw pendingLoaders.get(entryId);
        }

        if (!entryPredicate(entryGetter(resourceState, args), args)) {
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

        return [state, useCallback(setEntryState(args), args)];
      },
      subscribe
    };
  }
);

export default createResource;
