import uuid from "uuid/v1";
import { useMemo, useCallback } from "react";
import { dissoc } from "ramda";
import { createRemoteResource } from "react-remote-resource";

// You'd probably use an API in real life, but we'll simulate one here.
const postsById = {
  123: {
    title: "Hello world",
    id: 123,
    content: "This is the content",
    tags: []
  }
};

const tags = [
  {
    id: 111,
    label: "Marketing"
  },
  {
    id: 222,
    label: "Development"
  },
  {
    id: 333,
    label: "Design"
  }
];

const commentsByPostId = {
  123: [
    {
      id: 656,
      author: "Bob Jones",
      content: "Hello world"
    },
    {
      id: 565,
      author: "George Watson",
      content: "Hello Bob!"
    }
  ]
};

export const usePosts = createRemoteResource({
  id: "posts", // Required: Unique identifier for the cache
  load: () =>
    new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve(postsById);
      }, 2000);
    }),
  save: post =>
    new Promise(resolve => {
      setTimeout(() => {
        const postWithId = post.id ? post : { ...post, id: uuid() };
        postsById[postWithId.id] = postWithId;
        resolve(postWithId);
      }, 1000);
    }),
  delete: post =>
    new Promise(resolve => {
      setTimeout(() => {
        delete postsById[post.id];
        resolve(post);
      }, 1000);
    })
});

export const usePost = id => {
  const [posts, actions] = usePosts();
  return [
    posts.get(id),
    {
      ...actions,
      setCache: post => actions.setCache({ ...posts, [id]: post }),
      deleteCache: post => actions.deleteCache(dissoc(id, post))
    }
  ];
};

export const useNewPost = () => {
  const [posts, actions] = usePosts();
  return [
    useMemo(
      () => ({
        title: "",
        content: "",
        tags: []
      }),
      []
    ),
    useCallback(data => {
      actions.remoteSave(data).then(savedPost => {
        actions.setCache({ ...posts, [savedPost.id]: savedPost });
        return savedPost;
      });
    }, [])
  ];
};

export const useTags = createRemoteResource({
  id: "tags", // Required: Unique identifier for the cache
  load: () =>
    new Promise(resolve => {
      setTimeout(() => {
        resolve(tags);
      }, 1000);
    })
});

const loadComments = postId =>
  new Promise(resolve => {
    setTimeout(() => {
      resolve(commentsByPostId[postId]);
    }, 1000);
  });

export const useComments = createRemoteResource({
  id: "comments", // Required: Unique identifier for the cache
  load: loadComments,
  subscribe: onUpdate => postId => {
    const interval = setInterval(() => {
      loadComments(postId).then(onUpdate);
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  }
});
