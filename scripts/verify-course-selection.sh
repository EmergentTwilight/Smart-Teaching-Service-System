#!/usr/bin/env bash
set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE_URL="${BASE_URL:-http://localhost:3000/api/v1}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:5173}"

RUN_SEED=1
START_SERVICES=1

while [ "$#" -gt 0 ]; do
  case "$1" in
    --no-seed)
      RUN_SEED=0
      ;;
    --no-start)
      START_SERVICES=0
      ;;
    --base-url)
      shift
      BASE_URL="${1:-$BASE_URL}"
      ;;
    --frontend-url)
      shift
      FRONTEND_URL="${1:-$FRONTEND_URL}"
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 2
      ;;
  esac
  shift
done

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

HTTP_BODY_FILE="$TMP_DIR/response.json"
HTTP_STATUS=""
PASS_COUNT=0
FAIL_COUNT=0

C1_SEMESTER_ID="10000000-0000-4000-8000-000000000002"
C1_PERIOD_ID="10000000-0000-4000-8000-000000000003"
C1_OFFERING_PERIOD_CLOSED="10000000-0000-4000-8000-000000000011"
C1_OFFERING_FULL="10000000-0000-4000-8000-000000000013"
C1_OFFERING_SUCCESS="10000000-0000-4000-8000-000000000014"
C1_OFFERING_PREREQ="10000000-0000-4000-8000-000000000017"
C1_OFFERING_CONFLICT="10000000-0000-4000-8000-000000000019"
C1_OTHER_STUDENT_ENROLLMENT="10000000-0000-4000-8000-000000000021"

pass() {
  PASS_COUNT=$((PASS_COUNT + 1))
  printf 'PASS %-46s %s\n' "$1" "${2:-}"
}

fail() {
  FAIL_COUNT=$((FAIL_COUNT + 1))
  printf 'FAIL %-46s %s\n' "$1" "${2:-}" >&2
}

need_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 2
  fi
}

json_eval() {
  local expr="$1"
  python3 -c '
import json
import sys

expr = sys.argv[1]
try:
    data = json.load(sys.stdin)
    value = eval(expr, {"__builtins__": {}}, {"data": data, "len": len, "any": any, "all": all})
except Exception:
    sys.exit(1)

if isinstance(value, bool):
    print("true" if value else "false")
elif value is None:
    print("")
elif isinstance(value, (dict, list)):
    print(json.dumps(value, ensure_ascii=False))
else:
    print(value)
' "$expr"
}

body_preview() {
  python3 - "$HTTP_BODY_FILE" <<'PY'
import json
import sys
from pathlib import Path

path = Path(sys.argv[1])
text = path.read_text(encoding="utf-8", errors="replace")
try:
    data = json.loads(text)
    message = data.get("message")
    errors = data.get("errors")
    code = data.get("code")
    print(f"HTTP body code={code} message={message!r} errors={errors!r}"[:320])
except Exception:
    print(text[:320])
PY
}

http_json() {
  local method="$1"
  local path="$2"
  local token="${3:-}"
  local body="${4:-}"
  local url="${BASE_URL}${path}"
  local args=(-sS -o "$HTTP_BODY_FILE" -w "%{http_code}" -X "$method")

  if [ -n "$token" ]; then
    args+=(-H "Authorization: Bearer $token")
  fi
  if [ -n "$body" ]; then
    args+=(-H "Content-Type: application/json" -d "$body")
  fi

  HTTP_STATUS="$(curl "${args[@]}" "$url" 2>"$TMP_DIR/curl.err")"
  local curl_code=$?
  if [ "$curl_code" -ne 0 ]; then
    HTTP_STATUS="curl-error"
    cat "$TMP_DIR/curl.err" > "$HTTP_BODY_FILE"
    return 1
  fi
  return 0
}

expect_status() {
  local name="$1"
  local expected="$2"
  if [ "$HTTP_STATUS" = "$expected" ]; then
    pass "$name" "HTTP $HTTP_STATUS"
    return 0
  fi

  fail "$name" "expected HTTP $expected, got $HTTP_STATUS; $(body_preview)"
  return 1
}

