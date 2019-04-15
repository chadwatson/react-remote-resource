import { useState, useEffect, useContext, useRef } from "react";
import Context from "./Context";

const useIsFirstRender = fn => {
  const renderCount = useRef(0);
  renderCount.current = renderCount.current + 1;
  return renderCount.current === 1;
};

const useResourceState = (resource, args = []) => {
  const [state, setState] = useState(resource.getState());
  const { registerError } = useContext(Context);
  const entryId = args.length ? args.join("-") : "INDEX";

  useEffect(
    () =>
      // Important! The return value is used to unsubscribe from the store
      resource.subscribe(() => {
        const nextState = resource.getState();
        if (nextState !== state) {
          setState(nextState);
        }
      }),
    [state]
  );

  const isFirstRender = useIsFirstRender();
  if (
    isFirstRender &&
    !resource.pendingLoaders.promisesById.get(entryId) &&
    !resource.pendingLoaders.queue.length
  ) {
    const result = resource.loader(resource.getState(), false)(...args);
    if (result instanceof Promise) {
      const pending = result
        .then(resource.setState)
        .catch(registerError)
        .finally(() => {
          resource.pendingLoaders.promisesById.delete(entryId);
          resource.pendingLoaders.queue.shift();
        });
      resource.pendingLoaders.queue.push(entryId);
      resource.pendingLoaders.promisesById.set(entryId, pending);
      throw pending;
    } else {
      resource.setState(result);
    }
  } else if (
    resource.pendingLoaders.promisesById.get(resource.pendingLoaders.queue[0])
  ) {
    throw resource.pendingLoaders.promisesById.get(
      resource.pendingLoaders.queue[0]
    );
  }

  return [state, resource.setState];
};

export default useResourceState;
