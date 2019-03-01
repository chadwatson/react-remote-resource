import { useState, useEffect, useMemo, useRef, useContext } from "react";
import { createStore } from "redux";
import { Map as ImmutableMap } from "immutable";
import Maybe from "data.maybe";
import { Context } from "./RemoteResourceBoundary";

const REGISTER_RESOURCE = "REGISTER_RESOURCE";
const RECEIVE_DATA = "RECEIVE_DATA";

const store = createStore((state = ImmutableMap(), action) => {
  switch (action.type) {
    case REGISTER_RESOURCE:
      return state.set(action.resourceId, ImmutableMap());
    case RECEIVE_DATA:
      return state.setIn(
        [action.resourceId, action.key],
        ImmutableMap({
          updatedAt: action.now,
          data: action.data
        })
      );
    default:
      return state;
  }
});

const defaultCreateCacheKey = args => args.join("-") || "INDEX";

const createRemoteResource = ({
  id: resourceId,
  load: loader = () => Promise.resolve(),
  save = () => Promise.resolve(),
  initialValue = null,
  invalidateAfter = 300000,
  createCacheKey = defaultCreateCacheKey
}) => {
  store.dispatch({ type: REGISTER_RESOURCE, resourceId });

  const loadingByKey = new Map();
  const savingByKey = new Map();

  const selectEntry = key =>
    Maybe.fromNullable(store.getState().getIn([resourceId, key]));

  const selectData = maybeEntry =>
    maybeEntry.map(state => state.get("data")).getOrElse(initialValue);

  const selectUpdatedAt = maybeEntry =>
    maybeEntry.map(state => state.get("updatedAt"));

  const load = (...args) => {
    const key = createCacheKey(args);
    return loader(...args)
      .then(data => {
        loadingByKey.delete(key);
        store.dispatch({
          type: RECEIVE_DATA,
          now: Date.now(),
          data,
          key,
          resourceId
        });
      })
      .catch(error => {
        loadingByKey.delete(key);
        throw error;
      });
  };

  return (...args) => {
    const key = createCacheKey(args);
    const { registerError } = useContext(Context);
    const [entry, setEntry] = useState(selectEntry(key));
    const cacheInvalid = selectUpdatedAt(entry)
      .map(updatedAt => updatedAt + invalidateAfter < Date.now())
      .getOrElse(true);

    useEffect(() => {
      return store.subscribe(() => {
        const nextEntry = selectEntry(key);
        if (nextEntry !== entry) {
          setEntry(nextEntry);
        }
      });
    }, [key]);

    // We only load on the first render if the cache is invalid
    const renderCount = useRef(0);
    renderCount.current = renderCount.current + 1;
    if (renderCount.current === 1 && cacheInvalid && !loadingByKey.has(key)) {
      loadingByKey.set(key, load(...args).catch(registerError));
    }

    // We only suspend while the initial load is outstanding
    if (cacheInvalid && loadingByKey.has(key)) {
      throw loadingByKey.get(key);
    }

    const actions = useMemo(
      () => ({
        refresh: () =>
          loadingByKey.get(key) ||
          loadingByKey.set(key, load(...args).catch(registerError)).get(key),
        update: (updater, now) => {
          store.dispatch({
            type: RECEIVE_DATA,
            data: updater(entry),
            key,
            now,
            resourceId
          });
        },
        save: data =>
          savingByKey.get(key) ||
          savingByKey
            .set(
              key,
              save(data)
                .then(() => {
                  savingByKey.delete(key);
                })
                .catch(error => {
                  savingByKey.delete(key);
                  throw error;
                })
            )
            .get(key)
      }),
      [key]
    );

    return [selectData(entry), actions];
  };
};

export default createRemoteResource;
