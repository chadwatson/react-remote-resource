# react-remote-resource

Intuitive remote data management in React

## Overview

react-remote-resource simplifies the integration of remote resources, usually api endpoints, into React applications, reducing boilerplate and data over-fetching.

## How does it work?

Whenever a resource is used it will check the internal cache for a valid data entry. If a valid entry is found, the resource will return the data from the cache and the data is ready to use. If no valid entry is found, the `load` function, which returns a Promise, will be invoked and thrown. The nearest `RemoteResourceBoundary`, using `Suspsense` under the hood, will catch the Promise and render the `fallback` until all outstanding Promises resolve. If any of the Promises reject, the `RemoteResourceBoundary` calls `renderError` and `onLoadError` (if provided) otherwise it returns the `children`. This provides an intuitive way to use data from remote resources throughout your app without over-fetching, or the headache and boilerplate of Redux or some other data management library.

## Getting Started

```
npm install react-remote-resource --save
// or
yarn add react-remote-resource
```

### Example

```jsx
import {
  createRemoteResource,
  useResourceState,
  useRefreshResource,
  RemoteResourceBoundary,
  withTimeout,
  once,
  storeBy
} from "react-remote-resource";

const userResource = createRemoteResource(
  once(userId => fetchJson(`/api/users/${userId}`)
);

const tweetsResource = createRemoteResource(
  withTimeout(
    10000,
    storeBy(userId => userId, userId => fetchJson(`/api/users/${userId}/tweets`))
  )
);

const useUserTweets = userId => {
  const [tweetsByUserId] = useResourceState(tweetsResource, [userId]);
  return tweetsByUserId[userId];
};

const UserInfo = ({ userId }) => {
  const [user] = useResourceState(userResource, [userId]);
  const tweets = useUserTweets(userId);

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
  const tweets = useUserTweets(userId);
  const refreshTweets = useRefreshResource(tweetsResource, [userId]);

  return (
    <>
      <button type="button" onClick={refreshTweets}>Refresh</button>
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
    </>
  );
};

const UserProfile = ({ userId }) => (
  <RemoteResourceBoundary
    fallback={<p>Loading...</p>}
    renderError={(error, retry) => (
      <div>
        <p>{error}</p>
        <button onClick={retry}>Retry</button>
      </div>
    )}
  >
    <UserInfo userId={userId} />
    <Tweets userId={userId} />
  </RemoteResourceBoundary>
);
```

## API

### `createRemoteResource`

A function that takes a loader function and returns a resource.

```javascript
const productsResource = createRemoteResource(
  (currentState = {}, refresh) => id =>
    !currentState[id]
      ? fetch(`/api/products/${id}`)
          .then(response => response.json())
          .then(product => ({ ...currentState, [id]: product }))
      : currentState
);
```

#### Resource

The return value from `createRemoteResource` has the following shape:

```ts
type Load<A> = (...args: Array<any>) => A | Promise<A>;

type Loader<A> = (currentState: ?A, refresh: boolean) => Load<A>;

type Resource<A> = {
  // The generated UUID for the resource
  id: string,
  // A function that takes the current state and a refresh flag and returns a function that takes any arguments and returns the next state or a Promise that resolves with the next state
  loader: Loader<A>,
  refresh: Load<A>,
  // Returns the current state of the resource
  getState: () => A,
  // A function that takes the next state or a function that receives the current state and returns the next state.
  setState: (A | A => A) => void,
  // Allows for subscribing to resource state changes. Basically a wrapper around store.subscribe.
  subscribe: (() => void) => void
};
```

### `RemoteResourceBoundary`

Uses `Suspense` under the hood to catch any thrown promises and render the `fallback` while they are pending. Will also catch any errors that occur in the promise from a resource's loader and `renderError` and call `onLoadError` if provided.

```jsx
const UserProfile = ({ userId }) => (
  <RemoteResourceBoundary
    /* Optional: A React node that will show while any thrown promises are pending. `null` by default. */
    fallback={<p>Loading...</p>}
    /* Optional: A callback that is invoked when any thrown promise rejects */
    onLoadError={logError}
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

### `useResourceState`

A React hook that takes a resource and an optional array of arguments and returns a tuple, very much like React's `useState`. The second item in the tuple works like `useState` in that it sets the in-memory state of the resource. Unlike `useState`, however, the state is not local to the component. Any other components that are using the state of that same resource get updated immediately with the new state!

Under the hood `react-remote-resource` implements a redux store. Every resource get its own state in the store.

```jsx
import {
  createRemoteResouce,
  useResourceState,
  useAutoSave
} from "react-remote-resource";
import { savePost, postsResource } from "../resources/posts";

const usePost = postId => {
  const [postsById, setPosts] = useResourceState(postsResource);

  return [
    postsById[postId],
    post => setPosts({ ...postsById, [postId]: post })
  ];
};

const PostForm = ({ postId }) => {
  const [post, setPost] = usePost(postId);

  useAutoSave(post, savePost);

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        savePost(post);
      }}
    >
      <label>
        Title
        <input
          type="text"
          value={post.title}
          onChange={({ target }) => {
            setPost({ ...post, title: target.value });
          }}
        />
      </label>
      <label>
        Content
        <textarea
          value={post.title}
          onChange={({ target }) => {
            setPost({ ...post, content: target.value });
          }}
        />
      </label>
      <button>Save</button>
    </form>
  );
};
```

This hook is very powerful. Let's walk through what happens when it is used:

1. If the state of a resource is `undefined` then its loader will be invoked and the promise thrown.
2. If the promise rejects, the closest `RemoteResourceBoundary` will handle the error. If the promise resolves, the state will be available to use (as the first item in the tuple).
3. You can set the state using the second item in the tuple. Resource state changes, unlike component based `useState`, will persist in memory. If a component unmounts and remounts the state will be the same as when you left it.

### `once`

A utility function that takes a load function and only calls it if there is no current state for a resource. This allows the data to only be fetched once. Any subsequent use of the resource data will be retrieved from the store instead. This prevents making unnecessary network requests for resources that are unlikely to change or that we are confident will only change from a single user session.

```javascript
import { createRemoteResource, once } from "react-remote-resource";

