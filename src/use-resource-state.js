import { useState, useEffect, useCallback, useRef } from "react";
import { LOADING_ENTRY, RECEIVE_ENTRY_DATA } from "./store";
import useResourceActions from "./use-resource-actions";

const useFirstRender = () => {
  const renderCount = useRef(0);
  renderCount.current = renderCount.current + 1;
  return renderCount.current === 1;
};

const useResourceState = (resource, args = []) => {
  const entryId = resource.createEntryId(...args);
  const [maybeEntry, setEntry] = useState(resource.getEntry(entryId));
  const data = maybeEntry
    .chain(entry => entry.data)
    .getOrElse(resource.initialValue);
  const cacheInvalid = maybeEntry
    .map(entry => entry.updatedAt + resource.invalidateAfter < Date.now())
    .getOrElse(data === resource.initialValue);
  const loadPromise = maybeEntry
    .chain(entry => entry.loadPromise)
    .getOrElse(null);
  const actions = useResourceActions(resource, args);

  useEffect(
    () =>
      // Important! The return value is used to unsubsribe from the store when necessary.
      resource.onChange(() => {
        setEntry(resource.getEntry(entryId));
      }),
    [entryId]
  );

  const isFirstRender = useFirstRender();
  if (isFirstRender && cacheInvalid && !loadPromise) {
    const promise = actions.refresh();
    // We need to store the promise so that if the component gets re-mounted
    // while the promise is pending we have the ability to throw it.
    resource.dispatch({
      type: LOADING_ENTRY,
      entryId,
      promise
    });
    throw promise;
  } else if (loadPromise) {
    throw loadPromise;
  }

  return [
    data,
    useCallback(
      nextData => {
        resource.dispatch({
          type: RECEIVE_ENTRY_DATA,
          entryId,
          data: typeof nextData === "function" ? nextData(data) : nextData,
          now: Date.now()
        });
      },
      [data]
    )
  ];
};

export default useResourceState;
