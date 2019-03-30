import { useCallback, useContext } from "react";
import Context from "./Context";
import { RECEIVE_ENTRY_DATA } from "./store";

const useResourceActions = (resource, args = []) => {
  const entryId = resource.createEntryId(...args);
  const { registerError } = useContext(Context);
  const data = resource
    .getEntry(entryId)
    .chain(entry => entry.data)
    .getOrElse(resource.initialValue);

  const actions = {
    set: useCallback(
      nextData => {
        resource.dispatch({
          type: RECEIVE_ENTRY_DATA,
          entryId,
          data: typeof nextData === "function" ? nextData(data) : nextData,
          now: Date.now()
        });
      },
      [data]
    ),
    refresh: useCallback(
      () =>
        resource.loadingPromisesByEntryId.get(entryId) ||
        // We need to store the promise so that if the component gets re-mounted
        // while the promise is pending we have the ability to throw it.
        resource.loadingPromisesByEntryId
          .set(
            entryId,
            resource
              .load(...args)
              .then(data => {
                resource.dispatch({
                  type: RECEIVE_ENTRY_DATA,
                  entryId,
                  data,
                  now: Date.now()
                });
              })
              .catch(registerError)
              .finally(() => {
                resource.loadingPromisesByEntryId.delete(entryId);
              })
          )
          .get(entryId),
      args
    )
  };

  if (resource.save) {
    actions.save = resource.save;
  }

  if (resource.delete) {
    actions.delete = resource.delete;
  }

  return actions;
};

export default useResourceActions;
