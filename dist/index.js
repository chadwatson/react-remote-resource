import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import { createStore } from 'redux';
import { Map as Map$1 } from 'immutable';
import Maybe from 'data.maybe';

const Context = createContext({
  registerError: () => {}
});

const createTaskManager = () => {
  const tasks = new Map();
  return {
    has: key => tasks.has(key),
    get: key => tasks.get(key),
    run: (key, task) => tasks.get(key) || tasks.set(key, task().then(x => {
      tasks.delete(key);
      return x;
    }).catch(error => {
      tasks.delete(key);
      throw error;
    })).get(key)
  };
};

const REGISTER_RESOURCE = "REGISTER_RESOURCE";
const RECEIVE_DATA = "RECEIVE_DATA";
const DELETE_ENTRY = "DELETE_ENTRY";
const SUBSCRIPTION_STARTED = "SUBSCRIPTION_STARTED";
const SUBSCRIPTION_ENDED = "SUBSCRIPTION_ENDED";
const store = createStore(function (state, action) {
  if (state === void 0) {
    state = Map$1();
  }

  switch (action.type) {
    case REGISTER_RESOURCE:
      return state.set(action.resourceId, Map$1());

    case RECEIVE_DATA:
      return state.setIn([action.resourceId, action.entryKey], Map$1({
        updatedAt: action.now,
        data: action.data,
        hasSubscription: false
      }));

    case SUBSCRIPTION_STARTED:
      return state.setIn([action.resourceId, action.entryKey, "hasSubscription"], true);

    case SUBSCRIPTION_ENDED:
      return state.setIn([action.resourceId, action.entryKey, "hasSubscription"], false);

    case DELETE_ENTRY:
      return state.deleteIn([action.resourceId, action.entryKey]);

    default:
      return state;
  }
});

const defaultCreateCacheKey = args => args.join("-") || "INDEX";

