#!/bin/bash
set -e

NODE_VERSION="v20.11.1"
ARCH="darwin-arm64"
TARBALL="node-${NODE_VERSION}-${ARCH}.tar.gz"
URL="https://nodejs.org/dist/${NODE_VERSION}/${TARBALL}"

echo "============================================="
echo "📥 Setting up local standalone Node.js..."
echo "============================================="

# Create local node folder
mkdir -p .node

if [ ! -f ".node/bin/node" ]; then
    echo "Downloading Node.js ${NODE_VERSION} from ${URL}..."
    curl -L "$URL" -o "$TARBALL"
    
    echo "Extracting tarball..."
    tar -xzf "$TARBALL" -C .node --strip-components=1
    
    echo "Cleaning up tarball..."
    rm -f "$TARBALL"
    echo "Node.js successfully installed in .node/"
else
    echo "Node.js is already installed locally in .node/."
fi

echo "Verifying local installation..."
.node/bin/node --version
.node/bin/npm --version
