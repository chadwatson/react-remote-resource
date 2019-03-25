import uuid from "uuid/v1";
import store, { selectEntry, selectResource } from "./store";

const createRemoteResource = ({
  load = () => Promise.resolve(),
  save = () => Promise.resolve(),
  delete: destroy = () => Promise.resolve(),
  initialValue = null,
  invalidateAfter = 300000,
  createEntryId = (...args) => args.join("-") || "INDEX"
}) => {
  const resourceId = uuid();
  return {
    id: resourceId,
    createEntryId,
    initialValue,
    invalidateAfter,
    load,
    save,
    delete: destroy,
    getEntry: entryId => selectEntry(store.getState(), { resourceId, entryId }),
    onChange: onChange => {
      let currentState = selectResource(store.getState(), { resourceId });
      return store.subscribe(() => {
        const nextResourceState = selectResource(store.getState(), {
          resourceId
        });
        if (nextResourceState !== currentState) {
          currentState = nextResourceState;
          onChange();
        }
      });
    },
    dispatch: action => store.dispatch({ ...action, resourceId })
  };
};

export default createRemoteResource;
