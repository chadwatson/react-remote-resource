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
  RemoteResourceBoundary
} from "react-remote-resource";

const useUserInfo = createRemoteResource({
  id: "user-info",
  load: userId => fetchJson(`/api/users/${userId}`),
  invalidateAfter: 60 * 60 * 1000 // 1 hour
});

const useTweets = createRemoteResource({
  id: "tweets",
  load: userId => fetchJson(`/api/users/${userId}/tweets`),
  invalidateAfter: 10000 // 10 seconds
});

const UserInfo = ({ userId }) => {
  const [user] = useUserInfo(userId);
  const [tweets] = useTweets(userId);

  return (
    <>
      <img src={user.imageUrl} />
      <h1>
        {user.name} | Tweets: {tweets.length}
      </h1>
      <p>{user.bio}</p>
    </>
  );
};

const Tweets = ({ userId }) => {
  const [tweets] = useTweets(userId);
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

A function that takes a config object and returns a React hook.

```jsx
const useProduct = createRemoteResource({
  // Required: Unique identifier for the cache
  id: "product",
  // Required: A Promise-returing function that resolves with the data or rejects if fails
  load: (id) => fetch(`/api/products/${id}`).then(response => response.json()),
  // Optional: A Promise-returing function that resolves with the data or rejects if fails
  // Default: () => Promise.resolve()
  save: (product) =>
      ? fetch(`/api/products/${product.id}`, { method: "PUT", body: JSON.stringify(product) }).then(response => response.json())
      : fetch("/api/products", { method: "POST", body: JSON.stringify(product) }).then(response => response.json()),
  // Optional: The amount of time in milliseconds since the last update in which the cache is considered stale.
  // Default: 300000 (5 minutes)
  invalidateAfter: 10000,
  // Optional: A function that creates an entry key from the arguments given to the hook
  // Default: args => args.join("-") || "INDEX"
  createEntryKey: id => id.toString().toUpperCase()
});
```

The returned hook will return a tuple, similar to React's `useState`, where the first item is the value of the resource, and the second item is an object of actions: `refresh`, `set`, `update`, and `save`.

```jsx
const [product, actions] = useProduct(productId);

// Bypasses the cache and calls `load` again but without throwing the promise. Returns the promise from `load`.
actions.refresh();

// Calls the `save` function if provided. Only calls `save` once as long as the promise is not resolved. Returns the promise from `save`.
actions.save(updatedProduce);

// Sets the value for this entry in the cache and stores the time it was updated. All components using the hook will be re-rendered with the new value.
actions.set({ ...product, tags: product.tags.concat("shoes") });

// Takes a function which receives the current value of the entry and should return a transformed value to store in the cache. Update time is changed and all components using the hook will be re-rendered with the new value.
actions.update(currentProduct => ({
  ...currentProduct,
  tags: currentProduct.tags.concat("shoes")
}));
```

### `RemoteResourceBoundary`

Uses `Suspense` under the hood to catch any thrown promises and render the `fallback` while they are pending. Will also catch any errors that occur in the promise from a resource's `load` function and `renderError` and call `onLoadError` if provided.

```jsx
const UserProfile = ({ userId }) => (
  <RemoteResourceBoundary
    // Optional: A React node that will show while any thrown promises are pending. `null` by default.
    fallback={<p>Loading...</p>}
    // Optional: A callback that is invoked when any thrown promise rejects
    onLoadError={error => {
      logError(error);
    }}
    // Required: A render prop that receives the error and a function to clear the error, which allows the children to re-render and attempt loading again
    renderError={(error, clearError) => (
      <>
        <p>{error}</p>
        <button onClick={clearError}>Try again</button>
      </>
    )}
  >
    <UserInfo userId={userId} />
    <Tweets userId={userId} />
  </RemoteResourceBoundary>
);
```
