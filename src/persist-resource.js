const persistResource = (getInitialState, persistState, resource) => {
  let loader = null;

  return {
    ...resource,
    useState: (...args) => {
      const resourceState = resource.getState();

      if (resourceState === undefined) {
        loader = getInitialState()
          .then(resource.setState)
          .then(() =>
            resource.subscribe(() => {
              persistState(resource.getState());
            })
          )
          .finally(() => {
            loader = null;
          });
      }

      if (loader) {
        throw loader;
      }

      return resource.useState(...args);
    }
  };
};

export default persistResource;
