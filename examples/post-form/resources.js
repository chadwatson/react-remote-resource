import uuid from "uuid/v1";
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

export const usePosts = createRemoteResource({
  id: "posts", // Required: Unique identifier for the cache
  load: id =>
    new Promise((resolve, reject) => {
      if (id && postsById[id]) {
        resolve(postsById[id]);
      } else if (id === "new") {
        resolve({
          title: "",
          id: null,
          content: "",
          tags: []
        });
      } else if (id && !postsById[id]) {
        reject("Post not found");
      } else {
        setTimeout(() => {
          resolve(postsById);
        }, 2000);
      }
    }),
  save: post =>
    new Promise(resolve => {
      setTimeout(() => {
        const postWithId = post.id ? post : { ...post, id: uuid() };
        postsById[postWithId.id] = postWithId;
        resolve(postWithId);
      }, 1000);
    })
});

export const useTags = createRemoteResource({
  id: "tags", // Required: Unique identifier for the cache
  load: () =>
    new Promise(resolve => {
      setTimeout(() => {
        resolve(tags);
      }, 1000);
    })
});
