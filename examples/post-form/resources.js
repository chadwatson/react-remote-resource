import uuid from "uuid/v1";
import { createRemoteResource } from "../../src";

// You'd probably use an API in real life, but we'll simulate one here.
const postsById = {};
const tags = [];

export const usePosts = createRemoteResource({
  id: "posts", // Required: Unique identifier for the cache
  load: id =>
    new Promise((resolve, reject) => {
      setTimeout(() => {
        if (id && postsById[id]) {
          resolve(postsById[id]);
        } else if (id && !postsById[id]) {
          reject("Post not found");
        } else {
          resolve(postsById);
        }
      }, 2000);
    }),
  save: post =>
    new Promise(resolve => {
      setTimeout(() => {
        const postWithId = post.id ? post : { ...post, id: uuid() };
        postsById[postWithId.id] = postWithId;
        return Promise.resolve(postWithId);
      }, 3000);
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
