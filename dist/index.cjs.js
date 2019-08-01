'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var _extends = _interopDefault(require('@babel/runtime/helpers/extends'));
var hash = _interopDefault(require('object-hash'));
var React = require('react');
var React__default = _interopDefault(React);
var uuid = _interopDefault(require('uuid/v1'));
var redux = require('redux');
var immutable = require('immutable');
var ramda = require('ramda');
var Maybe = _interopDefault(require('data.maybe'));

var RECEIVE_STATE = "RECEIVE_STATE";
var RESET_ALL_RESOURCES = "RESET_ALL_RESOURCES";
var RESET_RESOURCES = "RESET_RESOURCES";
var initialRootState = immutable.Map({
  resourcesById: immutable.Map()
});

var rootReducer = function rootReducer(state, action) {
  switch (action.type) {
    case RECEIVE_STATE:
      return state.setIn(["resourcesById", action.resourceId], action.state);

    case RESET_ALL_RESOURCES:
      return state.update("resourcesById", function (resources) {
        return resources.clear();
      });

    case RESET_RESOURCES:
      return state.update("resourcesById", function (resources) {
        return resources.withMutations(function (mutableResources) {
          return action.resources.forEach(function (_ref) {
            var id = _ref.id;
            mutableResources["delete"](id);
          });
        });
      });

    default:
      return state;
  }
};

var store = redux.createStore(rootReducer, initialRootState);
var selectResource = function selectResource(state, _ref2) {
  var resourceId = _ref2.resourceId;
  return state.getIn(["resourcesById", resourceId]);
};

var Context = React.createContext({
  registerError: function registerError() {}
});

var createResource = function createResource(_ref) {
  var selectState = _ref.selectState,
      setState = _ref.setState,
      loader = _ref.loader,
      _ref$hasState = _ref.hasState,
      hasState = _ref$hasState === void 0 ? function (value) {
    return value !== undefined;
  } : _ref$hasState;
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

  var setEntryState = function setEntryState(args) {
    return function (state) {
      return setResourceState(setState(getResourceState(), args, state));
    };
  };

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
  return {
    id: resourceId,
    getState: getResourceState,
    setState: setResourceState,
    refresh: function refresh() {
      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      return loader.apply(void 0, args).then(setEntryState(args));
    },
    useState: function useState() {
      for (var _len2 = arguments.length, args = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
        args[_key2] = arguments[_key2];
      }

      var renderCount = React.useRef(0);
      renderCount.current += 1;
      var resourceState = getResourceState();

      var _useState2 = React.useState(selectState(resourceState, args)),
          state = _useState2[0],
          setState = _useState2[1];

      var _useContext = React.useContext(Context),
          registerError = _useContext.registerError;

      var entryId = args.length ? args.join("-") : "INDEX";
      React.useEffect(function () {
        return (// Important! The return value is used to unsubscribe from the store
          subscribe(function () {
            var nextState = getResourceState();
            /* istanbul ignore else */

            if (nextState !== state) {
              setState(selectState(nextState, args));
            }
          })
        );
      }, [state]);

      if (pendingLoaders.get(entryId)) {
        throw pendingLoaders.get(entryId);
      }

      if (!hasState(selectState(resourceState, args), args)) {
        pendingLoaders.set(entryId, loader.apply(void 0, args).then(setEntryState(args))["catch"](registerError)["finally"](function () {
          pendingLoaders["delete"](entryId);
        }));
        throw pendingLoaders.get(entryId);
      }

      return [state, React.useCallback(setEntryState(args), args)];
    },
    subscribe: subscribe
  };
};

var createKeyedResource = function createKeyedResource(loader, createKey) {
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

      return resourceState[createKey.apply(void 0, args)];
    },
    setState: function setState(resourceState, args, data) {
      var _extends2;

      if (resourceState === void 0) {
        resourceState = {};
      }

      return _extends({}, resourceState, (_extends2 = {}, _extends2[createKey.apply(void 0, args)] = data, _extends2));
    },
    loader: loader
  });
};

var createSimpleResource = function createSimpleResource(loader) {
  var currentArgs = [];
  return createResource({
    loader: loader,
    selectState: function selectState(state) {
      return state;
    },
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

      return state !== undefined && (!currentArgs.length || ramda.equals(args, currentArgs));
    }
  });
};

var persistResource = function persistResource(getInitialState, persistState, resource) {
  var loader = null;
  return _extends({}, resource, {
    useState: function useState() {
      var resourceState = resource.getState();

      if (resourceState === undefined) {
        loader = getInitialState().then(resource.setState).then(function () {
          return resource.subscribe(function () {
            persistState(resource.getState());
          });
        })["finally"](function () {
          loader = null;
        });
      }

      if (loader) {
        throw loader;
      }

      return resource.useState.apply(resource, arguments);
    }
  });
};

var provideContext = ramda.curry(function (provider, resource) {
  return _extends({}, resource, {
    useState: function useState() {
      for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
        args[_key] = arguments[_key];
      }

      return resource.useState.apply(resource, [provider.apply(void 0, args)].concat(args));
    }
  });
});

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
    return renderError({
      error: err,
      retry: clearError
    });
  }).getOrElse(React__default.createElement(React.Suspense, {
    fallback: fallback
  }, children)));
};

var resetAllResources = function resetAllResources() {
  return store.dispatch({
    type: RESET_ALL_RESOURCES
  });
};

var resetResources = function resetResources(resources) {
  return store.dispatch({
    type: RESET_RESOURCES,
    resources: resources
  });
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
exports.createSimpleResource = createSimpleResource;
exports.persistResource = persistResource;
exports.provideContext = provideContext;
exports.resetAllResources = resetAllResources;
exports.resetResources = resetResources;
exports.useAutoSave = useAutoSave;
exports.useSuspense = useSuspense;
