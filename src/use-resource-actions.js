import { useCallback, useContext } from "react";
import Context from "./Context";
import { RECEIVE_ENTRY_DATA, LOADING_ENTRY_FAILED } from "./store";

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
    refresh: () =>
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
        .catch(error => {
          registerError(error);
          resource.dispatch({
            type: LOADING_ENTRY_FAILED,
            entryId
          });
        })
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
