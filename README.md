# react-remote-resource

Intuitive remote data management in React

&nbsp;

## Overview

`react-remote-resource` simplifies using remote resources, usually api endpoints, in React applications.

### How does it work?

`react-remote-resource` creates composable `resources` that act as the single point of truth for a remote resource.

#### Lifecycle

A resource is meant to be used inside of React components using the `useState` hook attached to the resource. This hook will check against an internal cache for valid state. If the `resource` finds valid state, it will return the data. Otherwise the `load` function, which returns a Promise, will be invoked and thrown. The nearest `RemoteResourceBoundary` (using `Suspense` under the hood) will catch the Promise from the `load` function and render the `fallback` until all outstanding Promises resolve. If any Promise rejects, the `RemoteResourceBoundary` will render the required `renderError` prop and `onLoadError` will be called, if provided. Otherwise `children` will be rendered.

This provides a straightforward and consistent way to use data from remote resources throughout your app without over-fetching, or the headache and boilerplate of Redux or some other data management library.

&nbsp;

&nbsp;

## Getting Started

### Installation

```bash
npm install react-remote-resource --save
// or
yarn add react-remote-resource
```

### Example

```jsx
import {
  createSimpleResource,
  createKeyedResource,
  RemoteResourceBoundary
} from "react-remote-resource";

const userResource = createSimpleResource(userId =>
  fetch(`/api/users/${userId}`).then(res => res.json())
);

const tweetsResource = createKeyedResource(userId =>
  fetch(`/api/users/${userId}/tweets`).then(res => res.json())
);

const UserInfo = ({ userId }) => {
  const [user] = userResource.useState(userId);
  const [tweets] = tweetsResource.useState(userId);

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
  const [tweets] = tweetsResource.useState(userId);

  return (
    <>
      <button type="button" onClick={() => tweetsResource.refresh(userId)}>
        Refresh
      </button>
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
    renderError={({ error, retry }) => (
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
  // The auto-generated UUID for the resource
  id: string,

  // A function that takes the current state and a refresh flag and returns a function that takes any arguments and returns the next state or a Promise that resolves with the next state. Note: It is up to you to handle a rejected Promise. A `RemoteResourceBoundary` will not catch it.
  refresh: (...args: Array<any>) => Promise<A>,

  // Returns the current state of the resource
  getState: () => A,

  // A function that takes the next state or a function that receives the current state and returns the next state.
  setState: (A | A => A) => void,

  // Allows for subscribing to resource state changes. Basically a wrapper around store.subscribe.
  subscribe: (() => void) => void,

  // A react hook that allows you to use the resource's state in the same way that you would use React's useState.
  // The state that gets returned will be the result of calling the getter function with the provided arguments.
  useState: <A>(...args: Array<any>) => [A, (A | A => A) => void]
};
```

### `createResource`

Creates a new resource.

```javascript
const productsResource = createResource({
  // A function that selects some substate from the resource state
  selectState: (currentState = {}, [id]) => currentState[id],

  // A function that sets the state
  setState: (currentState = {}, [id], product) => ({
    ...currentState,
    [id]: product
  }),

  // The loader function that fetches data. Should return a promise.
  loader: id => fetch(`/api/products/${id}`).then(response => response.json()),

  // Optional: A function that tests if the state is not empty. If this returns `false` the loader will be called.
  hasState: state => state !== undefined
});
```

&nbsp;

### `createSimpleResource`

Creates a resource that will refetch if the given arguments change. It conveniently supplies getter, setter, and predicate functions to `createResource` under the hood, allowing you to simply supply a function that fetches your data. Once your data is fetched it will not be refetched unless you provide different arguments to `useState` or call `refresh`.

```javascript
const myResource = createSimpleResource(
  // The loader function that fetches data. Should return a promise.
  authToken => fetch(`/api/about_me?auth_token=${authToken}`)
);
```

#### [`createSimpleResource` example on CodeSandbox](https://codesandbox.io/s/xpn5nq3ol4)

&nbsp;

