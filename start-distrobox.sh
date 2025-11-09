#!/bin/bash
set -e

# Towncrier startup script using distrobox
# Creates a Node 20 container and runs both backend and frontend

CONTAINER_NAME="towncrier-dev"
IMAGE="docker.io/library/node:20"
WORKSPACE_PATH="${1:-.}"

echo "🚀 Starting Towncrier with distrobox..."

# Check if distrobox is available
if ! command -v distrobox &> /dev/null; then
  echo "❌ distrobox not found. Please install it first:"
  echo "   https://github.com/89luca89/distrobox"
  exit 1
fi

# Create container if it doesn't exist
if ! sudo distrobox list | grep -q "$CONTAINER_NAME"; then
  echo "📦 Creating distrobox container: $CONTAINER_NAME"
  sudo distrobox-create -n "$CONTAINER_NAME" -i "$IMAGE"
fi

echo "✅ Container ready. Launching services..."

# Run both backend and frontend in the background (tmux or simple background jobs)
# Option 1: Simple approach - run in separate terminals (requires multiple shell windows)
echo "
To start services, run these commands in separate terminal windows:

Backend:
  sudo distrobox-enter $CONTAINER_NAME -- bash -lc 'cd $WORKSPACE_PATH/server && npm install && npm run dev'

Frontend:
  sudo distrobox-enter $CONTAINER_NAME -- bash -lc 'cd $WORKSPACE_PATH/frontend && npm install expo react react-native && npm start'

Or use tmux/screen to run both in one session.
"

# Option 2: If tmux is available, use it
if command -v tmux &> /dev/null; then
  SESSION="towncrier"
  
  # Create a new tmux session
  if ! tmux has-session -t "$SESSION" 2>/dev/null; then
    echo "📌 Creating tmux session '$SESSION'..."
    tmux new-session -d -s "$SESSION"
    
    # Server window
    tmux new-window -t "$SESSION:0" -n "server"
    tmux send-keys -t "$SESSION:server" "sudo distrobox-enter $CONTAINER_NAME -- bash -lc 'cd $WORKSPACE_PATH/server && npm install && npm run dev'" Enter
    
    # Frontend window
    tmux new-window -t "$SESSION:1" -n "frontend"
    tmux send-keys -t "$SESSION:frontend" "sudo distrobox-enter $CONTAINER_NAME -- bash -lc 'cd $WORKSPACE_PATH/frontend && npm install expo react react-native && npm start'" Enter
    
    echo "✅ Services launched in tmux session '$SESSION'"
    echo ""
    echo "Attach to session:"
    echo "  tmux attach-session -t $SESSION"
    echo ""
    echo "Switch windows:"
    echo "  Ctrl-B n (next)"
    echo "  Ctrl-B p (previous)"
  else
    echo "⚠️  Session '$SESSION' already exists. Attach with: tmux attach-session -t $SESSION"
  fi
else
  echo "⚠️  tmux not found. Please run the commands above in separate terminals."
fi
