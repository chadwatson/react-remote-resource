import React, { useState, useEffect, useCallback } from "react";
import { append, remove } from "ramda";
import { useTags, usePosts } from "./resources";

const PostForm = ({ id, goBack }) => {
  // Returns the latest post at the given id if it exists, fetching and suspending rendering if cache is invalid
  // If there is no post with this id the promise will reject and be caught by RemoteResourceBoundary
  const [post, actions] = usePosts(id);
  // Returns the latest tags, fetching and suspending rendering if cache is invalid
  const [tags] = useTags();
  const [state, setState] = useState(post);
  const [saving, setSaving] = useState(false);

  const save = useCallback(() => {
    setSaving(true);

    actions
      // Saves to the API
      .save(state)
      // Updates the cache with the new data for this post
      .then(() => actions.update(state, Date.now()))
      .then(() => setSaving(false));
  }, [state]);

  useEffect(() => {
    // Auto saving
    const timeout = setTimeout(save, 2000);
    return () => {
      clearTimeout(timeout);
    };
  }, [state]);

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        save();
      }}
    >
      <input
        type="text"
        value={state.title}
        onChange={({ target }) => {
          setState({ ...state, title: target.value });
        }}
      />
      <input
        type="text"
        value={state.content}
        onChange={({ target }) => {
          setState({ ...state, content: target.value });
        }}
      />
      <fieldset>
        {tags.map(tag => {
          const indexInPost = post.tags.indexOf(tag.id);
          return (
            <label key={tag.id}>
              <input
                checked={indexInPost >= 0}
                id={`tag-${tag.id}`}
                onChange={({ target }) => {
                  setState({
                    ...state,
                    tags: target.checked
                      ? append(tag.id, post.tags)
                      : remove(indexInPost, post.tags)
                  });
                }}
                type="checkbox"
                value={tag.id}
              />
              {tag.label}
            </label>
          );
        })}
      </fieldset>
      <button disabled={saving}>{saving ? "Saving..." : "Save"}</button>
    </form>
  );
};

export default PostForm;