### `createKeyedResource`

Creates a resource that organizes its fetched data into an object literal. It takes a key setter function and a loader function that fetches your data. The key setter function derives the state key from the same arguments that are supplied to the loader function. If `useState` is used with arguments that map to an existing key in the state the data will not be re-fetched.

```javascript
const myResource = createKeyedResource(
  // The loader function that fetches data. Should return a promise.
  (authToken, userId) => fetch(`/api/users/${userId}?auth_token=${authToken}`)

  // Optional: A function that takes all of the arguments that are supplied to the loader, from resource.useState, and uses the returned value as the key
  (authToken, userId) => userId,
);
```

#### [`createKeyedResource` example on CodeSandbox](https://codesandbox.io/s/9jwk17qyj4)

&nbsp;

---

&nbsp;

## Resource Enhancers

### `batchSetState`

Provides the ability to set state on multiple resources at once, triggering only one state change to the underlying store. This means that React would only need to re-render once instead of once for each state change.

It takes tuples where the first item is a resource and the second is either a value to set or a function to update the current value.

```javascript
const dissoc = key => obj => {
  const copy = {...obj};
  delete copy[key];
  return copy;
};

const removeAccountState = dissoc(12345);

batchSetState(
  [messagesResource, removeAccountState],
  [postsResource, removeAccountState],
  [notificationsResource, removeAccountState],
  [photosResource, removeAccountState]
);
```

### `persistResource`

A higher order function that adds persistence to a specific resource.

