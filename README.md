# react-remote-resource

Intuitive remote data management in React

&nbsp;

## Overview

`react-remote-resource` simplifies using remote resources, usually api endpoints, in React applications.

### How does it work?

`react-remote-resource` creates composable `resources` that act as the single point of truth for a remote resource.

#### Lifecycle

A resource is meant to be used inside of React components using the `useEntry` hook attached to the resource. This hook will check against an internal cache for a valid data entry. If the `resource` finds a valid entry, it will return the data. Otherwise the `load` function, which returns a Promise, will be invoked and thrown. The nearest `RemoteResourceBoundary` (using `Suspense` under the hood) will catch the Promise from the `load` function and render the `fallback` until all outstanding Promises resolve. If any Promise rejects, the `RemoteResourceBoundary` will render the required `renderError` prop and `onLoadError` will be called, if provided. Otherwise `children` will be rendered.

This provides a straightforward and consistent way to use data from remote resources throughout your app without over-fetching, or the headache and boilerplate of Redux or some other data management library.

&nbsp;

&nbsp;

## Getting Started

### Installation

```
npm install react-remote-resource --save
// or
yarn add react-remote-resource
```

### Example

```jsx
import {
  createResource,
  createSingleEntryResource,
  createTimedKeyedResource,
  useEntry,
  RemoteResourceBoundary,
} from "react-remote-resource";

const userResource = createSingleEntryResource(
  userId => fetchJson(`/api/users/${userId}`
);

const tweetsResource = createTimedKeyedResource(
  10000,
  userId => userId,
  userId => fetchJson(`/api/users/${userId}/tweets`)
);

const UserInfo = ({ userId }) => {
  const [user] = useEntry(userResource, [userId]);
  const [tweets] = useEntry(tweetsResource, [userId]);

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
  const [tweets] = useEntry(tweetsResource, [userId]);

  return (
    <>
      <button type="button" onClick={() => tweetsResource.refresh(userId)}>Refresh</button>
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

&nbsp;

---

&nbsp;

## Resource Creators

Each resource creator will return a `resource` in the following shape:

```ts
type Resource<A> = {
  // A function that takes the current state and a refresh flag and returns a function that takes any arguments and returns the next state or a Promise that resolves with the next state. Note: It is up to you to handle a rejected Promise. A `RemoteResourceBoundary` will not catch it.
  refresh: (...args: Array<any>) => Promise<A>,

  // Returns the current state of the resource
  getState: () => A,

  // A function that takes the next state or a function that receives the current state and returns the next state.
  setState: (A | A => A) => void,

  // Allows for subscribing to resource state changes. Basically a wrapper around store.subscribe.
  subscribe: (() => void) => void,

  // A react hook that allows you to use a resource entry's state in the same way that you would use React's useState
  useEntry: <A>(...args: Array<any>) => [A, (A | A => A) => void]
};
```

### `createResource`

Creates a new resource.

```javascript
const productsResource = createResource(
  // A function that gets an entry from the state.
  (currentState = {}, [id]) => currentState[id],

  // A function that sets an entry in the state.
  (currentState = {}, [id], product) => ({
    ...currentState,
    [id]: product
  }),

  // A predicate that tests whether the entry is still valid.
  (product, args) => !!product,

  // The loader function that fetches data. Should return a promise.
  id => fetch(`/api/products/${id}`).then(response => response.json())
);
```

&nbsp;

### `createSingleEntryResource`

Creates a resource that only has one entry. It conveniently supplies getter, setter, and predicate functions to `createResource` under the hood, allowing you to simply supply a function that fetches your data. Once your data is fetched it will not be refetched.

```javascript
const myResource = createSingleEntryResource(authToken =>
  fetch(`/api/about_me?auth_token=${authToken}`)
);
```

&nbsp;

### `createTimedSingleEntryResource`

An opinionated version of `createSingleEntryResource` that keeps track of the last time the data was fetched. When an attempt to use the resource state occurs more than the given amount of milliseconds since the last fetch then the state is considered invalid, and the loader is called.

```javascript
const myResource = createTimedSingleEntryResource(10000, authToken =>
  fetch(`/api/about_me?auth_token=${authToken}`)
);
```

&nbsp;

### `createKeyedResource`

Creates a resource that organizes its entries into an object literal. It takes a key setter function and a loader function that fetches your data. The key setter function derives the entry key from the same arguments that are supplied to the loader function. Once an entry is fetched it will not be refetched.

```javascript
const myResource = createKeyedResource(
  // A function that takes all of the arguments that are supplied to the loader and uses the returned value as the key
  (authToken, userId) => userId,
  (authToken, userId) => fetch(`/api/users/${userId}?auth_token=${authToken}`)
);
```

&nbsp;

### `createTimedKeyedResource`

An opinionated version of `createKeyedResource` that has the same timeout functionality as `createTimedSingleEntryResource` except that each entry in the resource state can timeout independently.

```javascript
const myResource = createTimedKeyedResource(
  10000,
  (authToken, userId) => userId,
  (authToken, userId) => fetch(`/api/about_me?auth_token=${authToken}`)
);
```

&nbsp;

### `persistResource`

A higher order function that adds persistence to a specific resource.

#### Params

- `getInitialState` - A function that returns a promise with the initial data. If the promise resolves, the data in the promise is used as the initial state of the resource. If the promise rejects, the load function of the resource will be called. This function is lazy and will only be called when an entry from the resource is requested.

- `saveState` - A function that is called any time the resource state changes. It provides the new state, giving you the ability to persist it to something like `localStorage`.

- `resource` - The resource to persist

```javascript
const todosResource = persistResource(
  () => {
    const result = localStorage.getItem("todos");
    return result ? Promise.resolve(JSON.parse(result)) : Promise.reject();
  },
  state => {
    localStorage.setItem("todos", JSON.stringify(state));
  },
  createSingleEntryResource(() => fetch("/api/todos"))
);
```

&nbsp;

---

&nbsp;

## Components

### `RemoteResourceBoundary`

Uses `Suspense` under the hood to catch any thrown promises and render the `fallback` while they are pending. Will also catch any errors that occur in the promise from a resource's loader and `renderError` and call `onLoadError` if provided.

```jsx
const UserProfile = ({ userId }) => (
  <RemoteResourceBoundary
    /* A React node that will show while any thrown promises are pending. */
    fallback={<p>Loading...</p>}
    /* Optional: A callback that is invoked when any thrown promise rejects */
    onLoadError={logError}
    /* A render prop that receives the error and a function to clear the error, which allows the children to re-render and attempt loading again */
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

&nbsp;

---

&nbsp;

## React Hooks

### `useEntry`

A React hook that takes a resource and an optional array of arguments and returns a tuple, very much like React's `useState`. The second item in the tuple works like `useState` in that it sets the in-memory state of the resource. Unlike `useState`, however, the state is not local to the component. Any other components that are using the state of that same resource get updated immediately with the new state!

Under the hood `react-remote-resource` implements a redux store. Every resource get its own state in the store.

```jsx
import {
  createRemoteResouce,
  useEntry,
  useAutoSave
} from "react-remote-resource";
import { savePost, postsResource } from "../resources/posts";

const PostForm = ({ postId }) => {
  const [post, setPost] = useEntry(postsResource, [postId]);

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

1. The getter function (the first argument given to `createResource`) is used to get the entry out of the resource state.
2. The predicate (the third argument given to `createResource`) is used to test whether or not the entry is valid. If not the loader (the fourth argument) will be invoked and the promise thrown.
3. If the promise rejects, the closest `RemoteResourceBoundary` will handle the error. If the promise resolves, the setter function (the second argument give to `createResource`) is used to set the resolved data in the resource state.
4. You can set the entry state using the second item in the tuple. Resource state changes, unlike component based `useState`, will persist in memory. If a component unmounts and remounts the state will be the same as when you left it.

&nbsp;

### `useAutoSave`

A React hook that takes a value, a save function, and an optional delay in milliseconds (defaults to 1000). When the value changes the new value will be saved if the value remains the same for the delay time.

This is useful for optimistic UIs where the state of the resource is the source of truth and we are confident that the save will succeed.

```jsx
import {
  createRemoteResouce,
  useEntry,
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

&nbsp;

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