expect_json_true() {
  local name="$1"
  local expr="$2"
  local result
  result="$(json_eval "$expr" < "$HTTP_BODY_FILE" 2>/dev/null || true)"
  if [ "$result" = "true" ]; then
    pass "$name"
    return 0
  fi

  fail "$name" "JSON assertion failed: $expr; $(body_preview)"
  return 1
}

json_value() {
  json_eval "$1" < "$HTTP_BODY_FILE"
}

api_expect() {
  local name="$1"
  local expected="$2"
  local method="$3"
  local path="$4"
  local token="${5:-}"
  local body="${6:-}"

  http_json "$method" "$path" "$token" "$body" >/dev/null
  expect_status "$name" "$expected"
}

login_user() {
  local var_name="$1"
  local user_id_var="$2"
  local username="$3"
  local password="$4"
  local body
  body="$(printf '{"username":"%s","password":"%s"}' "$username" "$password")"
  http_json POST "/auth/login" "" "$body" >/dev/null
  if ! expect_status "login $username" 200; then
    return 1
  fi

  local token user_id
  token="$(json_value 'data["data"].get("access_token") or data["data"].get("accessToken")')"
  user_id="$(json_value 'data["data"].get("user", {}).get("id") or data["data"].get("user_id") or data["data"].get("userId")')"
  if [ -z "$token" ]; then
    fail "login $username token" "missing access token"
    return 1
  fi
  if [ -z "$user_id" ]; then
    fail "login $username user id" "missing user id"
    return 1
  fi

  printf -v "$var_name" '%s' "$token"
  printf -v "$user_id_var" '%s' "$user_id"
  return 0
}

download_expect() {
  local name="$1"
  local expected="$2"
  local path="$3"
  local token="$4"
  local outfile="$5"
  local url="${BASE_URL}${path}"

  HTTP_STATUS="$(curl -sS -o "$outfile" -w "%{http_code}" -H "Authorization: Bearer $token" "$url" 2>"$TMP_DIR/curl.err")"
  if [ "$HTTP_STATUS" = "$expected" ] && [ -s "$outfile" ]; then
    pass "$name" "HTTP $HTTP_STATUS bytes=$(wc -c < "$outfile")"
    return 0
  fi

  fail "$name" "expected HTTP $expected with non-empty file, got $HTTP_STATUS"
  return 1
}

frontend_route_expect() {
  local name="$1"
  local path="$2"
  local outfile="$TMP_DIR/frontend.html"
  local status

  status="$(curl -sS -o "$outfile" -w "%{http_code}" "${FRONTEND_URL}${path}" 2>"$TMP_DIR/curl.err")"
  if [ "$status" = "200" ] && grep -q '<div id="root">' "$outfile"; then
    pass "$name" "HTTP $status"
    return 0
  fi

  fail "$name" "expected Vite SPA HTML, got HTTP $status"
  return 1
}

need_cmd curl
need_cmd python3
need_cmd docker

cd "$ROOT_DIR" || exit 2

echo "=== C group course-selection integration verify ==="
echo "base_url: $BASE_URL"
echo "frontend_url: $FRONTEND_URL"

if [ "$START_SERVICES" -eq 1 ]; then
  echo "Starting Docker services..."
  if docker compose up -d >/dev/null; then
    pass "docker compose up" "services requested"
  else
    fail "docker compose up" "failed to start services"
  fi
fi

if [ "$RUN_SEED" -eq 1 ]; then
  echo "Seeding integration data..."
  if ./scripts/codex-docker-run.sh 'pnpm --filter @stss/server db:seed && pnpm --filter @stss/server db:seed:c1c2 && pnpm --filter @stss/server db:seed:c4c5'; then
    pass "seed course-selection data" "db:seed + db:seed:c1c2 + db:seed:c4c5"
  else
    fail "seed course-selection data" "Docker wrapper seed command failed"
  fi
fi

STUDENT_TOKEN=""
STUDENT_ID=""
STUDENT2_TOKEN=""
STUDENT2_ID=""
TEACHER_TOKEN=""
TEACHER_ID=""
ACADEMIC_TOKEN=""
ACADEMIC_ID=""

login_user STUDENT_TOKEN STUDENT_ID student student123
login_user STUDENT2_TOKEN STUDENT2_ID student2 student123
login_user TEACHER_TOKEN TEACHER_ID teacher teacher123
login_user ACADEMIC_TOKEN ACADEMIC_ID academic Admin123