```javascript
const todosResource = persistResource(
  // `getInitialState` - A function that returns a promise with the initial data. If the promise resolves, the data in the promise is used as the initial state of the resource. If the promise rejects, the load function of the resource will be called. This function is lazy and will only be called when `useState` is used.
  () => {
    const result = localStorage.getItem("todos");
    return result ? Promise.resolve(JSON.parse(result)) : Promise.reject();
  },

  // `saveState` - A function that is called any time the resource state changes. It provides the new state, giving you the ability to persist it to something like `localStorage`.
  state => {
    localStorage.setItem("todos", JSON.stringify(state));
  },

  // `resource` - The resource to persist
  createSimpleResource(() => fetch("/api/todos"))
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
    renderError={({ error, retry }) => (
      <div>
        <p>{error}</p>
        <button onClick={retry}>Try again</button>
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

### `resource.useState`

A React hook that takes an optional array of arguments and returns a tuple, very much like React's `useState`. Unlike React's `useState`, however, the state is not local to the component. Any other components that are using the state of that same resource get updated immediately with the new state!

```javascript
const [post, setPost] = postsResource.useState(postId);
```

Let's look at an example to understand how this works.

Take the following resource:

```javascript
const tweetsResource = createKeyedResource(userId =>
  fetch(`/api/users/${userId}/tweets`).then(res => res.json())
);
```

This resource will fetch and store tweets by userId. Once it has fetched the tweets for a user it won't re-fetch them. Let's create a component that will render a user's tweets.

```jsx
const UserTweets = ({ userId }) => {
  const [tweets] = tweetsResource.useState(userId);

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
```

When `UserTweets` renders, the `useState` hook will take the given `userId`, and check if tweets have been fetched for this user. If they have, they will be returned as the first item in the tuple. If they haven't then the loader function will be called and the returned promise will be thrown, which will be caught by the nearest `RemoteResourceBoundary`. Whatever data the promise resolves with will be set as the tweets for that user. Once the data has been received for this user, the state will be set and the component will re-render with the new state. If the component re-renders after this the loader function will not be called since the tweets have already been fetched. We will always get back the latest state.

Of course, we are not limited to reading state. Similar to React's `useState` we can update the state of our resource as well. Let's look at another example to show why this is useful.

```javascript
const profileResource = createSimpleResource(authToken =>
  fetch("/my_profile", {
    headers: {
      Authorization: `Bearer ${authToken}`
    }
  }).then(res => res.json())
);
```

This resource will fetch and store the profile data for the logged-in user. Now let's create a component that allows the user to edit their profile.

```jsx
import { useAutoSave } from "react-remote-resource";

const saveProfile = profile =>
  fetch("/my_profile", {
    method: "PUT",
    body: JSON.stringify(profile)
  });

const ProfileForm = ({ authToken }) => {
  const [profile, setProfile] = profileResource.useState(authToken);

  useAutoSave(profile, saveProfile);

  return (
    <section>
      <label>
        First Name
        <input
          type="text"
          value={profile.firstName}
          onChange={({ target }) =>
            setProfile({ ...profile, firstName: target.value })
          }
        />
      </label>
      <label>
        Last Name
        <input
          type="text"
          value={profile.lastName}
          onChange={({ target }) =>
            setProfile({ ...profile, lastName: target.value })
          }
        />
      </label>
      <label>
        Email
        <input
          type="text"
          value={profile.email}
          onChange={({ target }) =>
            setProfile({ ...profile, email: target.value })
          }
        />
      </label>
    </section>
  );
};
```

Notice that there's no save button! We're using an optimistic UI, where we update the local state immediately and then save it to our API after the fact. This can really help you remove friction for your users.

**Pro Tip!** Since `useState` is just a React hook, you can create custom hooks with it!

```javascript
const authTokenResource = createSimpleResource(
  () =>
    new Promise(resolve => resolve(localStorage.getItem("authToken") || ""))
);

const profileResource = createSimpleResource(authToken =>
  fetch("/my_profile", {
    headers: {
      Authorization: `Bearer ${authToken}`
    }
  }).then(res => res.json())
);

const useAuthToken = () => {
  const [authToken] = authTokenResource.useState();
  return authToken;
};

const useProfile = () =>
  profileResource.useState(useAuthToken());

const ProfileForm = () => {
  // Now your components don't need to have any knowledge of your authToken
  const [profile, setProfile] = useProfile();

  return (
    // ...
  );
};
```

### `provideContext`

A function that allows you to use a React hook to provide a value to a resource.

```javascript
const authTokenResource = createSimpleResource(() =>
  Promise.resolve(localStorage.getItem("authToken") || "")
);

const useAuthToken = () => {
  const [authToken] = authTokenResource.useState();
  return authToken;
};

const profileResource = provideContext(
  useAuthToken,
  createSimpleResource(authToken =>
    fetch("/my_profile", {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    }).then(res => res.json())
  )
);

const ProfileForm = () => {
  const [profile] = profileResource.useState();
  return (
    // ...
  );
};
```

&nbsp;

&nbsp;

### `useAutoSave`

A React hook that takes a value, a save function, and an optional delay in milliseconds (defaults to 1000). When the value changes the new value will be saved if the value remains the same for the delay time.

This is useful for optimistic UIs where the state of the resource is the source of truth and we are confident that the save will succeed.

```jsx
import { createRemoteResouce, useAutoSave } from "react-remote-resource";
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

&nbsp;

### `resetAllResources`

An effectful function that resets the state of all resources in memory.

```javascript
import React from "react";
import { resetAllResources } from "react-remote-resource";

const LogOutButton = () => <button onClick={resetAllResources}>Log out</button>;
```

&nbsp;

### `resetResources`

An effectful function that resets the state of the given resources.

```javascript
import React from "react";
import { resetResources } from "react-remote-resource";
import profileResource from "../resources/profile";
import productsResource from "../resources/products";
import ratingsResource from "../resources/ratings";

const logOut = () => {
  resetResource([profileResource, productsResource, ratingsResource]);
};

const LogOutButton = () => <button onClick={logOut}>Log out</button>;
```

&nbsp;

---

&nbsp;

## FAQ

&nbsp;

> ### Does my data need to be in a specific shape to use `react-remote-resource`?

No, `react-remote-resource` aims to organize your apis regardless of shape or type! Whatever resolves from the promise of the `load` function will be stored in the state.

&nbsp;
&nbsp;

> ### When should I use `createKeyedResource` vs `createSimpleResource`?

The main difference between `createSimpleResource` and `createKeyedResource` is how the created `resource` stores the data that gets fetched.

- `createSimpleResource` creates a resource that only keeps around the data from the most recent fetch. All data, regardless of the structure, will be stored. If the arguments passed to `useState` are different from the last time it was used it will reload the data. Use this resource if you want to prioritize keeping your memory consumption small.

- `createKeyedResource` creates a resource that accumulates the results from each fetch, allowing you to access the data by a key that gets derived from the arguments passed into the loader function. [See the second parameter for more info on how keys can be created](https://github.com/chadwatson/react-remote-resource#createkeyedresource). Use this resource if you want to prioritize not over-fetching.

The following example scenerios show when `createKeyedResource` and `createSimpleResource` are best suited:

#### Example Users API:

Assuming You have a users api that takes an id and returns user information:

```javascript
/*

  /api/users/:id

  Example Response:
  {
    name: "name",
    id: {userId},
    ...
  }

*/
```

**Scenerio 1:**

The app only needs the current user's information. Since the app only needs one piece of data from the api (the current user's information and no others), `createSimpleResource` would work well.

```jsx
const load = id => fetch(`/api/users/${id}`);
const userResource = createSimpleResource(load);

const AboutMe = () => {
  const [user] = userResource.useState(12345);
  return ...;
};
```

**Scenerio 2**

The app needs to make individual requests to the same users API and store the results independently. `createKeyedResource` would be the better choice.

```jsx
const load = id => fetch(`/api/users/${id}`);
const usersResource = createKeyedResource(load);

const User = ({ id }) => {
  const [user] = usersResource.useState(id);

  return ...;
}

const UserList = ({ ids }) => {
  return ids.map(id => <User key={id} id={id} />);
}
```

### Example Clients API:

Assuming you have a clients API that takes an `account_rep_id` and returns a list of clients for that specific account rep:

```javascript
/*

/api/clients/:account_rep_id

[
  {
    id: 123454,
    ...
  },
  {
    id: 508923,
    ...
  },
  {
    id: 14,
    ...
  },
  {
    id: 995,
    ...
  }
]

*/
```

**Scenerio 1:**

The app only needs the current account rep's list: `createSimpleResource` would work well.

```jsx
const load = (id) => fetch(`/api/clients/${id}`);
const clientsResource = createSimpleResource(load);

const ClientList = () => {
  const [clients] = clientsResource.useState(12345);
  return ...;
};
```

**Scenerio 2:**

The app needs multiple account rep's client list: `createKeyedResource` is better suited for this purpose.

```jsx
const load = account_rep_id => fetch(`/api/clients/${account_rep_id}`);
const clientsResource = createKeyedResource(load);

const ClientList = ({ account_rep_id }) => {
  const [clients] = clientsResource.useState(account_rep_id);
  return ...;
}
```

### Example Posts API:

You have a posts api that takes no parameters and returns a list of posts organized by post id:

```javascript
/*

/api/posts

[
  {
    id: 882,
    userId: 5
  },
  {
    id: 622,
    userId: 10
  },
  {
    id: 622,
    userId: 10
  },
  {
    id: 1,
    userId: 1
  },
  {
    id: 102,
    userId: 10
  }
]

*/
```

The app itself needs the data to be organized by userId.

`createSimpleResource` could be utilized and composed for this:

```jsx
const postsResource = createSimpleResource(() =>
  fetch("/api/posts").then(posts =>
    posts.reduce(
      (acc, post) => ({
        ...acc,
        [post.userId]: acc[post.userId] ? [...acc[post.userId], post] : [post]
      }),
      {}
    )
  )
);

const useUsersPosts = id => {
  const [allPosts] = postsResources.useState();
  return allPosts[id] || [];
};
```

### Last Note

`createSimpleResource` and `createKeyedResource` are composed versions of `createResource`. If they do not fit your use case, try using `createResource` directly, as it may better suit your needs.

&nbsp;
