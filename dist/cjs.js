'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var React = require('react');
var React__default = _interopDefault(React);
var redux = require('redux');
var immutable = require('immutable');
var Maybe = _interopDefault(require('data.maybe'));
var PropTypes = _interopDefault(require('prop-types'));

function _slicedToArray(arr, i) {
  return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest();
}

function _arrayWithHoles(arr) {
  if (Array.isArray(arr)) return arr;
}

function _iterableToArrayLimit(arr, i) {
  var _arr = [];
  var _n = true;
  var _d = false;
  var _e = undefined;

  try {
    for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
      _arr.push(_s.value);

      if (i && _arr.length === i) break;
    }
  } catch (err) {
    _d = true;
    _e = err;
  } finally {
    try {
      if (!_n && _i["return"] != null) _i["return"]();
    } finally {
      if (_d) throw _e;
    }
  }

  return _arr;
}

function _nonIterableRest() {
  throw new TypeError("Invalid attempt to destructure non-iterable instance");
}

var Context = React.createContext({
  registerError: function registerError() {}
});

var REGISTER_RESOURCE = "REGISTER_RESOURCE";
var RECEIVE_DATA = "RECEIVE_DATA";
var store = redux.createStore(function () {
  var state = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : immutable.Map();
  var action = arguments.length > 1 ? arguments[1] : undefined;

  switch (action.type) {
    case REGISTER_RESOURCE:
      return state.set(action.resourceId, immutable.Map());

    case RECEIVE_DATA:
      return state.setIn([action.resourceId, action.entryKey], immutable.Map({
        updatedAt: action.now,
        data: action.data
      }));

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
      _save = _ref$save === void 0 ? function () {
    return Promise.resolve();
  } : _ref$save,
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
  var loadingByKey = new Map();
  var savingByKey = new Map();

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

  var load = function load() {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    var entryKey = createEntryKey(args);
    return loader.apply(void 0, args).then(function (data) {
      loadingByKey.delete(entryKey);
      store.dispatch({
        type: RECEIVE_DATA,
        now: Date.now(),
        data: data,
        entryKey: entryKey,
        resourceId: resourceId
      });
    }).catch(function (error) {
      loadingByKey.delete(entryKey);
      throw error;
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
        _useState2 = _slicedToArray(_useState, 2),
        entry = _useState2[0],
        setEntry = _useState2[1];

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

    if (renderCount.current === 1 && cacheInvalid && !loadingByKey.has(entryKey)) {
      loadingByKey.set(entryKey, load.apply(void 0, args).catch(registerError));
    } // We only suspend while the initial load is outstanding


    if (cacheInvalid && loadingByKey.has(entryKey)) {
      throw loadingByKey.get(entryKey);
    }

    var actions = React.useMemo(function () {
      return {
        refresh: function refresh() {
          return loadingByKey.get(entryKey) || loadingByKey.set(entryKey, load.apply(void 0, args).catch(registerError)).get(entryKey);
        },
        set: function set(data) {
          store.dispatch({
            type: RECEIVE_DATA,
            now: Date.now(),
            data: data,
            entryKey: entryKey,
            resourceId: resourceId
          });
        },
        update: function update(updater) {
          store.dispatch({
            type: RECEIVE_DATA,
            now: Date.now(),
            data: updater(entry),
            entryKey: entryKey,
            resourceId: resourceId
          });
        },
        save: function save(data) {
          return savingByKey.get(entryKey) || savingByKey.set(entryKey, _save(data).then(function () {
            savingByKey.delete(entryKey);
          }).catch(function (error) {
            savingByKey.delete(entryKey);
            throw error;
          })).get(entryKey);
        }
      };
    }, [entryKey]);
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
      _useState2 = _slicedToArray(_useState, 2),
      error = _useState2[0],
      setError = _useState2[1];

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

RemoteResourceBoundary.propTypes = {
  children: PropTypes.node.isRequired,
  renderError: PropTypes.func.isRequired,
  onLoadError: PropTypes.func,
  fallback: PropTypes.node
};

var useSuspense = function useSuspense(fn) {
  var _useState = React.useState(null),
      _useState2 = _slicedToArray(_useState, 2),
      task = _useState2[0],
      setTask = _useState2[1];

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
exports.useSuspense = useSuspense;