const createRemoteResource = (_ref) => {
  let resourceId = _ref.id,
      _ref$load = _ref.load,
      loader = _ref$load === void 0 ? () => Promise.resolve() : _ref$load,
      _ref$save = _ref.save,
      save = _ref$save === void 0 ? () => Promise.resolve() : _ref$save,
      _ref$delete = _ref.delete,
      destroy = _ref$delete === void 0 ? () => Promise.resolve() : _ref$delete,
      _ref$subscribe = _ref.subscribe,
      subscribe = _ref$subscribe === void 0 ? () => () => {} : _ref$subscribe,
      _ref$initialValue = _ref.initialValue,
      initialValue = _ref$initialValue === void 0 ? null : _ref$initialValue,
      _ref$invalidateAfter = _ref.invalidateAfter,
      invalidateAfter = _ref$invalidateAfter === void 0 ? 300000 : _ref$invalidateAfter,
      _ref$createEntryKey = _ref.createEntryKey,
      createEntryKey = _ref$createEntryKey === void 0 ? defaultCreateCacheKey : _ref$createEntryKey;
  store.dispatch({
    type: REGISTER_RESOURCE,
    resourceId
  });
  const loadTasks = createTaskManager();
  const saveTasks = createTaskManager();
  const deleteTasks = createTaskManager();

  const selectEntry = entryKey => Maybe.fromNullable(store.getState().getIn([resourceId, entryKey]));

  const selectData = maybeEntry => maybeEntry.map(state => state.get("data")).getOrElse(initialValue);

  const selectUpdatedAt = maybeEntry => maybeEntry.map(state => state.get("updatedAt"));

  const selectHasSubscription = maybeEntry => maybeEntry.map(state => state.get("hasSubscription")).getOrElse(false);

  const load = function load() {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    const entryKey = createEntryKey(args);
    return loadTasks.run(entryKey, () => loader(...args).then(data => {
      store.dispatch({
        type: RECEIVE_DATA,
        now: Date.now(),
        entryKey: createEntryKey(args),
        data,
        resourceId
      });
      return data;
    }));
  };

  return function () {
    for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      args[_key2] = arguments[_key2];
    }

    const entryKey = createEntryKey(args);

    const _useContext = useContext(Context),
          registerError = _useContext.registerError;

    const _useState = useState(selectEntry(entryKey)),
          entry = _useState[0],
          setEntry = _useState[1];

    const data = selectData(entry);
    const hasSubscription = selectHasSubscription(entry);
    const cacheInvalid = selectUpdatedAt(entry).map(updatedAt => updatedAt + invalidateAfter < Date.now()).getOrElse(true);
    useEffect(() => {
      return store.subscribe(() => {
        const nextEntry = selectEntry(entryKey);

        if (nextEntry !== entry) {
          setEntry(nextEntry);
        }
      });
    }, [entryKey]); // We only load on the first render if the cache is invalid

    const renderCount = useRef(0);
    renderCount.current = renderCount.current + 1;

    if (renderCount.current === 1 && cacheInvalid && !loadTasks.has(entryKey)) {
      load(...args).catch(registerError);
    } // We only suspend while the initial load is outstanding


    if (cacheInvalid && loadTasks.has(entryKey)) {
      throw loadTasks.get(entryKey);
    }

    const setCache = useCallback(valueOrUpdate => {
      const newData = typeof valueOrUpdate == "function" ? valueOrUpdate(data) : valueOrUpdate;
      store.dispatch({
        type: RECEIVE_DATA,
        now: Date.now(),
        data: newData,
        entryKey,
        resourceId
      });
      return newData;
    }, [data]);
    const actions = {
      refresh: useCallback(() => load(...args).catch(registerError), []),
      setCache,
      deleteCache: useCallback(() => {
        store.dispatch({
          type: DELETE_ENTRY,
          entryKey,
          resourceId
        });
        return data;
      }, [data]),
      remoteSave: useCallback(newData => saveTasks.run(entryKey, () => save(newData)), []),
      remoteDelete: useCallback(() => deleteTasks.run(entryKey, () => destroy(data)), [data]),
      subscribe: useCallback(() => {
        // we only want one subscription running for each entry at a time
        if (hasSubscription) {
          return;
        }

        store.dispatch({
          type: SUBSCRIPTION_STARTED,
          entryKey,
          resourceId
        });
        const cleanup = subscribe(setCache)(...args);
        return () => {
          cleanup();
          store.dispatch({
            type: SUBSCRIPTION_ENDED,
            entryKey,
            resourceId
          });
        };
      }, [hasSubscription])
    };
    return [selectData(entry), actions];
  };
};

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

/**
 * Makes a resource "optimistic".
 */
const useOptimism = (_ref) => {
  let data = _ref[0],
      actions = _ref[1];
  return [data, // Save. Updates cache first then saves to the remote
  function () {
    actions.setCache(...arguments);
    return actions.remoteSave(...arguments);
  }, // Delete. Deletes the cache first then deletes from the remote
  function () {
    actions.deleteCache(...arguments);
    return actions.remoteDelete(...arguments);
  }];
};

/**
 * Makes a resource "pessimistic".
 */
const usePessimism = (_ref) => {
  let data = _ref[0],
      actions = _ref[1];
  return [data, {
    refresh: actions.refresh,
    // Saves to the remote first, then if it succeeds it updates the cache
    save: function save() {
      return actions.remoteSave(...arguments).then(actions.setCache);
    },
    // Deletes from the remote first, then if it succeeds it deletes the cache
    delete: function _delete() {
      return actions.remoteDelete(...arguments).then(actions.deleteCache);
    }
  }];
};

const useSubscribe = resource => {
  useEffect(resource.actions.subscribe, [resource.actions]);
  return resource;
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

export { createRemoteResource, RemoteResourceBoundary, useOptimism, usePessimism, useSubscribe, useSuspense };