const userResource = createRemoteResource(
  once(userId => fetchJson(`/api/users/${userId}`)
);

```

### `withLens`

A utility function that takes a getter function, a setter function, and a load function. The getter takes the current state of the resource and returns a function that takes the arguments to the load function and returns some substate. The setter function takes the current state of the resource and returns a function that takes the arguments to the load function and returns a function that takes some data and returns the next state of the resource. The load function takes any list of arguments and returns a promise that resolves with some data that will be passed along to the setter. If the getter function returns undefined then the load funtion will be invoked, which will then invoke the setter.

This is very handy if you want your resource to serve as an index of data. And it is flexible enough to allow you keep your data in whatever shape you want.

```javascript
import { createRemoteResource, withLens } from "react-remote-resource";

const tweetsResource = createRemoteResource(
  withLens(
    (currentState = {}) => (authToken, userId) => currentState[userId],
    (currentState = {}) => (authToken, userId) => tweets => ({
      ...currentState,
      [userId]: tweets
    }),
    (authToken, userId) =>
      fetch(`/api/users/${userId}/tweets?auth=${authToken}`).then(res =>
        res.json()
      )
  )
);
```

In this example the state of the resource will have the following shape:

```javascript
{
  [userId]: tweets
}
```

And we can `useResourceState` like normal.

```jsx
const Tweets = ({ authToken, userId }) => {
  const [tweetsByUserId] = useResourceState(tweetsResource, [
    authToken,
    userId
  ]);

  return tweetsByUserId[userId].map(tweet => (
    <Tweet key={tweet.id} tweet={tweet} />
  ));
};
```

### `storeBy`

A utility function that takes a hashing function and a load function. The state of the resource will now be an object literal where the keys are created by the hashing function. If a value does not exist at a given key then the load function will be called and the resolved value will be stored in the object state at the created key. This allows the data for a given key to only be fetched once.

This is just an opinionated version of `withLens`.

```javascript
import { createRemoteResource, storeBy } from "react-remote-resource";

const tweetsResource = createRemoteResource(
  storeBy(
    (authToken, userId) => userId,
    (authToken, userId) =>
      fetch(`/api/users/${userId}/tweets?auth=${authToken}`).then(res =>
        res.json()
      )
  )
);
```

### `withTimeout`

A utility function that takes a timeout duration in milliseconds and a loader function. This allows you to prevent fetching for a certain amount of time. **Note:** The timeout will be bypassed if `refresh` is called.

```javascript
import { createRemoteResource, withTimeout } from "react-remote-resource";

const tweetsResource = createRemoteResource(
  withTimeout(10000, (currentState = {}) => (authToken, userId) =>
    fetch(`/api/users/${userId}/tweets?auth=${authToken}`)
      .then(res => res.json())
      .then(tweets => ({ ...currentState, [userId]: tweets }))
  )
);
```

### `useAutoSave`

A React hook that takes a value, a save function, and an optional delay in milliseconds (defaults to 1000). When the value changes the new value will be saved if the value remains the same for the delay time.

This is useful for optimistic UIs where the state of the resource is the source of truth and we are confident that the save will succeed.

```jsx
import {
  createRemoteResouce,
  useResourceState,
  useAutoSave
} from "react-remote-resource";
import { savePost, usePost } from "../resources/posts";

const PostForm = ({ postId }) => {
  const [post, setPost] = usePost(postId);

  useAutoSave(post, savePost);

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        savePost(post);
      }}
    >
      <label>
        Title
        <input
          type="text"
          value={post.title}
          onChange={({ target }) => {
            setPost({ ...post, title: target.value });
          }}
        />
      </label>
      <label>
        Content
        <textarea
          value={post.title}
          onChange={({ target }) => {
            setPost({ ...post, content: target.value });
          }}
        />
      </label>
      <button>Save</button>
    </form>
  );
};
```

### `useSuspense`

A hook that takes a promise returning function. It will throw the returned promise as long as it is pending.

```jsx
import { useSuspense } from "react-remote-resource";
import { saveUser } from "../resources/user";

const SaveButton = ({ onClick }) => (
  <button onClick={useSuspense(onClick)}>Save</button>
);

const UserForm = () => (
  <div>
    ...Your form fields
    <Suspense fallback={<p>Saving...</p>}>
      <SaveButton onClick={saveUser} />
    </Suspense>
  </div>
);
```

### `createLensCreator`

```jsx
const userTweetsLens = createLensCreator(userId => [
  (currentState = {}) => currentState[userId],
  (currentState = {}) => userTweets => ({
    ...currentState,
    [userId]: userTweets
  })
]);

const tweetsResource = createRemoteResource(
  withLens(userTweetsLens, userId => fetch().then(res => res.json()))
);

const useUserTweets = userId => useResourceLens(userTweetsLens, [userId]);

const UserTweets = ({ userId }) => {
  const [userTweets, setUserTweets] = useUserTweets(userId);

  // return (
  //   ...
  // );
};
```
