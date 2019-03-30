import { createStore } from "redux";
import { isNil } from "ramda";
import { Map, Record } from "immutable";
import Maybe from "data.maybe";

export const RECEIVE_ENTRY_DATA = "RECEIVE_ENTRY_DATA";

const Entry = Record(
  {
    id: "",
    data: Maybe.Nothing(),
    updatedAt: Maybe.Nothing()
  },
  "RemoteResourceEntry"
);

const entryReducer = (state = Entry(), action) => {
  switch (action.type) {
    case RECEIVE_ENTRY_DATA:
      return state.merge({
        id: action.entryId,
        data: Maybe.fromNullable(action.data),
        updatedAt: isNil(action.data) ? Maybe.Nothing() : Maybe.of(action.now)
      });
    default:
      return state;
  }
};

const initialResourceState = Map({
  entriesById: Map()
});

const resourceReducer = (state = initialResourceState, action) => {
  switch (action.type) {
    case RECEIVE_ENTRY_DATA:
      return state.updateIn(["entriesById", action.entryId], entryState =>
        entryReducer(entryState, action)
      );
    default:
      return state;
  }
};

const initialRootState = Map({
  resourcesById: Map()
});

const rootReducer = (state = initialRootState, action) => {
  switch (action.type) {
    case RECEIVE_ENTRY_DATA:
      return state.updateIn(
        ["resourcesById", action.resourceId],
        resourceState => resourceReducer(resourceState, action)
      );
    default:
      return state;
  }
};

const store = createStore(rootReducer);

export default store;

export const selectResource = (state = initialRootState, { resourceId }) =>
  Maybe.fromNullable(state.getIn(["resourcesById", resourceId]));

export const selectEntry = (
  state = initialRootState,
  { resourceId, entryId }
) =>
  selectResource(state, { resourceId }).chain(resource =>
    Maybe.fromNullable(resource.getIn(["entriesById", entryId]))
  );
