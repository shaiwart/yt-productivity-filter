#!/bin/bash

ZIP_NAME="yt-productivity-filter.zip"

rm -f "$ZIP_NAME"

zip -r "$ZIP_NAME" . \
    --exclude "*.git*" \
    --exclude "*.sh" \
    --exclude "*.zip"

echo "Created $ZIP_NAME"
