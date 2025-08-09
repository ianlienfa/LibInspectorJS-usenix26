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

for i in {8001..8003}; do 
    echo "Launching proxy instance $i"
    mitmdump \
        --listen-host=0.0.0.0 \
        --listen-port=$i \
        --set confdir=./conf \
        --set flow-detail=0 \
        --set anticache=true \
        --set anticomp=true \
        -s "./scripts/proxy.py" \
        --set useCache=true \
        --set onlyUseCache=false \
        --set useBabel=true \
        --set jalangiArgs="--inlineIID --inlineSource --analysis /proxy/analysis/primitive-symbolic-execution.js" \
        --set warcPath=$PERSIST/$PROXY_ARCHIVE \
        --set replayNearest=true \
        "${@:2}" > "$log_path"_out_$i 2> "$log_path"_err_$i &
done

# Fuzzer without instrumentation
mitmdump \
    --listen-host=0.0.0.0 \
    --listen-port=8314 \
    --set confdir=./conf \
    --set flow-detail=0 \
    --set anticache=true \
    --set anticomp=true \
    -s "./scripts/proxy.py" \
    --set useCache=true \
    --set useBabel=true \
    --set jalangiArgs="--inlineIID --inlineSource --analysis /proxy/analysis/primitive-symbolic-execution.js" \
    --set warcPath=$PERSIST/$PROXY_ARCHIVE \
    --set replayNearest=true \
    "${@:2}" \
    --set instrument=false > "$log_path"_out_8314 2> "$log_path"_err_8314 &

# Soak
mitmdump \
    --listen-host=0.0.0.0 \
    --listen-port=8315 \
    --set confdir=./conf \
    --set flow-detail=0 \
    --set anticache=true \
    --set anticomp=true \
    -s "./scripts/proxy.py" \
    --set useCache=true \
    --set useBabel=true \
    --set jalangiArgs="--inlineIID --inlineSource --analysis /proxy/analysis/primitive-symbolic-execution.js" \
    --set warcPath=$PERSIST/$PROXY_ARCHIVE \
    --set replayNearest=true \
    "${@:2}" \
    --set instrument=false > "$log_path"_out_8315 2> "$log_path"_err_8315 &

# Soak dummy
mitmdump \
    --listen-host=0.0.0.0 \
    --listen-port=8316 \
    --set confdir=./conf \
    --set flow-detail=0 \
    --set anticache=true \
    --set anticomp=true \
    -s "./scripts/proxy.py" \
    --set useCache=true \
    --set useBabel=true \
    --set jalangiArgs="--inlineIID --inlineSource --analysis /proxy/analysis/primitive-symbolic-execution.js" \
    --set warcPath=$PERSIST/$PROXY_ARCHIVE \
    --set replayNearest=true \
    "${@:2}" \
    --set instrument=false > "$log_path"_out_8316 2> "$log_path"_err_8316

echo "Done";