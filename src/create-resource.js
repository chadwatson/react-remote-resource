import { useState, useEffect, useCallback, useContext, useRef } from "react";
import uuid from "uuid/v1";
import { curry, curryN } from "ramda";
import store, { selectResource, RECEIVE_STATE } from "./store";
import Context from "./Context";

const createResource = curryN(
  3,
  (entryGetter, entrySetter, loader, entriesExpireAfter = Infinity) => {
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
    const entriesLastUpdatedById = new Map();

    return {
      getState: getResourceState,
      setState: setResourceState,
      refresh: (...args) => loader(...args).then(setEntryState(args)),
      useEntry: (...args) => {
        const renderCount = useRef(0);
        renderCount.current += 1;

        const resourceState = getResourceState();
        const [state, setState] = useState(entryGetter(resourceState, args));
        const { registerError } = useContext(Context);
        const entryId = args.length ? args.join("-") : "INDEX";

        useEffect(
          () =>
            // Important! The return value is used to unsubscribe from the store
            subscribe(() => {
              const nextState = getResourceState();
              /* istanbul ignore else */
              if (nextState !== state) {
                setState(entryGetter(nextState, args));
              }
            }),
          [state]
        );

        if (pendingLoaders.get(entryId)) {
          throw pendingLoaders.get(entryId);
        }

        const entryIsExpired =
          (entriesLastUpdatedById.get(entryId) || 0) + entriesExpireAfter <
          Date.now();

        if (
          entryGetter(resourceState, args) === undefined ||
          (entryIsExpired && renderCount.current === 1)
        ) {
          pendingLoaders.set(
            entryId,
            loader(...args)
              .then(setEntryState(args))
              .catch(registerError)
              .finally(() => {
                pendingLoaders.delete(entryId);
                entriesLastUpdatedById.set(entryId, Date.now());
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
