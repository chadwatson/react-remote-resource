'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var React = require('react');
var React__default = _interopDefault(React);
var redux = require('redux');
var immutable = require('immutable');
var Maybe = _interopDefault(require('data.maybe'));

var Context = React.createContext({
  registerError: function registerError() {}
});

var createTaskManager = function createTaskManager() {
  var tasks = new Map();
  return {
    has: function has(key) {
      return tasks.has(key);
    },
    get: function get(key) {
      return tasks.get(key);
    },
    run: function run(key, task) {
      return tasks.get(key) || tasks.set(key, task().then(function (x) {
        tasks.delete(key);
        return x;
      }).catch(function (error) {
        tasks.delete(key);
        throw error;
      })).get(key);
    }
  };
};

var REGISTER_RESOURCE = "REGISTER_RESOURCE";
var RECEIVE_DATA = "RECEIVE_DATA";
var DELETE_ENTRY = "DELETE_ENTRY";
var SUBSCRIPTION_STARTED = "SUBSCRIPTION_STARTED";
var SUBSCRIPTION_ENDED = "SUBSCRIPTION_ENDED";
var store = redux.createStore(function (state, action) {
  if (state === void 0) {
    state = immutable.Map();
  }

  switch (action.type) {
    case REGISTER_RESOURCE:
      return state.set(action.resourceId, immutable.Map());

    case RECEIVE_DATA:
      return state.setIn([action.resourceId, action.entryKey], immutable.Map({
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

var defaultCreateCacheKey = function defaultCreateCacheKey(args) {
  return args.join("-") || "INDEX";
};

var createRemoteResource = function createRemoteResource(_ref) {
  var resourceId = _ref.id,
      _ref$load = _ref.load,
      loader = _ref$load === void 0 ? function () {
    return Promise.resolve();
  } : _ref$load,
      _ref$save = _ref.save,
      save = _ref$save === void 0 ? function () {
    return Promise.resolve();
  } : _ref$save,
      _ref$delete = _ref.delete,
      destroy = _ref$delete === void 0 ? function () {
    return Promise.resolve();
  } : _ref$delete,
      _ref$subscribe = _ref.subscribe,
      subscribe = _ref$subscribe === void 0 ? function () {
    return function () {};
  } : _ref$subscribe,
      _ref$initialValue = _ref.initialValue,
      initialValue = _ref$initialValue === void 0 ? null : _ref$initialValue,
      _ref$invalidateAfter = _ref.invalidateAfter,
      invalidateAfter = _ref$invalidateAfter === void 0 ? 300000 : _ref$invalidateAfter,
      _ref$createEntryKey = _ref.createEntryKey,
      createEntryKey = _ref$createEntryKey === void 0 ? defaultCreateCacheKey : _ref$createEntryKey;
  store.dispatch({
    type: REGISTER_RESOURCE,
    resourceId: resourceId
  });
  var loadTasks = createTaskManager();
  var saveTasks = createTaskManager();
  var deleteTasks = createTaskManager();

  var selectEntry = function selectEntry(entryKey) {
    return Maybe.fromNullable(store.getState().getIn([resourceId, entryKey]));
  };

  var selectData = function selectData(maybeEntry) {
    return maybeEntry.map(function (state) {
      return state.get("data");
    }).getOrElse(initialValue);
  };

  var selectUpdatedAt = function selectUpdatedAt(maybeEntry) {
    return maybeEntry.map(function (state) {
      return state.get("updatedAt");
    });
  };

  var selectHasSubscription = function selectHasSubscription(maybeEntry) {
    return maybeEntry.map(function (state) {
      return state.get("hasSubscription");
    }).getOrElse(false);
  };

  var load = function load() {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    var entryKey = createEntryKey(args);
    return loadTasks.run(entryKey, function () {
      return loader.apply(void 0, args).then(function (data) {
        store.dispatch({
          type: RECEIVE_DATA,
          now: Date.now(),
          entryKey: createEntryKey(args),
          data: data,
          resourceId: resourceId
        });
        return data;
      });
    });
  };

  return function () {
    for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      args[_key2] = arguments[_key2];
    }

    var entryKey = createEntryKey(args);

    var _useContext = React.useContext(Context),
        registerError = _useContext.registerError;

    var _useState = React.useState(selectEntry(entryKey)),
        entry = _useState[0],
        setEntry = _useState[1];

    var data = selectData(entry);
    var hasSubscription = selectHasSubscription(entry);
    var cacheInvalid = selectUpdatedAt(entry).map(function (updatedAt) {
      return updatedAt + invalidateAfter < Date.now();
    }).getOrElse(true);
    React.useEffect(function () {
      return store.subscribe(function () {
        var nextEntry = selectEntry(entryKey);

        if (nextEntry !== entry) {
          setEntry(nextEntry);
        }
      });
    }, [entryKey]); // We only load on the first render if the cache is invalid

    var renderCount = React.useRef(0);
    renderCount.current = renderCount.current + 1;

    if (renderCount.current === 1 && cacheInvalid && !loadTasks.has(entryKey)) {
      load.apply(void 0, args).catch(registerError);
    } // We only suspend while the initial load is outstanding


    if (cacheInvalid && loadTasks.has(entryKey)) {
      throw loadTasks.get(entryKey);
    }

    var setCache = React.useCallback(function (valueOrUpdate) {
      var newData = typeof valueOrUpdate == "function" ? valueOrUpdate(data) : valueOrUpdate;
      store.dispatch({
        type: RECEIVE_DATA,
        now: Date.now(),
        data: newData,
        entryKey: entryKey,
        resourceId: resourceId
      });
      return newData;
    }, [data]);
    var actions = {
      refresh: React.useCallback(function () {
        return load.apply(void 0, args).catch(registerError);
      }, []),
      setCache: setCache,
      deleteCache: React.useCallback(function () {
        store.dispatch({
          type: DELETE_ENTRY,
          entryKey: entryKey,
          resourceId: resourceId
        });
        return data;
      }, [data]),
      remoteSave: React.useCallback(function (newData) {
        return saveTasks.run(entryKey, function () {
          return save(newData);
        });
      }, []),
      remoteDelete: React.useCallback(function () {
        return deleteTasks.run(entryKey, function () {
          return destroy(data);
        });
      }, [data]),
      subscribe: React.useCallback(function () {
        // we only want one subscription running for each entry at a time
        if (hasSubscription) {
          return;
        }

        store.dispatch({
          type: SUBSCRIPTION_STARTED,
          entryKey: entryKey,
          resourceId: resourceId
        });
        var cleanup = subscribe(setCache).apply(void 0, args);
        return function () {
          cleanup();
          store.dispatch({
            type: SUBSCRIPTION_ENDED,
            entryKey: entryKey,
            resourceId: resourceId
          });
        };
      }, [hasSubscription])
    };
    return [selectData(entry), actions];
  };
};

var RemoteResourceBoundary = function RemoteResourceBoundary(_ref) {
  var children = _ref.children,
      onLoadError = _ref.onLoadError,
      _ref$fallback = _ref.fallback,
      fallback = _ref$fallback === void 0 ? null : _ref$fallback,
      _ref$renderError = _ref.renderError,
      renderError = _ref$renderError === void 0 ? function (error) {
    return null;
  } : _ref$renderError;

  var _useState = React.useState(Maybe.Nothing()),
      error = _useState[0],
      setError = _useState[1];

  var providerValue = React.useMemo(function () {
    return {
      registerError: function registerError(error) {
        setError(Maybe.of(error));
        onLoadError(error);
      }
    };
  }, [onLoadError]);
  var clearError = React.useCallback(function () {
    setError(Maybe.Nothing());
  }, []);
  return React__default.createElement(Context.Provider, {
    value: providerValue
  }, error.map(function (err) {
    return renderError(err, clearError);
  }).getOrElse(React__default.createElement(React.Suspense, {
    fallback: fallback
  }, children)));
};

/**
 * Makes a resource "optimistic".
 */
var useOptimism = function useOptimism(_ref) {
  var data = _ref[0],
      actions = _ref[1];
  return [data, // Save. Updates cache first then saves to the remote
  function () {
    actions.setCache.apply(actions, arguments);
    return actions.remoteSave.apply(actions, arguments);
  }, // Delete. Deletes the cache first then deletes from the remote
  function () {
    actions.deleteCache.apply(actions, arguments);
    return actions.remoteDelete.apply(actions, arguments);
  }];
};

/**
 * Makes a resource "pessimistic".
 */
var usePessimism = function usePessimism(_ref) {
  var data = _ref[0],
      actions = _ref[1];
  return [data, {
    refresh: actions.refresh,
    // Saves to the remote first, then if it succeeds it updates the cache
    save: function save() {
      return actions.remoteSave.apply(actions, arguments).then(actions.setCache);
    },
    // Deletes from the remote first, then if it succeeds it deletes the cache
    delete: function _delete() {
      return actions.remoteDelete.apply(actions, arguments).then(actions.deleteCache);
    }
  }];
};

var useSubscribe = function useSubscribe(resource) {
  React.useEffect(resource.actions.subscribe, [resource.actions]);
  return resource;
};

var useSuspense = function useSuspense(fn) {
  var _useState = React.useState(null),
      task = _useState[0],
      setTask = _useState[1];

  var mounted = React.useRef(true);
  React.useEffect(function () {
    return function () {
      mounted.current = false;
    };
  }, []);

  if (task) {
    throw task;
  }

  return function () {
    return setTask(fn().then(function () {
      if (mounted.current) {
        setTask(null);
      }
    }).catch(function () {
      if (mounted.current) {
        setTask(null);
      }
    }));
  };
};

exports.createRemoteResource = createRemoteResource;
exports.RemoteResourceBoundary = RemoteResourceBoundary;
exports.useOptimism = useOptimism;
exports.usePessimism = usePessimism;
exports.useSubscribe = useSubscribe;
exports.useSuspense = useSuspense;
