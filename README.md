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
const loadProduct = id => fetch(`/api/products/${id}`).then(response => response.json());

const useProduct = createRemoteResource({
  // Required: Unique identifier for the cache
  id: "product",
  // Required: A Promise-returing function that resolves with the data or rejects if fails
  load: loadProduct,
  // Optional: A Promise-returing function that resolves with the data or rejects if fails
  // Default: () => Promise.resolve()
  save: product =>
      ? fetch(`/api/products/${product.id}`, { method: "PUT", body: JSON.stringify(product) }).then(response => response.json())
      : fetch("/api/products", { method: "POST", body: JSON.stringify(product) }).then(response => response.json()),
  // Optional: A Promise-returing function
  // Default: () => Promise.resolve()
  delete: product => fetch(`/api/products/${product.id}`, { method: "DELETE" }),
  // Optional: A function that receives an `onUpdate` function and returns a function that takes in the same arguments as `useProduct` when it is used in a component. This function can optionally return another function to clean up when a component either re-renders or unmounts. Use `onUpdate` to update the cache with the new data.
  // Default: () => () => {}
  subscribe: onUpdate => (productId) => {
    const interval = setInterval(() => {
      loadProduct(productId).then(onUpdate);
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  },
  // Optional: The amount of time in milliseconds since the last update in which the cache is considered stale.
  // Default: 300000 (5 minutes)
  invalidateAfter: 10000,
  // Optional: A function that creates an entry key from the arguments given to the hook
  // Default: args => args.join("-") || "INDEX"
  createEntryKey: id => id.toString().toUpperCase()
});
```

The returned hook will return a tuple, similar to React's `useState`, where the first item is the value of the resource, and the second item is an object of actions: `refresh`, `setCache`, `deleteCache`, `remoteSave`, and `remoteDelete`.

```jsx
const [product, actions] = useProduct(productId);

// Bypasses the cache and calls `load` again but without throwing the promise. Returns the promise from `load`.
actions.refresh();

// Calls the `save` function if provided. Only calls `save` once as long as the promise is not resolved. Returns the promise from `save`.
actions.remoteSave(updatedProduce);

// Calls the `delete` function if provided. Only calls `delete` once as long as the promise is not resolved. Returns the promise from `delete`.
actions.remoteDelete();

// Sets the value for this entry in the cache and stores the time it was updated. All components using the hook will be re-rendered with the new value. Can optionally take an updater function that receives the current value.
actions.setCache({ ...product, tags: product.tags.concat("shoes") });
actions.setCache(product => ({ ...product, tags: product.tags.concat("shoes") });

// Removes the entry from the cache.
actions.deleteCache();
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

### `useOptimism`

A hook that takes a resource and returns a tuple with the current value as the first item, a save action as the second item, and a delete action as the third item. `save` and `delete` take an optimistic approach, meaning they update the cache first then call `remoteSave` and `remoteDelete`, respectively, in the background. Both of these return the promise from `save` and `delete` so that you can handle failures as needed.

This approach allows you to treat the cache as the source of the truth and provide a snappy UI.

```jsx
import { useOptimism } from "react-remote-resource";
import useCart from "../resources/cart";

const CartContainer = ({ id }) => {
  const [cart, saveCart, deleteCart] = useOptimism(useCart());
  return <Cart cart={cart} onChange={saveCart} onCancel={deleteCart} />;
};
```

### `usePessimism`

A hook that takes a resource and returns a tuple with the current value as the first item and an object of actions as the second item: `refresh`, `save`, and `delete`. `save` and `delete` call `remoteSave` and `remoteDelete` first, respectively. The cache will be updated if they succeed.

This approach allows you to treat your remote data source as the source of truth. Use this when you expect a `remoteSave` or `remoteDelete` to either completely fail or respond with validation errors of some sort.

```jsx
import { useState, Suspense } from "react";
import { usePessimism, useSuspense } from "react-remote-resource";
import useUser from "../resources/user";

const SaveButton = ({ onClick }) => (
  <button onClick={useSuspense(onClick)}>Save</button>
);

const AccountInfoForm = () => {
  const [user, actions] = usePessimism(useUser());
  const [errors, setErrors] = useState([]);

  return (
    <div>
      {!!errors.length && (
        <section>
          <header>
            <h1>Some errors occurred</h1>
          </header>
          <ul>
            {errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
        </section>
      )}
      <label>
        First Name*
        <input type="text" value={user.firstName} />
      </label>
      <label>
        Last Name*
        <input type="text" value={user.lastName} />
      </label>
      <label>
        Email*
        <input type="email" value={user.email} />
      </label>
      <Suspense fallback={<p>Saving...</p>}>
        <SaveButton onClick={data => actions.save(data).catch(setErrors)} />
      </Suspense>
    </div>
  );
};
```

### `useSubscribe`

A hook that takes a resource and passes its `subscribe` action to `useEffect` and returns the resource. This allows for real-time updates to the entry data.

```jsx
import { createRemoteResource, useSubscribe } from "react-remote-resource";

const loadComments = postId =>
  fetch(`/api/posts/${postId}/comments`).then(response => response.json());

export const useComments = createRemoteResource({
  id: "comments",
  load: loadComments,
  subscribe: onUpdate => postId => {
    // poll for new comments every three seconds
    const interval = setInterval(() => {
      loadComments(postId).then(onUpdate);
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  }
});

const PostComments = ({ postId }) => {
  const [comments] = useSubscribe(useComments(postId));
  return (
    <aside>
      <header>
        <h1>Comments</h1>
      </header>
      <ul>
        {comments.map(comment => (
          <li key={comment.id}>
            <h2>{comment.author}</h2>
            <p>{comment.content}</p>
          </li>
        ))}
      </ul>
    </aside>
  );
};
```
