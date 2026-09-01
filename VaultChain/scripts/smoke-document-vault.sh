#!/usr/bin/env bash
set -euo pipefail

API="http://localhost:3100/api"
ROOT="/home/ubuntu/vaultchain-work/VaultChain"
EMAIL="module-test-$(date +%s)@example.com"
PASSWORD="test-password-123"
TMP="$(mktemp -d)"
cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

status=$(curl -sS -o "$TMP/unauth.json" -w '%{http_code}' -X POST "$API/documents/upload")
test "$status" = "401"

auth=$(curl -sS -X POST "$API/auth/register" -H 'Content-Type: application/json' -d "{\"fullName\":\"Module Test User\",\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
TOKEN=$(printf '%s' "$auth" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
test -n "$TOKEN"

upload() { curl -sS -X POST "$API/documents/upload" -H "Authorization: Bearer $TOKEN" -F "document=@$1;type=application/pdf" -F "title=$2" -F 'description=smoke test' -F 'category=test'; }
ORIGINAL=$(upload "$ROOT/scripts/original-test.pdf" 'Original Test Document')
MODIFIED=$(upload "$ROOT/scripts/modified-test.pdf" 'Modified Test Document')
ORIGINAL_ID=$(printf '%s' "$ORIGINAL" | sed -n 's/.*"id":\([0-9]*\).*/\1/p' | head -1)
MODIFIED_ID=$(printf '%s' "$MODIFIED" | sed -n 's/.*"id":\([0-9]*\).*/\1/p' | head -1)
test -n "$ORIGINAL_ID"; test -n "$MODIFIED_ID"

curl -sS "$API/documents" -H "Authorization: Bearer $TOKEN" > "$TMP/documents.json"
grep -q "Original Test Document" "$TMP/documents.json"

curl -sS -X POST "$API/documents/$ORIGINAL_ID/ocr" -H "Authorization: Bearer $TOKEN" > "$TMP/original-ocr.json"
grep -q '"success":true' "$TMP/original-ocr.json"
grep -q 'VaultChain document verification test' "$TMP/original-ocr.json"

curl -sS -X POST "$API/documents/$MODIFIED_ID/ocr" -H "Authorization: Bearer $TOKEN" > "$TMP/modified-ocr.json"
grep -q '"success":true' "$TMP/modified-ocr.json"

curl -sS -X POST "$API/documents/$MODIFIED_ID/verify" -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d "{\"referenceDocumentId\":$ORIGINAL_ID}" > "$TMP/verify.json"
grep -Eq '"status":"(Original|Modified)"' "$TMP/verify.json"
grep -q '"similarity":' "$TMP/verify.json"

curl -sS "$API/documents/$MODIFIED_ID/report" -H "Authorization: Bearer $TOKEN" > "$TMP/report.json"
grep -q '"success":true' "$TMP/report.json"

VAULT=$(curl -sS -X POST "$API/vault/upload" -H "Authorization: Bearer $TOKEN" -F "file=@$ROOT/scripts/original-test.pdf;type=application/pdf" -F 'title=Encrypted Test Document' -F 'description=vault smoke test')
VAULT_ID=$(printf '%s' "$VAULT" | sed -n 's/.*"id":\([0-9]*\).*/\1/p' | head -1)
test -n "$VAULT_ID"
! printf '%s' "$VAULT" | grep -q 'encryptedPath'
node "$ROOT/scripts/assert-vault-file.js" "$VAULT_ID"

curl -sS "$API/vault" -H "Authorization: Bearer $TOKEN" > "$TMP/vault-list.json"
grep -q 'Encrypted Test Document' "$TMP/vault-list.json"
curl -sS "$API/vault/$VAULT_ID" -H "Authorization: Bearer $TOKEN" > "$TMP/vault-detail.json"
grep -q 'aes-256-gcm' "$TMP/vault-detail.json"
curl -sS "$API/vault/$VAULT_ID/download" -H "Authorization: Bearer $TOKEN" -o "$TMP/decrypted.pdf"
test "$(head -c 5 "$TMP/decrypted.pdf")" = '%PDF-'

SECOND_EMAIL="module-test-second-$(date +%s)@example.com"
SECOND_AUTH=$(curl -sS -X POST "$API/auth/register" -H 'Content-Type: application/json' -d "{\"fullName\":\"Second Test User\",\"email\":\"$SECOND_EMAIL\",\"password\":\"$PASSWORD\"}")
SECOND_TOKEN=$(printf '%s' "$SECOND_AUTH" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
test -n "$SECOND_TOKEN"
status=$(curl -sS -o "$TMP/cross-document.json" -w '%{http_code}' "$API/documents/$ORIGINAL_ID" -H "Authorization: Bearer $SECOND_TOKEN")
test "$status" = "404"
status=$(curl -sS -o "$TMP/cross-ocr.json" -w '%{http_code}' "$API/documents/$ORIGINAL_ID/ocr" -H "Authorization: Bearer $SECOND_TOKEN")
test "$status" = "404"
status=$(curl -sS -o "$TMP/cross-report.json" -w '%{http_code}' "$API/documents/$ORIGINAL_ID/report" -H "Authorization: Bearer $SECOND_TOKEN")
test "$status" = "404"
status=$(curl -sS -o "$TMP/cross-vault.json" -w '%{http_code}' "$API/vault/$VAULT_ID" -H "Authorization: Bearer $SECOND_TOKEN")
test "$status" = "404"
status=$(curl -sS -o "$TMP/cross-vault-download.json" -w '%{http_code}' "$API/vault/$VAULT_ID/download" -H "Authorization: Bearer $SECOND_TOKEN")
test "$status" = "404"

curl -sS -X DELETE "$API/vault/$VAULT_ID" -H "Authorization: Bearer $TOKEN" > "$TMP/vault-delete.json"
grep -q '"success":true' "$TMP/vault-delete.json"
status=$(curl -sS -o "$TMP/deleted-vault.json" -w '%{http_code}' "$API/vault/$VAULT_ID" -H "Authorization: Bearer $TOKEN")
test "$status" = "404"
node "$ROOT/scripts/assert-vault-file.js" "$VAULT_ID" deleted

printf '%s\n' 'PASS: document upload, OCR, verification report, vault encryption, download, deletion, and ownership isolation'
