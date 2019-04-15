const once = fn => (currentState, refresh) =>
  refresh || !currentState ? fn : () => currentState;

export default once;