echo
echo "--- Frontend route smoke ---"
frontend_route_expect "student curriculum route" "/selection/curriculum"
frontend_route_expect "student courses route" "/selection/courses"
frontend_route_expect "student timetable route" "/selection/timetable"
frontend_route_expect "teacher roster route" "/selection/teacher/roster"
frontend_route_expect "admin periods route" "/selection/admin/periods"
frontend_route_expect "admin manual enrollment route" "/selection/admin/manual-enrollment"
frontend_route_expect "AI advisor route" "/selection/ai"

echo
echo "--- C1/C2 read flows ---"
api_expect "curriculum/me" 200 GET "/course-selection/curriculum/me?include_courses=true&page_size=20" "$STUDENT_TOKEN"
expect_json_true "curriculum has groups" 'len(data["data"].get("course_groups", [])) >= 1'

api_expect "curriculum progress" 200 GET "/course-selection/curriculum/me/progress?semester_id=${C1_SEMESTER_ID}" "$STUDENT_TOKEN"
expect_json_true "progress has selected summary" '"selected" in data["data"] and "remaining" in data["data"]'

api_expect "course search paginated" 200 GET "/course-selection/courses?page=1&page_size=10&keyword=course" "$STUDENT_TOKEN"
expect_json_true "course search returns rows" 'data["data"]["pagination"]["total"] >= 1 and len(data["data"]["items"]) >= 1'

api_expect "offering list paginated" 200 GET "/course-selection/offerings?page=1&page_size=10&semester_id=${C1_SEMESTER_ID}" "$STUDENT_TOKEN"
expect_json_true "offering list returns rows" 'data["data"]["pagination"]["total"] >= 1 and len(data["data"]["items"]) >= 1'

api_expect "available offerings with reasons" 200 GET "/course-selection/offerings/available?semester_id=${C1_SEMESTER_ID}&include_unavailable=true&page=1&page_size=20" "$STUDENT_TOKEN"
expect_json_true "available offerings include edge cases" 'any(not item["eligibility"]["is_available"] for item in data["data"]["items"])'

api_expect "offering detail" 200 GET "/course-selection/offerings/${C1_OFFERING_SUCCESS}?include_eligibility=true" "$STUDENT_TOKEN"
expect_json_true "offering detail has eligibility" '"eligibility" in data["data"] and "remaining_capacity" in data["data"]'
BEFORE_SUCCESS_COUNT="$(json_value 'data["data"]["enrolled_count"]')"

echo
echo "--- C3 enrollment transaction boundaries ---"
api_expect "period closed rejection" 422 POST "/course-selection/enrollments" "$STUDENT_TOKEN" "{\"course_offering_id\":\"${C1_OFFERING_PERIOD_CLOSED}\"}"
api_expect "capacity full rejection" 422 POST "/course-selection/enrollments" "$STUDENT_TOKEN" "{\"course_offering_id\":\"${C1_OFFERING_FULL}\"}"
api_expect "prerequisite rejection" 422 POST "/course-selection/enrollments" "$STUDENT_TOKEN" "{\"course_offering_id\":\"${C1_OFFERING_PREREQ}\"}"
api_expect "schedule conflict rejection" 422 POST "/course-selection/enrollments" "$STUDENT_TOKEN" "{\"course_offering_id\":\"${C1_OFFERING_CONFLICT}\"}"
api_expect "drop other student's enrollment forbidden" 403 PATCH "/course-selection/enrollments/${C1_OTHER_STUDENT_ENROLLMENT}/drop" "$STUDENT_TOKEN" '{"client_request_id":"verify-drop-other"}'

api_expect "enrollment success" 201 POST "/course-selection/enrollments" "$STUDENT_TOKEN" "{\"course_offering_id\":\"${C1_OFFERING_SUCCESS}\",\"client_request_id\":\"verify-create-success\"}"
SUCCESS_ENROLLMENT_ID="$(json_value 'data["data"]["enrollment"]["id"]')"
AFTER_SUCCESS_COUNT="$(json_value 'data["data"]["course_offering"]["enrolled_count"]')"
if [ "$AFTER_SUCCESS_COUNT" = "$((BEFORE_SUCCESS_COUNT + 1))" ]; then
  pass "enrolled_count incremented" "${BEFORE_SUCCESS_COUNT} -> ${AFTER_SUCCESS_COUNT}"
