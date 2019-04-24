import _extends from '@babel/runtime/helpers/esm/extends';
import { curryN, curry } from 'ramda';
import React, { createContext, useRef, useState, useContext, useEffect, useCallback, useMemo, Suspense } from 'react';
import uuid from 'uuid/v1';
import { createStore } from 'redux';
import { Map as Map$1 } from 'immutable';
import Maybe from 'data.maybe';

const RECEIVE_STATE = "RECEIVE_STATE";
const initialRootState = Map$1({
  resourcesById: Map$1()
});

const rootReducer = (state, action) => {
  switch (action.type) {
    case RECEIVE_STATE:
      return state.setIn(["resourcesById", action.resourceId], action.state);

    default:
      return state;
  }
};

const store = createStore(rootReducer, initialRootState);
const selectResource = (state, _ref) => {
  let resourceId = _ref.resourceId;
  return state.getIn(["resourcesById", resourceId]);
};

const Context = createContext({
  registerError: () => {}
});

const createResource = curryN(3, function (entryGetter, entrySetter, loader, entriesExpireAfter) {
  if (entriesExpireAfter === void 0) {
    entriesExpireAfter = Infinity;
  }

  const resourceId = uuid();

  const getResourceState = () => selectResource(store.getState(), {
    resourceId
  });

  const setResourceState = nextState => {
    store.dispatch({
      type: RECEIVE_STATE,
      resourceId,
      state: typeof nextState === "function" ? nextState(getResourceState()) : nextState
    });
  };

  const setEntryState = curry((args, state) => setResourceState(entrySetter(getResourceState(), args, state)));

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
    refresh: function refresh() {
      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      return loader(...args).then(setEntryState(args));
    },
    useEntry: function useEntry() {
      for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2];
      }

      const renderCount = useRef(0);
      renderCount.current += 1;
      const resourceState = getResourceState();

      const _useState = useState(entryGetter(resourceState, args)),
            state = _useState[0],
            setState = _useState[1];

      const _useContext = useContext(Context),
            registerError = _useContext.registerError;

      const entryId = args.length ? args.join("-") : "INDEX";
      useEffect(() => // Important! The return value is used to unsubscribe from the store
      subscribe(() => {
        const nextState = getResourceState();
        /* istanbul ignore else */

        if (nextState !== state) {
          setState(entryGetter(nextState, args));
        }
      }), [state]);

      if (pendingLoaders.get(entryId)) {
        throw pendingLoaders.get(entryId);
      }

      const entryIsExpired = (entriesLastUpdatedById.get(entryId) || 0) + entriesExpireAfter < Date.now();

      if (entryGetter(resourceState, args) === undefined || entryIsExpired && renderCount.current === 1) {
        pendingLoaders.set(entryId, loader(...args).then(setEntryState(args)).catch(registerError).finally(() => {
          pendingLoaders.delete(entryId);
          entriesLastUpdatedById.set(entryId, Date.now());
        }));
        throw pendingLoaders.get(entryId);
      }

      return [state, useCallback(setEntryState(args), args)];
    },
    subscribe
  };
});

const createKeyedResource = curryN(2, (createKey, loader, entriesExpireAfter) => createResource(function (resourceState, args) {
  if (resourceState === void 0) {
    resourceState = {};
  }

  return resourceState[createKey(...args)];
}, function (resourceState, args, data) {
  if (resourceState === void 0) {
    resourceState = {};
  }

  return _extends({}, resourceState, {
    [createKey(...args)]: data
  });
}, loader, entriesExpireAfter));

const createSingleEntryResource = (loader, entriesExpireAfter) => createResource(resourceState => resourceState, (resourceState, args, data) => data, loader, entriesExpireAfter);

const RemoteResourceBoundary = (_ref) => {
  let children = _ref.children,
      _ref$onLoadError = _ref.onLoadError,
      onLoadError = _ref$onLoadError === void 0 ? () => {} : _ref$onLoadError,
      fallback = _ref.fallback,
      renderError = _ref.renderError;

  const _useState = useState(Maybe.Nothing()),
        error = _useState[0],
        setError = _useState[1];

  const providerValue = useMemo(() => ({
    registerError: error => {
      setError(Maybe.of(error));
      onLoadError(error);
    }
  }), [onLoadError]);
  const clearError = useCallback(() => {
    setError(Maybe.Nothing());
  }, []);
  return React.createElement(Context.Provider, {
    value: providerValue
  }, error.map(err => renderError({
    error: err,
    retry: clearError
  })).getOrElse(React.createElement(Suspense, {
    fallback: fallback
  }, children)));
};

const useAutoSave = function useAutoSave(value, save, delay) {
  if (delay === void 0) {
    delay = 1000;
  }

  const initialValue = useRef(value);
  const currentValue = useRef(value);
  const timeout = useRef(null);
  currentValue.current = value;
  useEffect(() => () => {
    if (timeout.current !== null) {
      save(currentValue.current);
    }
  }, []);
  useEffect(() => {
    if (value !== initialValue.current) {
      timeout.current = setTimeout(() => save(value), delay);
      return () => {
        clearTimeout(timeout.current);
      };
    }
  }, [value]);
};

const useSuspense = fn => {
  const _useState = useState(null),
        task = _useState[0],
        setTask = _useState[1];

  const mounted = useRef(true);
  useEffect(() => () => {
    mounted.current = false;
  }, []);

  if (task) {
    throw task;
  }

  return () => setTask(fn().finally(() => {
    /* istanbul ignore else */
    if (mounted.current) {
      setTask(null);
    }
  }));
};

export { RemoteResourceBoundary, createKeyedResource, createResource, createSingleEntryResource, useAutoSave, useSuspense };
