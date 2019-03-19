import { useState, useEffect, useCallback, useRef, useContext } from "react";
import { createStore } from "redux";
import { Map as ImmutableMap } from "immutable";
import Maybe from "data.maybe";
import Context from "./Context";
import createTaskManager from "./create-task-manager";

const REGISTER_RESOURCE = "REGISTER_RESOURCE";
const RECEIVE_DATA = "RECEIVE_DATA";
const DELETE_ENTRY = "DELETE_ENTRY";
const SUBSCRIPTION_STARTED = "SUBSCRIPTION_STARTED";
const SUBSCRIPTION_ENDED = "SUBSCRIPTION_ENDED";

const store = createStore((state = ImmutableMap(), action) => {
  switch (action.type) {
    case REGISTER_RESOURCE:
      return state.set(action.resourceId, ImmutableMap());
    case RECEIVE_DATA:
      return state.setIn(
        [action.resourceId, action.entryKey],
        ImmutableMap({
          updatedAt: action.now,
          data: action.data,
          hasSubscription: false
        })
      );
    case SUBSCRIPTION_STARTED:
      return state.setIn(
        [action.resourceId, action.entryKey, "hasSubscription"],
        true
      );
    case SUBSCRIPTION_ENDED:
      return state.setIn(
        [action.resourceId, action.entryKey, "hasSubscription"],
        false
      );
    case DELETE_ENTRY:
      return state.deleteIn([action.resourceId, action.entryKey]);
    default:
      return state;
  }
});

const defaultCreateCacheKey = args => args.join("-") || "INDEX";

const createRemoteResource = ({
  id: resourceId,
  load: loader = () => Promise.resolve(),
  save = () => Promise.resolve(),
  delete: destroy = () => Promise.resolve(),
  subscribe = () => () => {},
  initialValue = null,
  invalidateAfter = 300000,
  createEntryKey = defaultCreateCacheKey
}) => {
  store.dispatch({ type: REGISTER_RESOURCE, resourceId });

  const loadTasks = createTaskManager();
  const saveTasks = createTaskManager();
  const deleteTasks = createTaskManager();

  const selectEntry = entryKey =>
    Maybe.fromNullable(store.getState().getIn([resourceId, entryKey]));

  const selectData = maybeEntry =>
    maybeEntry.map(state => state.get("data")).getOrElse(initialValue);

  const selectUpdatedAt = maybeEntry =>
    maybeEntry.map(state => state.get("updatedAt"));

  const selectHasSubscription = maybeEntry =>
    maybeEntry.map(state => state.get("hasSubscription")).getOrElse(false);

  const load = (...args) => {
    const entryKey = createEntryKey(args);
    return loadTasks.run(entryKey, () =>
      loader(...args).then(data => {
        store.dispatch({
          type: RECEIVE_DATA,
          now: Date.now(),
          entryKey: createEntryKey(args),
          data,
          resourceId
        });
        return data;
      })
    );
  };

  return (...args) => {
    const entryKey = createEntryKey(args);
    const { registerError } = useContext(Context);
    const [entry, setEntry] = useState(selectEntry(entryKey));
    const data = selectData(entry);
    const hasSubscription = selectHasSubscription(entry);
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
    if (renderCount.current === 1 && cacheInvalid && !loadTasks.has(entryKey)) {
      load(...args).catch(registerError);
    }

    // We only suspend while the initial load is outstanding
    if (cacheInvalid && loadTasks.has(entryKey)) {
      throw loadTasks.get(entryKey);
    }

    const setCache = useCallback(
      valueOrUpdate => {
        const newData =
          typeof valueOrUpdate == "function"
            ? valueOrUpdate(data)
            : valueOrUpdate;
        store.dispatch({
          type: RECEIVE_DATA,
          now: Date.now(),
          data: newData,
          entryKey,
          resourceId
        });
        return newData;
      },
      [data]
    );

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
      remoteSave: useCallback(
        newData => saveTasks.run(entryKey, () => save(newData)),
        []
      ),
      remoteDelete: useCallback(
        () => deleteTasks.run(entryKey, () => destroy(data)),
        [data]
      ),
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

export default createRemoteResource;
