#!/bin/bash

# Function to clean up JAW4C services
cleanup_services() {
    echo "Cleaning JAW4C services..."
    
    # Stop and remove mitmproxy containers
    echo "Stopping mitmproxy containers..."
    docker ps --format "table {{.ID}}\t{{.Image}}" | grep mitmproxy | awk '{print $1}' | xargs -r docker stop
    docker ps -a --format "table {{.ID}}\t{{.Image}}" | grep mitmproxy | awk '{print $1}' | xargs -r docker rm
    
    # Stop docker compose in vuln_db directory
    echo "Stopping vuln_db services..."
    (cd "./vuln_db_llm/" && docker compose down)
    
    # Kill JAW4C-related tmux sessions
    echo "Killing JAW4C tmux sessions..."
    # Kill sessions running in JAW4C directories
    tmux list-sessions -F "#{session_id} #{session_path}" 2>/dev/null | while read session_id session_path; do
        if [[ "$session_path" == *"JAW4C"* ]] || [[ "$session_path" == *"vuln_db"* ]] || [[ "$session_path" == *"WebArchive"* ]]; then
            echo "Killing session $session_id (path: $session_path)"
            tmux kill-session -t "$session_id" 2>/dev/null || true
        fi
    done
    
    # Also kill any remaining sessions that might be running docker compose or mitmproxy
    tmux list-sessions -F "#{session_id}" 2>/dev/null | while read session_id; do
        # Check if session is running JAW4C-related commands
        session_info=$(tmux list-panes -t "$session_id" -F "#{pane_current_command}" 2>/dev/null | head -1)
        if [[ "$session_info" == *"docker"* ]] && tmux capture-pane -t "$session_id" -p 2>/dev/null | grep -q -E "(mitmproxy|vuln_db|compose)"; then
            echo "Killing docker-related session $session_id"
            tmux kill-session -t "$session_id" 2>/dev/null || true
        fi
    done

    # Cleaning up neo4j containers
    docker ps -a | grep 'arm64v8/neo4j:4.4' | cut -f 1 -d ' ' | while read id; do docker stop $id && docker rm $id; done;

    echo "Cleanup complete!"    
}

env_setup(){
    export PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
    export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

    echo "Environment variables set:"
    echo "PUPPETEER_EXECUTABLE_PATH=$PUPPETEER_EXECUTABLE_PATH"
    echo "PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=$PUPPETEER_SKIP_CHROMIUM_DOWNLOAD"

    source "$(realpath ./JAW4C-JAW/cve_jaw/bin/activate)"
}

# Parse command line arguments when sourced
case "$1" in
    -h|--help)
        echo "Usage: source env.sh [-d] [-h]"
        echo "  -e: Simply setup environment variables"
        echo "  -d: Clean up JAW4C services"
        echo "  -h: Show this help message"
        return 0
        ;;
    -e|--env)
        env_setup
        return 0
        ;;
    -d|--cleanup)
        cleanup_services
        shift
        ;;
    "")
        # No arguments - proceed with normal setup
        ;;
    *)
        echo "Invalid option: $1" >&2
        echo "Use 'source env.sh -h' for help"
        return 1
        ;;
esac

# Set environment variables for Puppeteer
env_setup

echo "Starting JAW4C services..."

# Create tmux session for vuln_db
echo "Creating tmux session for vuln_db..."
VULN_DB_SESSION=$(tmux new-session -d -c "./vuln_db_vulnerable/" "docker compose up --build" \; display-message -p "#{session_id}")
echo "Vuln DB session ID: $VULN_DB_SESSION"

# Create tmux session for WebArchive
echo "Creating tmux session for WebArchive..."
WEBARCHIVE_SESSION=$(tmux new-session -d -c "./JAW4C-WebArchive" \; display-message -p "#{session_id}")
echo "WebArchive session ID: $WEBARCHIVE_SESSION"

# Start the docker container in the WebArchive session
echo "Starting mitmproxy container..."
ARCHIVE_DIR="archive-70"
tmux send-keys -t $WEBARCHIVE_SESSION "docker build -t mitmproxy . && docker run --name mitmproxy_container --rm -d -i -t -p 8001:8001 -p 8002:8002 -p 8314:8314 -p 8315:8315 -p 8316:8316  --entrypoint=bash -v \"\$(pwd)/archive/$ARCHIVE_DIR:/proxy/$ARCHIVE_DIR\" mitmproxy" Enter

# Wait a moment for container to start
sleep 7

# Get the container ID
echo "Getting container ID..."
CONTAINER_ID=$(docker ps --format "table {{.ID}}\t{{.Image}}" | grep mitmproxy | awk '{print $1}')
echo "Container ID: $CONTAINER_ID"

# Execute the mitmdump command inside the container
if [ ! -z "$CONTAINER_ID" ]; then
    echo "Starting mitmdump in container..."
    docker exec -d $CONTAINER_ID bash -c "
    mkdir -p proxy_logs
    echo 'Launching proxy instance 8002'
    mitmdump \
    --listen-host=0.0.0.0 \
    --listen-port=8002 \
    --set confdir=./conf \
    --set flow-detail=0 \
    --set anticache=true \
    --set anticomp=true \
    -s './scripts/proxy.py' \
    --set useCache=true \
    --set onlyUseCache=false \
    --set useBabel=true \
    --set jalangiArgs='--inlineIID --inlineSource --analysis /proxy/analysis/primitive-symbolic-execution.js' \
    --set warcPath="/proxy/$ARCHIVE_DIR" \
    --set replayNearest=true \
    --set replay=true \
    --set archive=false \
    --set append=false \
    > 'proxy_logs/out' 2> 'proxy_logs/err'
    "
    echo "Mitmdump started in container $CONTAINER_ID"
else
    echo "Error: Could not find mitmproxy container"
fi

cd JAW4C-JAW

echo ""
echo "Setup complete!"
echo "Vuln DB session: $VULN_DB_SESSION"
echo "WebArchive session: $WEBARCHIVE_SESSION"
echo "Container ID: $CONTAINER_ID"
echo ""
echo "Use 'tmux attach -t <session_id>' to attach to a session"
echo "Use 'tmux list-sessions' to see all sessions"
