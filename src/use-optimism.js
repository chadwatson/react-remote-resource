/**
 * Makes a resource "optimistic".
 */
const useOptimism = ([data, actions]) => [
  data,
  // Save. Updates cache first then saves to the remote
  (...args) => {
    actions.setCache(...args);
    return actions.remoteSave(...args);
  },
  // Delete. Deletes the cache first then deletes from the remote
  (...args) => {
    actions.deleteCache(...args);
    return actions.remoteDelete(...args);
  }
];

export default useOptimism;
