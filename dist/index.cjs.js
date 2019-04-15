'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var _extends = _interopDefault(require('@babel/runtime/helpers/extends'));
var uuid = _interopDefault(require('uuid/v1'));
var redux = require('redux');
var immutable = require('immutable');
var React = require('react');
var React__default = _interopDefault(React);
var Maybe = _interopDefault(require('data.maybe'));
var ramda = require('ramda');

var RECEIVE_STATE = "RECEIVE_STATE";
var initialRootState = immutable.Map({
  resourcesById: immutable.Map()
});

var rootReducer = function rootReducer(state, action) {
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

var store = redux.createStore(rootReducer);
var selectResource = function selectResource(state, _ref) {
  if (state === void 0) {
    state = initialRootState;
  }

  var resourceId = _ref.resourceId;
  return state.getIn(["resourcesById", resourceId]);
};

var createRemoteResource = function createRemoteResource(loader) {
  var resourceId = uuid();

  var getResourceState = function getResourceState() {
    return selectResource(store.getState(), {
      resourceId: resourceId
    });
  };

  var setResourceState = function setResourceState(nextState) {
    dispatch({
      type: RECEIVE_STATE,
      state: typeof nextState === "function" ? nextState(getResourceState()) : nextState
    });
  };

  var dispatch = function dispatch(action) {
    return store.dispatch(_extends({}, action, {
      resourceId: resourceId
    }));
  };

  return {
    id: resourceId,
    loader: loader,
    refresh: function refresh() {
      return loader(getResourceState(), true).apply(void 0, arguments).then(setResourceState);
    },
    pendingLoaders: {
      queue: [],
      promisesById: new Map()
    },
    getState: getResourceState,
    setState: setResourceState,
    subscribe: function subscribe(onChange) {
      var currentState = getResourceState();
      return store.subscribe(function () {
        var nextResourceState = getResourceState();

        if (nextResourceState !== currentState) {
          currentState = nextResourceState;
          onChange();
        }
      });
    }
  };
};

var once = function once(fn) {
  return function (currentState, refresh) {
    return refresh || !currentState ? fn : function () {
      return currentState;
    };
  };
};

var Context = React.createContext({
  registerError: function registerError() {}
});

var RemoteResourceBoundary = function RemoteResourceBoundary(_ref) {
  var children = _ref.children,
      _ref$onLoadError = _ref.onLoadError,
      onLoadError = _ref$onLoadError === void 0 ? function () {} : _ref$onLoadError,
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

var useAutoSave = function useAutoSave(value, save, delay) {
  if (delay === void 0) {
    delay = 1000;
  }

  React.useEffect(function () {
    var timeout = setTimeout(function () {
      return save(value);
    }, delay);
    return function () {
      clearTimeout(timeout);
    };
  }, [value]);
  React.useEffect(function () {
    return function () {
      if (value) {
        save(value);
      }
    };
  }, []);
};

var useIsFirstRender = function useIsFirstRender(fn) {
  var renderCount = React.useRef(0);
  renderCount.current = renderCount.current + 1;
  return renderCount.current === 1;
};

var useResourceState = function useResourceState(resource, args) {
  if (args === void 0) {
    args = [];
  }

  var _useState = React.useState(resource.getState()),
      state = _useState[0],
      setState = _useState[1];

  var _useContext = React.useContext(Context),
      registerError = _useContext.registerError;

  var entryId = args.length ? args.join("-") : "INDEX";
  React.useEffect(function () {
    return (// Important! The return value is used to unsubscribe from the store
      resource.subscribe(function () {
        var nextState = resource.getState();

        if (nextState !== state) {
          setState(nextState);
        }
      })
    );
  }, [state]);
  var isFirstRender = useIsFirstRender();

  if (isFirstRender && !resource.pendingLoaders.promisesById.get(entryId) && !resource.pendingLoaders.queue.length) {
    var result = resource.loader(resource.getState(), false).apply(void 0, args);

    if (result instanceof Promise) {
      var pending = result.then(resource.setState).catch(registerError).finally(function () {
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

var withLens = ramda.curry(function (getter, setter, loader) {
  return function (currentState, refresh) {
    return function () {
      return refresh || !getter(currentState).apply(void 0, arguments) ? loader.apply(void 0, arguments).then(setter(currentState).apply(void 0, arguments)) : currentState;
    };
  };
});

var withTimeout = ramda.curry(function (ms, loader) {
  var lastFetch = null;
  return function (currentState, refresh) {
    return function () {
      var now = Date.now();

      if (refresh || lastFetch + ms < now) {
        lastFetch = now;
        return loader(currentState, true).apply(void 0, arguments);
      }

      return currentState;
    };
  };
});

exports.createRemoteResource = createRemoteResource;
exports.once = once;
exports.RemoteResourceBoundary = RemoteResourceBoundary;
exports.useAutoSave = useAutoSave;
exports.useResourceState = useResourceState;
exports.useSuspense = useSuspense;
exports.withLens = withLens;
exports.withTimeout = withTimeout;
