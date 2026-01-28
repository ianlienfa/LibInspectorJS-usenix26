#!/bin/bash

if [ -z "${PROXY_VOLUME_PATH}" ]; then 
    PERSIST='.'
else 
    PERSIST=${PROXY_VOLUME_PATH}
fi

mkdir -p $PERSIST/$PROXY_ARCHIVE
mkdir -p $PERSIST/proxy_logs/
mkdir -p $PERSIST/proxy_logs/$PROXY_ARCHIVE

# Just enough entropy to not have collisions
log_path=$PERSIST/proxy_logs/$PROXY_ARCHIVE/$RANDOM.$RANDOM.$RANDOM

echo "Log path: $log_path";
echo "CLI flags: $@"

echo "Launching proxy instance 8002"
mitmdump \
    --listen-host=0.0.0.0 \
    --listen-port=8002 \
    --set confdir=./conf \
    --set flow-detail=0 \
    --set anticache=true \
    --set anticomp=true \
    -s "./scripts/proxy.py" \
    --set useCache=false \
    --set onlyUseCache=false \
    --set useBabel=false \
    --set jalangiArgs="--inlineIID --inlineSource --analysis /proxy/analysis/primitive-symbolic-execution.js" \
    --set warcPath=$PERSIST/$PROXY_ARCHIVE \
    --set replayNearest=true \
    --set replay=true \
    --set archive=false \
    --set append=false \
    "${@:2}" > "$log_path"_out_$i 2> "$log_path"_err_$i &

echo "Done starting all proxy instances";

# Keep the container running by waiting for all background processes
wait