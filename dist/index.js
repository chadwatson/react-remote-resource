import _extends from '@babel/runtime/helpers/esm/extends';
import uuid from 'uuid/v1';
import { createStore } from 'redux';
import { isNil } from 'ramda';
import { Record, Map } from 'immutable';
import Maybe from 'data.maybe';
import React, { createContext, useState, useMemo, useCallback, Suspense, useContext, useEffect, useRef } from 'react';

const LOADING_ENTRY = "LOADING_ENTRY";
const LOADING_ENTRY_FAILED = "LOADING_ENTRY_FAILED";
const RECEIVE_ENTRY_DATA = "RECEIVE_ENTRY_DATA";
const Entry = Record({
  id: "",
  data: Maybe.Nothing(),
  updatedAt: Maybe.Nothing(),
  loadPromise: Maybe.Nothing()
}, "RemoteResourceEntry");

const entryReducer = function entryReducer(state, action) {
  if (state === void 0) {
    state = Entry();
  }

  switch (action.type) {
    case LOADING_ENTRY:
      return state.merge({
        id: action.entryId,
        loadPromise: Maybe.of(action.promise)
      });

    case LOADING_ENTRY_FAILED:
      return state.merge({
        id: action.entryId,
        loadPromise: Maybe.Nothing()
      });

    case RECEIVE_ENTRY_DATA:
      return state.merge({
        id: action.entryId,
        data: Maybe.fromNullable(action.data),
        updatedAt: isNil(action.data) ? Maybe.Nothing() : Maybe.of(action.now),
        loadPromise: Maybe.Nothing()
      });

    default:
      return state;
  }
};

const initialResourceState = Map({
  entriesById: Map()
});

const resourceReducer = function resourceReducer(state, action) {
  if (state === void 0) {
    state = initialResourceState;
  }

  switch (action.type) {
    case RECEIVE_ENTRY_DATA:
      return state.updateIn(["entriesById", action.entryId], entryState => entryReducer(entryState, action));

    default:
      return state;
  }
};

const initialRootState = Map({
  resourcesById: Map()
});

const rootReducer = function rootReducer(state, action) {
  if (state === void 0) {
    state = initialRootState;
  }

  switch (action.type) {
    case RECEIVE_ENTRY_DATA:
      return state.updateIn(["resourcesById", action.resourceId], resourceState => resourceReducer(resourceState, action));

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
  return Maybe.fromNullable(state.getIn(["resourcesById", resourceId]));
};
const selectEntry = function selectEntry(state, _ref2) {
  if (state === void 0) {
    state = initialRootState;
  }

  let resourceId = _ref2.resourceId,
      entryId = _ref2.entryId;
  return selectResource(state, {
    resourceId
  }).chain(resource => Maybe.fromNullable(resource.getIn(["entriesById", entryId])));
};

const createRemoteResource = (_ref) => {
  let _ref$load = _ref.load,
      load = _ref$load === void 0 ? () => Promise.resolve() : _ref$load,
      _ref$save = _ref.save,
      save = _ref$save === void 0 ? () => Promise.resolve() : _ref$save,
      _ref$delete = _ref.delete,
      destroy = _ref$delete === void 0 ? () => Promise.resolve() : _ref$delete,
      _ref$initialValue = _ref.initialValue,
      initialValue = _ref$initialValue === void 0 ? null : _ref$initialValue,
      _ref$invalidateAfter = _ref.invalidateAfter,
      invalidateAfter = _ref$invalidateAfter === void 0 ? 300000 : _ref$invalidateAfter,
      _ref$createEntryId = _ref.createEntryId,
      createEntryId = _ref$createEntryId === void 0 ? function () {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return args.join("-") || "INDEX";
  } : _ref$createEntryId;
  const resourceId = uuid();
  return {
    id: resourceId,
    createEntryId,
    initialValue,
    invalidateAfter,
    load,
    save,
    delete: destroy,
    getEntry: entryId => selectEntry(store.getState(), {
      resourceId,
      entryId
    }),
    onChange: _onChange => {
      let currentState = selectResource(store.getState(), {
        resourceId
      });
      return store.subscribe(() => {
        const nextResourceState = selectResource(store.getState(), {
          resourceId
        });

        if (nextResourceState !== currentState) {
          currentState = nextResourceState;

          _onChange();
        }
      });
    },
    dispatch: action => store.dispatch(_extends({}, action, {
      resourceId
    }))
  };
};

const Context = createContext({
  registerError: () => {}
});

const RemoteResourceBoundary = (_ref) => {
  let children = _ref.children,
      onLoadError = _ref.onLoadError,
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

const useResourceActions = function useResourceActions(resource, args) {
  if (args === void 0) {
    args = [];
  }

  const entryId = resource.createEntryId(...args);

  const _useContext = useContext(Context),
        registerError = _useContext.registerError;

  const data = resource.getEntry(entryId).chain(entry => entry.data).getOrElse(resource.initialValue);
  const actions = {
    set: useCallback(nextData => {
      resource.dispatch({
        type: RECEIVE_ENTRY_DATA,
        entryId,
        data: typeof nextData === "function" ? nextData(data) : nextData,
        now: Date.now()
      });
    }, [data]),
    refresh: () => resource.load(...args).then(data => {
      resource.dispatch({
        type: RECEIVE_ENTRY_DATA,
        entryId,
        data,
        now: Date.now()
      });
    }).catch(error => {
      registerError(error);
      resource.dispatch({
        type: LOADING_ENTRY_FAILED,
        entryId
      });
    })
  };

  if (resource.save) {
    actions.save = resource.save;
  }

  if (resource.delete) {
    actions.delete = resource.delete;
  }

  return actions;
};

const useFirstRender = () => {
  const renderCount = useRef(0);
  renderCount.current = renderCount.current + 1;
  return renderCount.current === 1;
};

const useResourceState = function useResourceState(resource, args) {
  if (args === void 0) {
    args = [];
  }

  const entryId = resource.createEntryId(...args);

  const _useState = useState(resource.getEntry(entryId)),
        maybeEntry = _useState[0],
        setEntry = _useState[1];

  const data = maybeEntry.chain(entry => entry.data).getOrElse(resource.initialValue);
  const cacheInvalid = maybeEntry.map(entry => entry.updatedAt + resource.invalidateAfter < Date.now()).getOrElse(data === resource.initialValue);
  const loadPromise = maybeEntry.chain(entry => entry.loadPromise).getOrElse(null);
  const actions = useResourceActions(resource, args);
  useEffect(() => // Important! The return value is used to unsubsribe from the store when necessary.
  resource.onChange(() => {
    setEntry(resource.getEntry(entryId));
  }), [entryId]);
  const isFirstRender = useFirstRender();

  if (isFirstRender && cacheInvalid && !loadPromise) {
    const promise = actions.refresh(); // We need to store the promise so that if the component gets re-mounted
    // while the promise is pending we have the ability to throw it.

    resource.dispatch({
      type: LOADING_ENTRY,
      entryId,
      promise
    });
    throw promise;
  } else if (loadPromise) {
    throw loadPromise;
  }

  return [data, useCallback(nextData => {
    resource.dispatch({
      type: RECEIVE_ENTRY_DATA,
      entryId,
      data: typeof nextData === "function" ? nextData(data) : nextData,
      now: Date.now()
    });
  }, [data])];
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

export { createRemoteResource, RemoteResourceBoundary, useResourceState, useResourceActions, useSuspense };
