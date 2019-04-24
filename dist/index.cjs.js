'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var _extends = _interopDefault(require('@babel/runtime/helpers/extends'));
var ramda = require('ramda');
var React = require('react');
var React__default = _interopDefault(React);
var uuid = _interopDefault(require('uuid/v1'));
var redux = require('redux');
var immutable = require('immutable');
var Maybe = _interopDefault(require('data.maybe'));

var RECEIVE_STATE = "RECEIVE_STATE";
var initialRootState = immutable.Map({
  resourcesById: immutable.Map()
});

var rootReducer = function rootReducer(state, action) {
  switch (action.type) {
    case RECEIVE_STATE:
      return state.setIn(["resourcesById", action.resourceId], action.state);

    default:
      return state;
  }
};

var store = redux.createStore(rootReducer, initialRootState);
var selectResource = function selectResource(state, _ref) {
  var resourceId = _ref.resourceId;
  return state.getIn(["resourcesById", resourceId]);
};

var Context = React.createContext({
  registerError: function registerError() {}
});

var createResource = ramda.curryN(3, function (entryGetter, entrySetter, loader, entriesExpireAfter) {
  if (entriesExpireAfter === void 0) {
    entriesExpireAfter = Infinity;
  }

  var resourceId = uuid();

  var getResourceState = function getResourceState() {
    return selectResource(store.getState(), {
      resourceId: resourceId
    });
  };

  var setResourceState = function setResourceState(nextState) {
    store.dispatch({
      type: RECEIVE_STATE,
      resourceId: resourceId,
      state: typeof nextState === "function" ? nextState(getResourceState()) : nextState
    });
  };

  var setEntryState = ramda.curry(function (args, state) {
    return setResourceState(entrySetter(getResourceState(), args, state));
  });

  var subscribe = function subscribe(onChange) {
    var currentState = getResourceState();
    return store.subscribe(function () {
      var nextResourceState = getResourceState();

      if (nextResourceState !== currentState) {
        currentState = nextResourceState;
        onChange();
      }
    });
  };

  var pendingLoaders = new Map();
  var entriesLastUpdatedById = new Map();
  return {
    getState: getResourceState,
    setState: setResourceState,
    refresh: function refresh() {
      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      return loader.apply(void 0, args).then(setEntryState(args));
    },
    useEntry: function useEntry() {
      for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2];
      }

      var renderCount = React.useRef(0);
      renderCount.current += 1;
      var resourceState = getResourceState();

      var _useState = React.useState(entryGetter(resourceState, args)),
          state = _useState[0],
          setState = _useState[1];

      var _useContext = React.useContext(Context),
          registerError = _useContext.registerError;

      var entryId = args.length ? args.join("-") : "INDEX";
      React.useEffect(function () {
        return (// Important! The return value is used to unsubscribe from the store
          subscribe(function () {
            var nextState = getResourceState();
            /* istanbul ignore else */

            if (nextState !== state) {
              setState(entryGetter(nextState, args));
            }
          })
        );
      }, [state]);

      if (pendingLoaders.get(entryId)) {
        throw pendingLoaders.get(entryId);
      }

      var entryIsExpired = (entriesLastUpdatedById.get(entryId) || 0) + entriesExpireAfter < Date.now();

      if (entryGetter(resourceState, args) === undefined || entryIsExpired && renderCount.current === 1) {
        pendingLoaders.set(entryId, loader.apply(void 0, args).then(setEntryState(args))["catch"](registerError)["finally"](function () {
          pendingLoaders["delete"](entryId);
          entriesLastUpdatedById.set(entryId, Date.now());
        }));
        throw pendingLoaders.get(entryId);
      }

      return [state, React.useCallback(setEntryState(args), args)];
    },
    subscribe: subscribe
  };
});

var createKeyedResource = ramda.curryN(2, function (createKey, loader, entriesExpireAfter) {
  return createResource(function (resourceState, args) {
    if (resourceState === void 0) {
      resourceState = {};
    }

    return resourceState[createKey.apply(void 0, args)];
  }, function (resourceState, args, data) {
    var _extends2;

    if (resourceState === void 0) {
      resourceState = {};
    }

    return _extends({}, resourceState, (_extends2 = {}, _extends2[createKey.apply(void 0, args)] = data, _extends2));
  }, loader, entriesExpireAfter);
});

var createSingleEntryResource = function createSingleEntryResource(loader, entriesExpireAfter) {
  return createResource(function (resourceState) {
    return resourceState;
  }, function (resourceState, args, data) {
    return data;
  }, loader, entriesExpireAfter);
};

var RemoteResourceBoundary = function RemoteResourceBoundary(_ref) {
  var children = _ref.children,
      _ref$onLoadError = _ref.onLoadError,
      onLoadError = _ref$onLoadError === void 0 ? function () {} : _ref$onLoadError,
      fallback = _ref.fallback,
      renderError = _ref.renderError;

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

var useAutoSave = function useAutoSave(value, save, delay) {
  if (delay === void 0) {
    delay = 1000;
  }

  var initialValue = React.useRef(value);
  var currentValue = React.useRef(value);
  var timeout = React.useRef(null);
  currentValue.current = value;
  React.useEffect(function () {
    return function () {
      if (timeout.current !== null) {
        save(currentValue.current);
      }
    };
  }, []);
  React.useEffect(function () {
    if (value !== initialValue.current) {
      timeout.current = setTimeout(function () {
        return save(value);
      }, delay);
      return function () {
        clearTimeout(timeout.current);
      };
    }
  }, [value]);
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
    return setTask(fn()["finally"](function () {
      /* istanbul ignore else */
      if (mounted.current) {
        setTask(null);
      }
    }));
  };
};

exports.RemoteResourceBoundary = RemoteResourceBoundary;
exports.createKeyedResource = createKeyedResource;
exports.createResource = createResource;
exports.createSingleEntryResource = createSingleEntryResource;
exports.useAutoSave = useAutoSave;
exports.useSuspense = useSuspense;
