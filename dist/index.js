import _extends from '@babel/runtime/helpers/esm/extends';
import { curry } from 'ramda';
import React, { createContext, useState, useContext, useEffect, useCallback, useMemo, Suspense, useRef } from 'react';
import uuid from 'uuid/v1';
import { createStore } from 'redux';
import { Map as Map$1 } from 'immutable';
import Maybe from 'data.maybe';

const RECEIVE_STATE = "RECEIVE_STATE";
const initialRootState = Map$1({
  resourcesById: Map$1()
});

const rootReducer = function rootReducer(state, action) {
  if (state === void 0) {
    state = initialRootState;
  }

  switch (action.type) {
    case RECEIVE_STATE:
      return state.setIn(["resourcesById", action.resourceId], action.state);

    default:
      return state;
  }
};

const store = createStore(rootReducer);
const selectResource = function selectResource(state, _ref) {
  if (state === void 0) {
    state = initialRootState;
  }

  let resourceId = _ref.resourceId;
  return state.getIn(["resourcesById", resourceId]);
};

const Context = createContext({
  registerError: () => {}
});

const createResource = curry((entryGetter, entrySetter, entryPredicate, loader) => {
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
  return {
    id: resourceId,
    getState: getResourceState,
    setState: setResourceState,
    refresh: function refresh() {
      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      return loader(...args).then(setEntryState(args));
    },
    useEntryState: function useEntryState() {
      const resourceState = getResourceState();

      for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2];
      }

      const _useState = useState(entryGetter(resourceState, args)),
            state = _useState[0],
            setState = _useState[1];

      const _useContext = useContext(Context),
            registerError = _useContext.registerError;

      const entryId = args.length ? args.join("-") : "INDEX";
      useEffect(() => // Important! The return value is used to unsubscribe from the store
      subscribe(() => {
        const nextState = getResourceState();

        if (nextState !== state) {
          setState(nextState);
        }
      }), [state]);

      if (pendingLoaders.get(entryId)) {
        throw pendingLoaders.get(entryId);
      }

      if (!entryPredicate(entryGetter(resourceState, args), args)) {
        pendingLoaders.set(entryId, loader(...args).then(setEntryState(args)).catch(registerError).finally(() => {
          pendingLoaders.delete(entryId);
        }));
        throw pendingLoaders.get(entryId);
      }

      return [state, useCallback(setEntryState(args), args)];
    },
    subscribe
  };
});

const createKeyedResource = curry((createKey, loader) => createResource(function (resourceState, args) {
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
}, entryState => !!entryState, loader));

const createSingleEntryResource = loader => createResource(resourceState => resourceState, (resourceState, args, data) => data, entryState => !!entryState, loader);

const createTimedKeyedResource = curry((ms, createKey, loader) => {
  const updatedAt = new Map();
  return createResource(function (resourceState, args) {
    if (resourceState === void 0) {
      resourceState = {};
    }

    return resourceState[createKey(...args)];
  }, function (resourceState, args, data) {
    if (resourceState === void 0) {
      resourceState = {};
    }

    const key = createKey(...args);
    updatedAt.set(key, Date.now());
    return _extends({}, resourceState, {
      [key]: data
    });
  }, (entryState, args) => !!entryState && updatedAt.get(createKey(...args)) + ms < Date.now(), loader);
});

const createTimedSingleEntryResource = curry((ms, loader) => {
  let updatedAt = 0;
  return createResource(resourceState => resourceState, (resourceState, args, data) => {
    updatedAt = Date.now();
    return data;
  }, entryState => !!entryState && updatedAt + ms < Date.now(), loader);
});

const RemoteResourceBoundary = (_ref) => {
  let children = _ref.children,
      _ref$onLoadError = _ref.onLoadError,
      onLoadError = _ref$onLoadError === void 0 ? () => {} : _ref$onLoadError,
      _ref$fallback = _ref.fallback,
      fallback = _ref$fallback === void 0 ? null : _ref$fallback,
      _ref$renderError = _ref.renderError,
      renderError = _ref$renderError === void 0 ? error => null : _ref$renderError;

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
  }, error.map(err => renderError(err, clearError)).getOrElse(React.createElement(Suspense, {
    fallback: fallback
  }, children)));
};

const useAutoSave = function useAutoSave(value, save, delay) {
  if (delay === void 0) {
    delay = 1000;
  }

  useEffect(() => {
    const timeout = setTimeout(() => save(value), delay);
    return () => {
      clearTimeout(timeout);
    };
  }, [value]);
  useEffect(() => () => {
    if (value) {
      save(value);
    }
  }, []);
};

const useEntryState = function useEntryState(resource, args) {
  if (args === void 0) {
    args = [];
  }

  return resource.useEntryState(...args);
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

  return () => setTask(fn().then(() => {
    if (mounted.current) {
      setTask(null);
    }
  }).catch(() => {
    if (mounted.current) {
      setTask(null);
    }
  }));
};

export { createKeyedResource, createResource, createSingleEntryResource, createTimedKeyedResource, createTimedSingleEntryResource, RemoteResourceBoundary, useAutoSave, useEntryState, useSuspense };
