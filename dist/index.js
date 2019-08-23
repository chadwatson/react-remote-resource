import { createStore } from 'redux';
import { Map as Map$1 } from 'immutable';
import _extends from '@babel/runtime/helpers/esm/extends';
import hash from 'object-hash';
import React, { createContext, useRef, useState, useContext, useEffect, useCallback, useMemo, Suspense } from 'react';
import uuid from 'uuid/v1';
import { equals, curry } from 'ramda';
import Maybe from 'data.maybe';

const RECEIVE_STATE = "RECEIVE_STATE";
const RECEIVE_BATCH_STATE = "RECEIVE_BATCH_STATE";
const RESET_ALL_RESOURCES = "RESET_ALL_RESOURCES";
const RESET_RESOURCES = "RESET_RESOURCES";
const initialRootState = Map$1({
  resourcesById: Map$1()
});

const rootReducer = (state, action) => {
  switch (action.type) {
    case RECEIVE_STATE:
      return state.setIn(["resourcesById", action.resourceId], action.state);

    case RECEIVE_BATCH_STATE:
      return state.update("resourcesById", resourcesById => action.payload.reduce((acc, _ref) => {
        let resource = _ref[0],
            nextState = _ref[1];
        return acc.update(resource.id, resourceState => typeof nextState === "function" ? nextState(resourceState) : nextState);
      }, resourcesById));

    case RESET_ALL_RESOURCES:
      return state.update("resourcesById", resources => resources.clear());

    case RESET_RESOURCES:
      return state.update("resourcesById", resources => resources.withMutations(mutableResources => action.resources.forEach((_ref2) => {
        let id = _ref2.id;
        mutableResources.delete(id);
      })));

    default:
      return state;
  }
};

const store = createStore(rootReducer, initialRootState);
const selectResource = (state, _ref3) => {
  let resourceId = _ref3.resourceId;
  return state.getIn(["resourcesById", resourceId]);
};

const batchSetState = function batchSetState() {
  for (var _len = arguments.length, items = new Array(_len), _key = 0; _key < _len; _key++) {
    items[_key] = arguments[_key];
  }

  store.dispatch({
    type: RECEIVE_BATCH_STATE,
    payload: items
  });
};

const Context = createContext({
  registerError: () => {}
});

const createResource = (_ref) => {
  let selectState = _ref.selectState,
      setState = _ref.setState,
      loader = _ref.loader,
      _ref$hasState = _ref.hasState,
      hasState = _ref$hasState === void 0 ? value => value !== undefined : _ref$hasState;
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

  const setEntryState = args => state => setResourceState(setState(getResourceState(), args, state));

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
    useState: function useState$1() {
      for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2];
      }

      const renderCount = useRef(0);
      renderCount.current += 1;
      const resourceState = getResourceState();
      const entryState = selectState(resourceState, args);

      const _useState2 = useState(entryState),
            setState = _useState2[1];

      const _useContext = useContext(Context),
            registerError = _useContext.registerError;

      const entryId = args.length ? args.join("-") : "INDEX";
      useEffect(() => {
        let prevState = entryState; // Important! The return value is used to unsubscribe from the store

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
        pendingLoaders.set(entryId, loader(...args).then(setEntryState(args)).catch(registerError).finally(() => {
          pendingLoaders.delete(entryId);
        }));
        throw pendingLoaders.get(entryId);
      }

      return [entryState, useCallback(setEntryState(args), args)];
    },
    subscribe
  };
};

const createKeyedResource = function createKeyedResource(loader, createKey) {
  if (createKey === void 0) {
    createKey = function createKey() {
      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      return hash(args);
    };
  }

  return createResource({
    selectState: function selectState(resourceState, args) {
      if (resourceState === void 0) {
        resourceState = {};
      }

      return resourceState[createKey(...args)];
    },
    setState: function setState(resourceState, args, data) {
      if (resourceState === void 0) {
        resourceState = {};
      }

      const key = createKey(...args);
      return _extends({}, resourceState, {
        [key]: typeof data === "function" ? data(resourceState[key]) : data
      });
    },
    loader
  });
};

const createSimpleResource = loader => {
  let currentArgs = [];
  return createResource({
    loader,
    selectState: state => state,
    setState: function setState(_, args, data) {
      if (args === void 0) {
        args = [];
      }

      currentArgs = args;
      return data;
    },
    hasState: function hasState(state, args) {
      if (args === void 0) {
        args = [];
      }

      return state !== undefined && (!currentArgs.length || equals(args, currentArgs));
    }
  });
};

const persistResource = (getInitialState, persistState, resource) => {
  let loader = null;
  return _extends({}, resource, {
    useState: function useState() {
      const resourceState = resource.getState();

      if (resourceState === undefined) {
        loader = getInitialState().then(resource.setState).then(() => resource.subscribe(() => {
          persistState(resource.getState());
        })).finally(() => {
          loader = null;
        });
      }

      if (loader) {
        throw loader;
      }

      return resource.useState(...arguments);
    }
  });
};

const provideContext = curry((provider, resource) => _extends({}, resource, {
  useState: function useState() {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return resource.useState(provider(...args), ...args);
  }
}));

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

const resetAllResources = () => store.dispatch({
  type: RESET_ALL_RESOURCES
});

const resetResources = resources => store.dispatch({
  type: RESET_RESOURCES,
  resources
});

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

export { RemoteResourceBoundary, batchSetState, createKeyedResource, createResource, createSimpleResource, persistResource, provideContext, resetAllResources, resetResources, useAutoSave, useSuspense };
