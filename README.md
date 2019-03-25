# react-remote-resource

Intuitive remote data management in React

## Overview

Creating a remote resource gives you a React hook that can be used throughout your application. Whenever a component using the hook mounts the resource will pull the data from the internal cache and check if it is still valid by checking the `invalidateAfter` option (5 minutes by default) against the last time the cache was updated for that entry. If there is no data for that entry or the cache is invalid then the `load` function will be invoked and then thrown. If you have a `RemoteResourceBoundary` somewhere higher up in the component tree then it will catch the thrown promise (using `Suspsense` under the hood) and render the `fallback` until all promises resolve. If a promise rejects then the `RemoteResourceBoundary` will catch it and call `renderError` and `onLoadError` (if provided). This gives you an intuitive way to get and use data throughout your app without over-fetching. You also save yourself a lot of time and headache implementing these kinds of things in Redux or some other data management library.

## Getting Started

```
npm install react-remote-resource --save
// or
yarn add react-remote-resource
```

### Simple Example

```jsx
import {
  createRemoteResource,
  useResourceState,
  RemoteResourceBoundary
} from "react-remote-resource";

const userResource = createRemoteResource({
  load: userId => fetchJson(`/api/users/${userId}`),
  invalidateAfter: 60 * 60 * 1000 // 1 hour
});

const tweetsResource = createRemoteResource({
  load: userId => fetchJson(`/api/users/${userId}/tweets`),
  invalidateAfter: 10000 // 10 seconds
});

const UserInfo = ({ userId }) => {
  const [user] = useResourceState(userResource, [userId]);
  const [tweets] = useResourceState(tweetsResource, [userId]);

  return (
    <div>
      <img src={user.imageUrl} />
      <h1>
        {user.name} | Tweets: {tweets.length}
      </h1>
      <p>{user.bio}</p>
    </div>
  );
};

const Tweets = ({ userId }) => {
  const [tweets] = useResourceState(tweetsResource, [userId]);

  return (
    <ul>
      {tweets.map(tweet => (
        <li key={tweet.id}>
          <article>
            <p>{tweet.message}</p>
            <footer>
              <small>{tweet.date}</small>
            </footer>
          </article>
        </li>
      ))}
    </ul>
  );
};

const UserProfile = ({ userId }) => (
  <RemoteResourceBoundary
    fallback={<p>Loading...</p>}
    renderError={error => <p>{error}</p>}
  >
    <UserInfo userId={userId} />
    <Tweets userId={userId} />
  </RemoteResourceBoundary>
);
```

## API

### `createRemoteResource`

A function that takes a config object and returns a resource.

```jsx
const useProduct = createRemoteResource({
  // Required: A Promise-returing function that resolves with the data or rejects if fails
  load: id => fetch(`/api/products/${id}`).then(response => response.json()),
  
  // Optional: A Promise-returing function that resolves with the data or rejects if fails
  // Default: () => Promise.resolve()
  save: product =>
      ? fetch(`/api/products/${product.id}`, { method: "PUT", body: JSON.stringify(product) }).then(response => response.json())
      : fetch("/api/products", { method: "POST", body: JSON.stringify(product) }).then(response => response.json()),
  // Optional: A Promise-returing function
  // Default: () => Promise.resolve()
  delete: product => fetch(`/api/products/${product.id}`, { method: "DELETE" }),
  // Optional: The amount of time in milliseconds since the last update in which the cache is considered stale.
  // Default: 300000 (5 minutes)
  invalidateAfter: 10000,
  // Optional: A function that creates an entry id from the arguments given to the hook
  // Default: args => args.join("-") || "INDEX"
  createEntryId: id => id.toString().toUpperCase()
});
```

#### Resource

The return value from `createRemoteResource` has the following shape:

```ts
{
  id: string,
  createEntryId: (...args: Array<any>) => string,
  initialValue: any,
  invalidateAfter: number,
  load: (...args: Array<any>) => Promise<any>,
  save: (...args: Array<any>) => Promise<any>,
  delete: (...args: Array<any>) => Promise<any>,
  getEntry: string => Immutable.RecordOf<{
    id: string,
    data: Maybe<any>,
    updatedAt: Maybe<number>, // Unix timestamp
    loadPromise: Maybe<Promise<any>>
  }>,
  onChange: (() => void) => void, // Allows for subscribing to state changes. Basically a wrapper around store.subscribe.
  dispatch: ({ type: string }) => void // store.dispatch that adds `resourceId` to the action payload
};
```

### `useResourceState`