else
  fail "enrolled_count incremented" "${BEFORE_SUCCESS_COUNT} -> ${AFTER_SUCCESS_COUNT}"
fi

api_expect "duplicate enrollment rejection" 409 POST "/course-selection/enrollments" "$STUDENT_TOKEN" "{\"course_offering_id\":\"${C1_OFFERING_SUCCESS}\"}"
api_expect "drop own enrollment success" 200 PATCH "/course-selection/enrollments/${SUCCESS_ENROLLMENT_ID}/drop" "$STUDENT_TOKEN" '{"client_request_id":"verify-drop-success"}'
expect_json_true "drop response status dropped" 'data["data"]["enrollment"]["status"] == "dropped"'
DROP_COUNT="$(json_value 'data["data"]["course_offering"]["enrolled_count"]')"
if [ "$DROP_COUNT" = "$BEFORE_SUCCESS_COUNT" ]; then
  pass "enrolled_count decremented" "${AFTER_SUCCESS_COUNT} -> ${DROP_COUNT}"
else
  fail "enrolled_count decremented" "${AFTER_SUCCESS_COUNT} -> ${DROP_COUNT}"
fi

api_expect "duplicate drop rejection" 422 PATCH "/course-selection/enrollments/${SUCCESS_ENROLLMENT_ID}/drop" "$STUDENT_TOKEN" '{}'
api_expect "lower max credits setup" 200 PATCH "/course-selection/admin/periods/${C1_PERIOD_ID}" "$ACADEMIC_TOKEN" '{"max_credits":7}'
api_expect "max credits rejection" 422 POST "/course-selection/enrollments" "$STUDENT_TOKEN" "{\"course_offering_id\":\"${C1_OFFERING_SUCCESS}\"}"
api_expect "restore max credits setup" 200 PATCH "/course-selection/admin/periods/${C1_PERIOD_ID}" "$ACADEMIC_TOKEN" '{"max_credits":30}'

echo
echo "--- C4 results, timetable, roster ---"
api_expect "my enrollments" 200 GET "/course-selection/enrollments/me?page=1&page_size=20" "$STUDENT_TOKEN"
expect_json_true "my enrollments has summary" '"summary" in data["data"] and "pagination" in data["data"]'

api_expect "my timetable" 200 GET "/course-selection/timetable/me?semester_id=${C1_SEMESTER_ID}" "$STUDENT_TOKEN"
expect_json_true "timetable has scheduled item" 'len(data["data"].get("items", [])) >= 1'

C4C5_IDS_FILE="$ROOT_DIR/scripts/.c4c5-verify-ids.json"
if [ -f "$C4C5_IDS_FILE" ]; then
  MY_OFFERING_ID="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["myOfferingId"])' "$C4C5_IDS_FILE")"
  OTHER_OFFERING_ID="$(python3 -c 'import json,sys; print(json.load(open(sys.argv[1]))["otherOfferingId"])' "$C4C5_IDS_FILE")"
else
  MY_OFFERING_ID="a1000000-0000-4000-8000-000000000010"
  OTHER_OFFERING_ID="a1000000-0000-4000-8000-000000000011"
fi

api_expect "teacher roster own offering" 200 GET "/course-selection/teacher/offerings/${MY_OFFERING_ID}/roster?page=1&page_size=20" "$TEACHER_TOKEN"
expect_json_true "teacher roster has student" 'len(data["data"].get("students", [])) >= 1'

api_expect "teacher roster other offering forbidden" 403 GET "/course-selection/teacher/offerings/${OTHER_OFFERING_ID}/roster" "$TEACHER_TOKEN"
download_expect "teacher roster export" 200 "/course-selection/teacher/offerings/${MY_OFFERING_ID}/roster/export?format=xlsx" "$TEACHER_TOKEN" "$TMP_DIR/roster.xlsx"

echo
echo "--- C5 academic administration ---"
api_expect "academic periods list" 200 GET "/course-selection/admin/periods?page=1&page_size=20" "$ACADEMIC_TOKEN"
expect_json_true "periods list has rows" 'data["data"]["pagination"]["total"] >= 1'

