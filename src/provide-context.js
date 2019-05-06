import { curry } from "ramda";

const provideContext = curry((provider, resource) => ({
  ...resource,
  useState: (...args) => resource.useState(provider(...args), ...args)
}));

export default provideContext;