A React hook that takes a resource and an optional array of arguments and returns a tuple, very much like React's `useState`. The second item in the tuple works like `useState` in that it sets the in-memory state of the resource. Unlike `useState`, however, the state is not local to the component. Any other components that are using the state of that same resource get updated immediately with the new state! Under the hood `react-remote-resource` implements a redux store. Every resource get its own state and there can be multiple entries for each resource, depending on the arguments you pass into `useResourceState` and the optional `createEntryId` option that you can pass into `createRemoteResource`. By default every new combination of arguments will create a new entry in the store.

```jsx
import { useResourceState } from "react-remote-resource";

const ProductCategory = ({ categoryId }) => {
  const [categoriesById] = useResourceState(categoriesResource);
  const [products] = useResourceState(productsResource, [categoryId]);

  return (
    <section>
      <header>
        <h1>{categoriesById[categoryId].name}</h1>
      </header>
      <ul>
        {products.map(product => (
          <li key={product.id}>
            <Link to={`/products/${product.id}`}>{product.name}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
};
```

This hook is very powerful. Let's walk through what happens when it is used:

1. If there is no data in the store for this resource OR if there is no entry for the combination of arguments OR if the component is mounting and the last time the data was loaded for this entry was longer ago than the `invalidateAfter` argument then the `load` function that was passed into `createRemoteResource` will be invoked and the returned promise will be thrown until the promise resolves or rejects.
2. If the promise resolves with the data then it will be available as the first item in the tuple.
3. You can change the state using the second item in the tuple. Note that state changes are not local to the component like `useState`. If the component unmounts and remounts the state will be the same as when you left it.

### `useResourceActions`

A React hook that takes a resource and an optional array of arguments and returns an object literal with the following methods:

- `set`: A function that takes either the new state to set for this entry or a function that takes the current state of the entry and returns what should be set as the new state for the entry.
- `refresh`: A function that allows you to bypass the check against the `updatedAt` timestamp and immediately refetch the data. Note: the promise will **not** be thrown for this action.
- `save`: The `save` function that was defined with `createRemoteResource`. Note: this will be `undefined` if you did not define a `save` function with `createRemoteResource`.
- `delete`: The `delete` function that was defined with `createRemoteResource`. Note: this will be `undefined` if you did not define a `delete` function with `createRemoteResource`.

Note: the array of arguments that are provided as the second argument will be spread as the initial arguments to the `save` and `delete` actions.

```jsx
import { useResourceState, useResourceActions } from "react-remote-resource";

const ProductCategory = ({ categoryId }) => {
  const [categoriesById] = useResourceState(categoriesState);
  const [products] = useResourceState(productsResource, [categoryId]);
  const actions = useResourceActions(productsResource, [categoryId]);

  return (
    <section>
      <header>
        <h1>{categoriesById[categoryId].name}</h1>
        <button onClick={actions.refresh}>Refresh Products</button>
      </header>
      <ul>
        {products.map(product => (
          <li key={product.id}>
            <Link to={`/products/${product.id}`}>{product.name}</Link>
          </li>
        ))}
      </ul>
    </section>
  );
};
```

### `RemoteResourceBoundary`

Uses `Suspense` under the hood to catch any thrown promises and render the `fallback` while they are pending. Will also catch any errors that occur in the promise from a resource's `load` function and `renderError` and call `onLoadError` if provided.

```jsx
const UserProfile = ({ userId }) => (
  <RemoteResourceBoundary
    /* Optional: A React node that will show while any thrown promises are pending. `null` by default. */
    fallback={<p>Loading...</p>}
    /* Optional: A callback that is invoked when any thrown promise rejects */
    onLoadError={error => {
      logError(error);
    }}
    /* Required: A render prop that receives the error and a function to clear the error, which allows the children to re-render and attempt loading again */
    renderError={(error, clearError) => (
      <div>
        <p>{error}</p>
        <button onClick={clearError}>Try again</button>
      </div>
    )}
  >
    <UserInfo userId={userId} />
    <Tweets userId={userId} />
  </RemoteResourceBoundary>
);
```

### `useSuspense`

A hook that takes a promise returning function. It will throw the returned promise as long as it is pending.

```jsx
import { useSuspense } from "react-remote-resource";
import useUser from "../resources/user";

const SaveButton = ({ onClick }) => (
  <button onClick={useSuspense(onClick)}>Save</button>
);

const UserForm = () => {
  const [user, actions] = useUser();
  return (
    <div>
      ...Your form fields
      <Suspense fallback={<p>Saving...</p>}>
        <SaveButton onClick={actions.remoteSave} />
      </Suspense>
    </div>
  );
};
```
