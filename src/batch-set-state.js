import store, { RECEIVE_BATCH_STATE } from "./store";

const batchSetState = (...items) => {
  store.dispatch({
    type: RECEIVE_BATCH_STATE,
    payload: items
  });
};

export default batchSetState;