api_expect "student admin access forbidden" 403 GET "/course-selection/admin/periods" "$STUDENT_TOKEN"
api_expect "manual enrollment missing reason" 400 POST "/course-selection/admin/enrollments" "$ACADEMIC_TOKEN" "{\"student_id\":\"${STUDENT_ID}\",\"course_offering_id\":\"${OTHER_OFFERING_ID}\"}"
api_expect "manual enrollment capacity full" 422 POST "/course-selection/admin/enrollments" "$ACADEMIC_TOKEN" "{\"student_id\":\"${STUDENT_ID}\",\"course_offering_id\":\"${C1_OFFERING_FULL}\",\"reason\":\"verify full\"}"
api_expect "manual enrollment schedule conflict" 422 POST "/course-selection/admin/enrollments" "$ACADEMIC_TOKEN" "{\"student_id\":\"${STUDENT_ID}\",\"course_offering_id\":\"${C1_OFFERING_CONFLICT}\",\"reason\":\"verify conflict\"}"
if [ "$RUN_SEED" -eq 1 ]; then
  api_expect "manual enrollment success" 201 POST "/course-selection/admin/enrollments" "$ACADEMIC_TOKEN" "{\"student_id\":\"${STUDENT_ID}\",\"course_offering_id\":\"${OTHER_OFFERING_ID}\",\"reason\":\"verify manual enrollment\",\"notify_student\":false}"
  expect_json_true "manual enrollment audit logged" 'data["data"]["audit"]["logged"] is True and data["data"]["enrollment"]["status"] == "enrolled"'
else
  http_json POST "/course-selection/admin/enrollments" "$ACADEMIC_TOKEN" "{\"student_id\":\"${STUDENT_ID}\",\"course_offering_id\":\"${OTHER_OFFERING_ID}\",\"reason\":\"verify manual enrollment\",\"notify_student\":false}" >/dev/null
  if [ "$HTTP_STATUS" = "201" ]; then
    pass "manual enrollment success" "HTTP $HTTP_STATUS"
    expect_json_true "manual enrollment audit logged" 'data["data"]["audit"]["logged"] is True and data["data"]["enrollment"]["status"] == "enrolled"'
  elif [ "$HTTP_STATUS" = "409" ]; then
    pass "manual enrollment already present" "HTTP $HTTP_STATUS"
  else
    fail "manual enrollment success" "expected HTTP 201 or existing 409, got $HTTP_STATUS; $(body_preview)"
  fi
fi
api_expect "manual enrollment duplicate rejection" 409 POST "/course-selection/admin/enrollments" "$ACADEMIC_TOKEN" "{\"student_id\":\"${STUDENT_ID}\",\"course_offering_id\":\"${OTHER_OFFERING_ID}\",\"reason\":\"verify duplicate\"}"

echo
echo "--- C6 AI advisor safety ---"
api_expect "enrollment count before AI" 200 GET "/course-selection/enrollments/me?status=enrolled&page=1&page_size=100" "$STUDENT_TOKEN"
AI_BEFORE_COUNT="$(json_value 'data["data"]["summary"]["enrolled_count"]')"
api_expect "AI recommend degraded" 501 POST "/course-selection/ai-advisor/recommend" "$STUDENT_TOKEN" "{\"semester_id\":\"${C1_SEMESTER_ID}\",\"max_recommendations\":3}"
api_expect "AI explain degraded" 501 POST "/course-selection/ai-advisor/explain" "$STUDENT_TOKEN" "{\"course_offering_id\":\"${C1_OFFERING_SUCCESS}\",\"question\":\"why\"}"
api_expect "enrollment count after AI" 200 GET "/course-selection/enrollments/me?status=enrolled&page=1&page_size=100" "$STUDENT_TOKEN"
AI_AFTER_COUNT="$(json_value 'data["data"]["summary"]["enrolled_count"]')"
if [ "$AI_BEFORE_COUNT" = "$AI_AFTER_COUNT" ]; then
  pass "AI does not write Enrollment" "count=${AI_AFTER_COUNT}"
else
  fail "AI does not write Enrollment" "before=${AI_BEFORE_COUNT} after=${AI_AFTER_COUNT}"
fi

echo
echo "=== Summary ==="
echo "PASS: $PASS_COUNT"
echo "FAIL: $FAIL_COUNT"

if [ "$FAIL_COUNT" -ne 0 ]; then
  exit 1
fi

exit 0
