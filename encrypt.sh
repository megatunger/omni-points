#!/bin/bash

# Check if passphrase is set
if [[ -z "$OMNI_POINTS_PASSWORD" ]]; then
  echo "Error: OMNI_POINTS_PASSWORD environment variable not set."
  exit 1
fi

# Create output directory if it doesn't exist
mkdir -p secrets_encrypted

# Loop through each file and encrypt
for file in secrets/*; do
  if [[ -f "$file" ]]; then
    gpg --batch --yes \
        --passphrase "$OMNI_POINTS_PASSWORD" \
        --pinentry-mode loopback \
        --symmetric --cipher-algo AES256 \
        --output "secrets_encrypted/$(basename "$file").gpg" \
        "$file"
    echo "Encrypted: $file"
  fi
done

echo "Encryption complete."
