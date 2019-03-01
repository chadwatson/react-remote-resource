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
        [action.resourceId, action.entryKey],
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
  createEntryKey = defaultCreateCacheKey
}) => {
  store.dispatch({ type: REGISTER_RESOURCE, resourceId });

  const loadingByKey = new Map();
  const savingByKey = new Map();

  const selectEntry = entryKey =>
    Maybe.fromNullable(store.getState().getIn([resourceId, entryKey]));

  const selectData = maybeEntry =>
    maybeEntry.map(state => state.get("data")).getOrElse(initialValue);

  const selectUpdatedAt = maybeEntry =>
    maybeEntry.map(state => state.get("updatedAt"));

  const load = (...args) => {
    const entryKey = createEntryKey(args);
    return loader(...args)
      .then(data => {
        loadingByKey.delete(entryKey);
        store.dispatch({
          type: RECEIVE_DATA,
          now: Date.now(),
          data,
          entryKey,
          resourceId
        });
      })
      .catch(error => {
        loadingByKey.delete(entryKey);
        throw error;
      });
  };

  return (...args) => {
    const entryKey = createEntryKey(args);
    const { registerError } = useContext(Context);
    const [entry, setEntry] = useState(selectEntry(entryKey));
    const cacheInvalid = selectUpdatedAt(entry)
      .map(updatedAt => updatedAt + invalidateAfter < Date.now())
      .getOrElse(true);

    useEffect(() => {
      return store.subscribe(() => {
        const nextEntry = selectEntry(entryKey);
        if (nextEntry !== entry) {
          setEntry(nextEntry);
        }
      });
    }, [entryKey]);

    // We only load on the first render if the cache is invalid
    const renderCount = useRef(0);
    renderCount.current = renderCount.current + 1;
    if (
      renderCount.current === 1 &&
      cacheInvalid &&
      !loadingByKey.has(entryKey)
    ) {
      loadingByKey.set(entryKey, load(...args).catch(registerError));
    }

    // We only suspend while the initial load is outstanding
    if (cacheInvalid && loadingByKey.has(entryKey)) {
      throw loadingByKey.get(entryKey);
    }

    const actions = useMemo(
      () => ({
        refresh: () =>
          loadingByKey.get(entryKey) ||
          loadingByKey
            .set(entryKey, load(...args).catch(registerError))
            .get(entryKey),
        set: data => {
          store.dispatch({
            type: RECEIVE_DATA,
            now: Date.now(),
            data,
            entryKey,
            resourceId
          });
        },
        update: updater => {
          store.dispatch({
            type: RECEIVE_DATA,
            now: Date.now(),
            data: updater(entry),
            entryKey,
            resourceId
          });
        },
        save: data =>
          savingByKey.get(entryKey) ||
          savingByKey
            .set(
              entryKey,
              save(data)
                .then(() => {
                  savingByKey.delete(entryKey);
                })
                .catch(error => {
                  savingByKey.delete(entryKey);
                  throw error;
                })
            )
            .get(entryKey)
      }),
      [entryKey]
    );

    return [selectData(entry), actions];
  };
};

export default createRemoteResource;
