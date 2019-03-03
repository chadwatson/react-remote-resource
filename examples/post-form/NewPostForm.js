import React, { useCallback } from "react";
import { withRouter } from "react-router-dom";
import PostForm from "./PostForm";
import { usePosts } from "./resources";

const NewPostForm = ({ history }) => {
  const [post, actions] = usePosts("new");
  return (
    <PostForm
      onSave={useCallback(
        state =>
          actions.save(state).then(({ id }) => history.push(`/posts/${id}`)),
        []
      )}
      post={post}
    />
  );
};

export default withRouter(NewPostForm);
