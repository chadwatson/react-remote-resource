/**
 * Makes a resource "pessimistic".
 */
const usePessimism = ([data, actions]) => [
  data,
  {
    refresh: actions.refresh,
    // Saves to the remote first, then if it succeeds it updates the cache
    save: (...args) => actions.remoteSave(...args).then(actions.setCache),
    // Deletes from the remote first, then if it succeeds it deletes the cache
    delete: (...args) => actions.remoteDelete(...args).then(actions.deleteCache)
  }
];

export default usePessimism;
