import React, { useCallback } from "react";
import { withRouter } from "react-router-dom";
import PostForm from "./PostForm";
import { useNewPost } from "./resources";

const NewPostForm = ({ history }) => {
  const [post, createPost] = useNewPost();
  return (
    <PostForm
      onSave={useCallback(
        state =>
          createPost(state).then(({ id }) => history.push(`/posts/${id}`)),
        []
      )}
      post={post}
    />
  );
};

export default withRouter(NewPostForm);
