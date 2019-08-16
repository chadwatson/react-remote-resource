import { createStore } from "redux";
import { Map } from "immutable";

export const RECEIVE_STATE = "RECEIVE_STATE";
export const RECEIVE_BATCH_STATE = "RECEIVE_BATCH_STATE";
export const RESET_ALL_RESOURCES = "RESET_ALL_RESOURCES";
export const RESET_RESOURCES = "RESET_RESOURCES";

const initialRootState = Map({
  resourcesById: Map()
});

const rootReducer = (state, action) => {
  switch (action.type) {
    case RECEIVE_STATE:
      return state.setIn(["resourcesById", action.resourceId], action.state);
    case RECEIVE_BATCH_STATE:
      return state.update("resourcesById", resourcesById =>
        action.payload.reduce(
          (acc, [resource, nextState]) =>
            acc.update(resource.id, resourceState =>
              typeof nextState === "function"
                ? nextState(resourceState)
                : nextState
            ),
          resourcesById
        )
      );
    case RESET_ALL_RESOURCES:
      return state.update("resourcesById", resources => resources.clear());
    case RESET_RESOURCES:
      return state.update("resourcesById", resources =>
        resources.withMutations(mutableResources =>
          action.resources.forEach(({ id }) => {
            mutableResources.delete(id);
          })
        )
      );
    default:
      return state;
  }
};

const store = createStore(rootReducer, initialRootState);

export default store;

export const selectResource = (state, { resourceId }) =>
  state.getIn(["resourcesById", resourceId]);
