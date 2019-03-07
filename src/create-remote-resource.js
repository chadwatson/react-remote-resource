import { useState, useEffect, useMemo, useRef, useContext } from "react";
import { createStore } from "redux";
import { Map as ImmutableMap } from "immutable";
import Maybe from "data.maybe";
import Context from "./Context";
import createTaskManager from "./create-task-manager";

const REGISTER_RESOURCE = "REGISTER_RESOURCE";
const RECEIVE_DATA = "RECEIVE_DATA";
const DELETE_ENTRY = "DELETE_ENTRY";

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

    const actions = useMemo(
      () => ({
        refresh: () => load(...args).catch(registerError),
        setCache: valueOrUpdate => {
          const data =
            typeof valueOrUpdate == "function"
              ? valueOrUpdate(selectData(entry))
              : valueOrUpdate;
          store.dispatch({
            type: RECEIVE_DATA,
            now: Date.now(),
            data,
            entryKey,
            resourceId
          });
          return data;
        },
        deleteCache: () => {
          store.dispatch({
            type: DELETE_ENTRY,
            entryKey,
            resourceId
          });
          return selectData(entry);
        },
        remoteSave: data => {
          saveTasks.run(entryKey, () => save(data));
        },
        remoteDelete: () => {
          deleteTasks.run(entryKey, () => destroy(selectData(entry)));
        }
      }),
      [entryKey]
    );

    return [selectData(entry), actions];
  };
};

export default createRemoteResource;
