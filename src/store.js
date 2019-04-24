import { createStore } from "redux";
import { Map } from "immutable";

export const RECEIVE_STATE = "RECEIVE_STATE";

const initialRootState = Map({
  resourcesById: Map()
});

const rootReducer = (state, action) => {
  switch (action.type) {
    case RECEIVE_STATE:
      return state.setIn(["resourcesById", action.resourceId], action.state);
    default:
      return state;
  }
};

const store = createStore(rootReducer, initialRootState);

export default store;

export const selectResource = (state, { resourceId }) =>
  state.getIn(["resourcesById", resourceId]);
