import _extends from '@babel/runtime/helpers/esm/extends';
import uuid from 'uuid/v1';
import { createStore } from 'redux';
import { Map as Map$1 } from 'immutable';
import React, { createContext, useState, useMemo, useCallback, Suspense, useEffect, useContext, useRef } from 'react';
import Maybe from 'data.maybe';
import { curry } from 'ramda';

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

const createRemoteResource = loader => {
  const resourceId = uuid();

  const getResourceState = () => selectResource(store.getState(), {
    resourceId
  });

  const setResourceState = nextState => {
    dispatch({
      type: RECEIVE_STATE,
      state: typeof nextState === "function" ? nextState(getResourceState()) : nextState
    });
  };

  const dispatch = action => store.dispatch(_extends({}, action, {
    resourceId
  }));

  return {
    id: resourceId,
    loader,
    refresh: function refresh() {
      return loader(getResourceState(), true)(...arguments).then(setResourceState);
    },
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

const once = fn => (currentState, refresh) => refresh || !currentState ? fn : () => currentState;

const Context = createContext({
  registerError: () => {}
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

const useIsFirstRender = fn => {
  const renderCount = useRef(0);
  renderCount.current = renderCount.current + 1;
  return renderCount.current === 1;
};

const useResourceState = function useResourceState(resource, args) {
  if (args === void 0) {
    args = [];
  }

  const _useState = useState(resource.getState()),
        state = _useState[0],
        setState = _useState[1];

  const _useContext = useContext(Context),
        registerError = _useContext.registerError;

  const entryId = args.length ? args.join("-") : "INDEX";
  useEffect(() => // Important! The return value is used to unsubscribe from the store
  resource.subscribe(() => {
    const nextState = resource.getState();

    if (nextState !== state) {
      setState(nextState);
    }
  }), [state]);
  const isFirstRender = useIsFirstRender();

  if (isFirstRender && !resource.pendingLoaders.promisesById.get(entryId) && !resource.pendingLoaders.queue.length) {
    const result = resource.loader(resource.getState(), false)(...args);

    if (result instanceof Promise) {
      const pending = result.then(resource.setState).catch(registerError).finally(() => {
        resource.pendingLoaders.promisesById.delete(entryId);
        resource.pendingLoaders.queue.shift();
      });
      resource.pendingLoaders.queue.push(entryId);
      resource.pendingLoaders.promisesById.set(entryId, pending);
      throw pending;
    } else {
      resource.setState(result);
    }
  } else if (resource.pendingLoaders.promisesById.get(resource.pendingLoaders.queue[0])) {
    throw resource.pendingLoaders.promisesById.get(resource.pendingLoaders.queue[0]);
  }

  return [state, resource.setState];
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

const withLens = curry((getter, setter, loader) => (currentState, refresh) => function () {
  return refresh || !getter(currentState)(...arguments) ? loader(...arguments).then(setter(currentState)(...arguments)) : currentState;
});

const withTimeout = curry((ms, loader) => {
  let lastFetch = null;
  return (currentState, refresh) => function () {
    const now = Date.now();

    if (refresh || lastFetch + ms < now) {
      lastFetch = now;
      return loader(currentState, true)(...arguments);
    }

    return currentState;
  };
});

export { createRemoteResource, once, RemoteResourceBoundary, useAutoSave, useResourceState, useSuspense, withLens, withTimeout };
