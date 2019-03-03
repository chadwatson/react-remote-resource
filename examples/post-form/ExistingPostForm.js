import React, { useCallback } from "react";
import PostForm from "./PostForm";
import { usePosts } from "./resources";

const ExistingPostForm = ({ id }) => {
  // Returns the latest post at the given id if it exists, fetching and suspending rendering if cache is invalid
  // If there is no post with this id the promise will reject and be caught by RemoteResourceBoundary
  const [post, actions] = usePosts(id);
  return (
    <PostForm
      onSave={useCallback(state => {
        actions.set(state);
        return actions.save(state);
      }, [])}
      post={post}
    />
  );
};

export default ExistingPostForm;
