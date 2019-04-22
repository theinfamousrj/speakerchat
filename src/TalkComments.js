import React, { useReducer, useEffect, useState } from 'react'
import { css } from 'glamor'
import { API, graphqlOperation } from 'aws-amplify'
import ReactMarkdown from 'react-markdown'
import uuid from 'uuid/v4'

import CommentModal from './CommentModal'
import { listCommentsForTalk } from './graphql/queries'
import { createComment as CreateComment } from './graphql/mutations'
import { SC_PROFILE_KEY } from './constants'

const USERNAME = window.localStorage.getItem(SC_PROFILE_KEY)
const KEY = 'SPEAKERCHAT_TALK_COMMENTS_'
const CLIENT_ID = uuid()

const initialState = {
  loading: false,
  loaded: false,
  comments: [],
  error: false
}

function reducer(state, action) {
  switch(action.type) {
    case 'set':
      return { ...state, comments: action.comments, loading: false, loaded: true }
    case 'add':
      return {
        ...state, comments: [action.comment, ...state.comments]
      }
    case 'error':
      return { ...state, error: action.error }
    case 'setLoading':
      return { ...state, loading: true }
    default:
      throw Error()
  }
}

function getFromStorage(talkId, dispatch) {
  const comments = window.localStorage.getItem(`${KEY}${talkId}`)
  if (comments) {
    dispatch({ type: 'set', comments: JSON.parse(comments) })
  } else {
    dispatch({ type: 'setLoading' })
  }
}

function setToStorage(talkId, talks) {
  window.localStorage.setItem(`${KEY}${talkId}`, JSON.stringify(talks))
} 

async function fetchComments(talkId, dispatch) {
  try {
    getFromStorage(talkId, dispatch)
    const commentData = await API.graphql(graphqlOperation(listCommentsForTalk, { talkId }))
    const comments = commentData.data.listCommentsForTalk.items
    setToStorage(talkId, comments)
    dispatch({ type: 'set', comments })
  } catch (error) {
    console.log('error:', error)
    dispatch({ type: 'error', error })
  }
}

async function createComment(talkId, comment, dispatch, toggleModal) {
  if (comment === '') {
    alert('Please create a comment')
    return
  }
  
  let newComment = {
    talkId,
    text: comment,
    clientId: CLIENT_ID,
    createdAt: Date.now(),
    createdBy: USERNAME
  }
  console.log('newComment: ', newComment)
  const comments = window.localStorage.getItem(`${KEY}${talkId}`)
  let newCommentArray = JSON.parse(comments)
  newCommentArray = [newComment, ...newCommentArray]

  setToStorage(talkId, newCommentArray)

  dispatch({
    type: 'add', comment: newComment
  })
  toggleModal()
  try {
    await API.graphql(graphqlOperation(CreateComment, { input: newComment }))
    console.log('successfully created comment!')
  } catch (err) {
    console.log('error creating comment..', err)
  }
}

function TalkComments(props) {
  const [state, dispatch] = useReducer(reducer, initialState)
  const [modalVisible, toggle] = useState(false)

  function toggleModal() {
    toggle(!modalVisible)
  }
  
  useEffect(() => {
    fetchComments(props.talkId, dispatch)
  }, [])
  console.log('state from talkcomments: ', state)
  const comments = [...state.comments].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).reverse()
  console.log('comments length ', comments.length)
  console.log('loading: ', state.loading)
  return (
    <div>
      <div {...styles.header}>
        <h1 {...styles.heading}>{props.talkName}</h1>
        <div {...styles.commentButton}>
          <p onClick={toggleModal} {...styles.commentButtonText}>New Comment</p>
        </div>
      </div>
      {
        state.loading && <h2>Loading...</h2>
      }
      {
        state.loaded && (comments.length < 1) && <p {...styles.noComments}>No Comments.</p>
      }
      {
        comments.map((c, i) => (
          <div key={i} {...styles.comment}>
            <ReactMarkdown source={c.text} />
            <p {...styles.createdBy}>{c.createdBy}</p>
          </div>
        ))
      }
      {
        modalVisible && (
          <CommentModal
            toggleModal={toggleModal}
            createComment={(comment) => createComment(props.talkId, comment, dispatch, toggleModal)}
          />
        )
      }
    </div>
  )
}

const styles = {
  header: css({
    borderBottom: '1px solid rgba(0, 0, 0, .15)',
    display: 'flex',
    backgroundColor: 'rgba(0, 0, 0, .05)'
  }),
  heading: css({
    padding: '10px 30px',
  }),
  comment: css({
    border: '1px solid rgba(0, 0, 0, .1)',
    padding: "10px 20px",
    margin: 10,
    borderRadius: 10,
    '& p': {
      margin: '5px 0px',
    },
    '& h1': {
      margin: '5px 0px',
    },
    '& pre': {
      margin: '5px 0px',
      backgroundColor: 'rgba(0, 0, 0, .07)',
      padding: 10
    },
    '& img': {
      margin: '5px 0px',
    },
    '& blockquote': {
      borderLeft: '8px solid black',
      marginLeft: 0,
      padding: '8px 0px 8px 14px',
    }
  }),
  commentButton: css({
    display: 'flex',
    flex: 1,
    height: 78,
    justifyContent: 'flex-end',
    marginRight: 20,
    marginTop: 10,
  }),
  commentButtonText: css({
    padding: '12px 40px',
    width: 190,
    backgroundColor: 'rgba(3, 177, 245, .85)',
    borderRadius: 7,
    color: 'white',
    cursor: 'pointer',
    ':hover': {
      backgroundColor: 'rgb(3, 177, 245)'
    }
  }),
  commentText: css({
    fontSize: 20,
    margin: '0px 0px 5px'
  }),
  createdBy: css({
    fontSize: 15,
    color: 'rgba(0, 0, 0, .4)',
    margin: '0px 0px 5px'
  }),
  noComments: css({
    padding: '0px 20px',
    fontSize: 26
  })
}

export default TalkComments