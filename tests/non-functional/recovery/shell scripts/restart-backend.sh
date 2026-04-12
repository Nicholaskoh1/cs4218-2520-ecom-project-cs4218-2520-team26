# Emberlynn Loo, A0255614E

echo "=== RECOVERY TEST: Backend Restart ==="
echo "[$(date +%T)] Triggering server restart via nodemon..."

# Kill process on 6060
lsof -ti:6060 | xargs kill -9 2>/dev/null || true
sleep 1
touch server.js

echo "[$(date +%T)] Nodemon restart triggered."
echo "=== Monitor k6 output to observe recovery ==="