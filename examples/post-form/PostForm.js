import React, { useState, useEffect, useCallback, Suspense } from "react";
import { append, remove } from "ramda";
import { useTags } from "./resources";
import useSuspense from "./use-suspense";

const Button = ({ onClick, children }) => (
  <button onClick={useSuspense(onClick)}>{children}</button>
);

const PostForm = ({ post, onSave, onDelete, goBack }) => {
  // Returns the latest tags, fetching and suspending rendering if cache is invalid
  const [tags] = useTags();
  const [state, setState] = useState(post);

  const save = useCallback(() => onSave(state), [state]);

  useEffect(() => {
    // Auto saving
    const timeout = setTimeout(() => {
      if (post.id) {
        save();
      }
    }, 2000);
    return () => {
      clearTimeout(timeout);
    };
  }, [state]);

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
      }}
    >
      <div>
        <label>
          Title
          <input
            type="text"
            value={state.title}
            onChange={({ target }) => {
              setState({ ...state, title: target.value });
            }}
          />
        </label>
      </div>
      <div>
        <label>
          Content
          <input
            type="text"
            value={state.content}
            onChange={({ target }) => {
              setState({ ...state, content: target.value });
            }}
          />
        </label>
      </div>
      <div>
        <fieldset>
          Tags
          {tags.map(tag => {
            const indexInState = state.tags.indexOf(tag.id);
            return (
              <div key={tag.id}>
                <label>
                  <input
                    checked={indexInState >= 0}
                    id={`tag-${tag.id}`}
                    onChange={({ currentTarget }) => {
                      setState({
                        ...state,
                        tags: currentTarget.checked
                          ? append(tag.id, state.tags)
                          : remove(indexInState, 1, state.tags)
                      });
                    }}
                    type="checkbox"
                    value={tag.id}
                  />
                  {tag.label}
                </label>
              </div>
            );
          })}
        </fieldset>
      </div>
      <Suspense fallback={<span>Saving...</span>}>
        <Button onClick={save}>Save</Button>
      </Suspense>
      <Suspense fallback={<span>Deleting...</span>}>
        <Button onClick={() => onDelete(post)}>Delete</Button>
      </Suspense>
    </form>
  );
};

export default PostForm;
