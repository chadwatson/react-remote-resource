'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var _extends = _interopDefault(require('@babel/runtime/helpers/extends'));
var uuid = _interopDefault(require('uuid/v1'));
var redux = require('redux');
var ramda = require('ramda');
var immutable = require('immutable');
var Maybe = _interopDefault(require('data.maybe'));
var React = require('react');
var React__default = _interopDefault(React);

var LOADING_ENTRY = "LOADING_ENTRY";
var LOADING_ENTRY_FAILED = "LOADING_ENTRY_FAILED";
var RECEIVE_ENTRY_DATA = "RECEIVE_ENTRY_DATA";
var Entry = immutable.Record({
  id: "",
  data: Maybe.Nothing(),
  updatedAt: Maybe.Nothing(),
  loadPromise: Maybe.Nothing()
}, "RemoteResourceEntry");

var entryReducer = function entryReducer(state, action) {
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
        updatedAt: ramda.isNil(action.data) ? Maybe.Nothing() : Maybe.of(action.now),
        loadPromise: Maybe.Nothing()
      });

    default:
      return state;
  }
};

var initialResourceState = immutable.Map({
  entriesById: immutable.Map()
});

var resourceReducer = function resourceReducer(state, action) {
  if (state === void 0) {
    state = initialResourceState;
  }

  switch (action.type) {
    case RECEIVE_ENTRY_DATA:
      return state.updateIn(["entriesById", action.entryId], function (entryState) {
        return entryReducer(entryState, action);
      });

    default:
      return state;
  }
};

var initialRootState = immutable.Map({
  resourcesById: immutable.Map()
});

var rootReducer = function rootReducer(state, action) {
  if (state === void 0) {
    state = initialRootState;
  }

  switch (action.type) {
    case RECEIVE_ENTRY_DATA:
      return state.updateIn(["resourcesById", action.resourceId], function (resourceState) {
        return resourceReducer(resourceState, action);
      });

    default:
      return state;
  }
};

var store = redux.createStore(rootReducer);
var selectResource = function selectResource(state, _ref) {
  if (state === void 0) {
    state = initialRootState;
  }

  var resourceId = _ref.resourceId;
  return Maybe.fromNullable(state.getIn(["resourcesById", resourceId]));
};
var selectEntry = function selectEntry(state, _ref2) {
  if (state === void 0) {
    state = initialRootState;
  }

  var resourceId = _ref2.resourceId,
      entryId = _ref2.entryId;
  return selectResource(state, {
    resourceId: resourceId
  }).chain(function (resource) {
    return Maybe.fromNullable(resource.getIn(["entriesById", entryId]));
  });
};

var createRemoteResource = function createRemoteResource(_ref) {
  var _ref$load = _ref.load,
      load = _ref$load === void 0 ? function () {
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
  var resourceId = uuid();
  return {
    id: resourceId,
    createEntryId: createEntryId,
    initialValue: initialValue,
    invalidateAfter: invalidateAfter,
    load: load,
    save: save,
    delete: destroy,
    getEntry: function getEntry(entryId) {
      return selectEntry(store.getState(), {
        resourceId: resourceId,
        entryId: entryId
      });
    },
    onChange: function onChange(_onChange) {
      var currentState = selectResource(store.getState(), {
        resourceId: resourceId
      });
      return store.subscribe(function () {
        var nextResourceState = selectResource(store.getState(), {
          resourceId: resourceId
        });

        if (nextResourceState !== currentState) {
          currentState = nextResourceState;

          _onChange();
        }
      });
    },
    dispatch: function dispatch(action) {
      return store.dispatch(_extends({}, action, {
        resourceId: resourceId
      }));
    }
  };
};

var Context = React.createContext({
  registerError: function registerError() {}
});

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

var useResourceActions = function useResourceActions(resource, args) {
  if (args === void 0) {
    args = [];
  }

  var entryId = resource.createEntryId.apply(resource, args);

  var _useContext = React.useContext(Context),
      registerError = _useContext.registerError;

  var data = resource.getEntry(entryId).chain(function (entry) {
    return entry.data;
  }).getOrElse(resource.initialValue);
  var actions = {
    set: React.useCallback(function (nextData) {
      resource.dispatch({
        type: RECEIVE_ENTRY_DATA,
        entryId: entryId,
        data: typeof nextData === "function" ? nextData(data) : nextData,
        now: Date.now()
      });
    }, [data]),
    refresh: function refresh() {
      return resource.load.apply(resource, args).then(function (data) {
        resource.dispatch({
          type: RECEIVE_ENTRY_DATA,
          entryId: entryId,
          data: data,
          now: Date.now()
        });
      }).catch(function (error) {
        registerError(error);
        resource.dispatch({
          type: LOADING_ENTRY_FAILED,
          entryId: entryId
        });
      });
    }
  };

  if (resource.save) {
    actions.save = resource.save;
  }

  if (resource.delete) {
    actions.delete = resource.delete;
  }

  return actions;
};

var useFirstRender = function useFirstRender() {
  var renderCount = React.useRef(0);
  renderCount.current = renderCount.current + 1;
  return renderCount.current === 1;
};

var useResourceState = function useResourceState(resource, args) {
  if (args === void 0) {
    args = [];
  }

  var entryId = resource.createEntryId.apply(resource, args);

  var _useState = React.useState(resource.getEntry(entryId)),
      maybeEntry = _useState[0],
      setEntry = _useState[1];

  var data = maybeEntry.chain(function (entry) {
    return entry.data;
  }).getOrElse(resource.initialValue);
  var cacheInvalid = maybeEntry.map(function (entry) {
    return entry.updatedAt + resource.invalidateAfter < Date.now();
  }).getOrElse(data === resource.initialValue);
  var loadPromise = maybeEntry.chain(function (entry) {
    return entry.loadPromise;
  }).getOrElse(null);
  var actions = useResourceActions(resource, args);
  React.useEffect(function () {
    return (// Important! The return value is used to unsubsribe from the store when necessary.
      resource.onChange(function () {
        setEntry(resource.getEntry(entryId));
      })
    );
  }, [entryId]);
  var isFirstRender = useFirstRender();

  if (isFirstRender && cacheInvalid && !loadPromise) {
    var promise = actions.refresh(); // We need to store the promise so that if the component gets re-mounted
    // while the promise is pending we have the ability to throw it.

    resource.dispatch({
      type: LOADING_ENTRY,
      entryId: entryId,
      promise: promise
    });
    throw promise;
  } else if (loadPromise) {
    throw loadPromise;
  }

  return [data, React.useCallback(function (nextData) {
    resource.dispatch({
      type: RECEIVE_ENTRY_DATA,
      entryId: entryId,
      data: typeof nextData === "function" ? nextData(data) : nextData,
      now: Date.now()
    });
  }, [data])];
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
exports.useResourceState = useResourceState;
exports.useResourceActions = useResourceActions;
exports.useSuspense = useSuspense;
