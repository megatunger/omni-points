#!/bin/bash

# Check if passphrase is set
if [[ -z "$OMNI_POINTS_PASSWORD" ]]; then
  echo "Error: OMNI_POINTS_PASSWORD environment variable not set."
  exit 1
fi

# Create output directory if it doesn't exist
mkdir -p secrets

# Loop through each .gpg file and decrypt
for file in secrets_encrypted/*.gpg; do
  if [[ -f "$file" ]]; then
    original_name="$(basename "$file" .gpg)"
    gpg --batch --yes \
        --passphrase "$OMNI_POINTS_PASSWORD" \
        --pinentry-mode loopback \
        --decrypt \
        --output "secrets/$original_name" \
        "$file"
    echo "Decrypted: $file"
  fi
done

echo "Decryption complete."
