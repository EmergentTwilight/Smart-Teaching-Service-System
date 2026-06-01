# C4/C5 API 手动验收脚本（需 docker compose up -d，建议先 db:seed:c4c5）
# 用法：powershell -ExecutionPolicy Bypass -File scripts\verify-c4-c5.ps1
param(
  [string]$BaseUrl = 'http://localhost:3000/api/v1',
  [string]$MyOfferingId = '',
  [string]$OtherOfferingId = '',
  [string]$AcademicUser = '',
  [string]$AcademicPass = '',
  [switch]$SeedData
)

$idsPath = Join-Path $PSScriptRoot '.c4c5-verify-ids.json'
if ($SeedData) {
  Write-Host 'Seeding C4/C5 verify data in server container...' -ForegroundColor Cyan
  docker compose -f (Join-Path $PSScriptRoot '..\docker-compose.yml') exec -T server `
    sh -c 'cd /app/backend && pnpm db:seed:c4c5'
  if ($LASTEXITCODE -ne 0) { exit 1 }
}
if ((Test-Path $idsPath) -and -not $MyOfferingId) {
  $ids = Get-Content $idsPath -Raw | ConvertFrom-Json
  if (-not $MyOfferingId) { $MyOfferingId = $ids.myOfferingId }
  if (-not $OtherOfferingId) { $OtherOfferingId = $ids.otherOfferingId }
  if (-not $AcademicUser) { $AcademicUser = $ids.academicUser }
  if (-not $AcademicPass) { $AcademicPass = $ids.academicPass }
}

$ErrorActionPreference = 'Continue'
$results = @()

function Add-Result([string]$name, [bool]$ok, [string]$detail) {
  $script:results += [pscustomobject]@{ Test = $name; Pass = $ok; Detail = $detail }
}

function Get-Token([string]$user, [string]$pass) {
  $body = @{ username = $user; password = $pass } | ConvertTo-Json
  $res = Invoke-RestMethod -Uri ($BaseUrl + '/auth/login') -Method Post -Body $body -ContentType 'application/json'
  if ($res.data.access_token) { return $res.data.access_token }
  if ($res.data.accessToken) { return $res.data.accessToken }
  throw ('login failed: ' + $user)
}

Write-Host '=== C4/C5 API verify ===' -ForegroundColor Cyan

try {
  $probe = @{ username = 'student'; password = 'student123' } | ConvertTo-Json
  Invoke-RestMethod -Uri ($BaseUrl + '/auth/login') -Method Post -Body $probe -ContentType 'application/json' -TimeoutSec 5 | Out-Null
  Add-Result 'server up' $true $BaseUrl
} catch {
  Add-Result 'server up' $false ('cannot reach ' + $BaseUrl + ' - run docker compose up -d first')
  $results | Format-Table -AutoSize
  exit 1
}

$studentToken = Get-Token 'student' 'student123'
$hStudent = @{ Authorization = ('Bearer ' + $studentToken) }

try {
  $uri = $BaseUrl + '/course-selection/enrollments/me?page=1&page_size=20'
  $r = Invoke-RestMethod -Uri $uri -Headers $hStudent
  Add-Result 'GET enrollments/me' ($null -ne $r.data.items) ('count=' + $r.data.items.Count)
} catch {
  Add-Result 'GET enrollments/me' $false $_.Exception.Message
}

try {
  $r = Invoke-RestMethod -Uri ($BaseUrl + '/course-selection/timetable/me') -Headers $hStudent
  $okTt = ($null -ne $r.data.items) -and ($null -ne $r.data.semester)
  Add-Result 'GET timetable/me' $okTt ('items=' + $r.data.items.Count + '; semester=' + $r.data.semester.name)
} catch {
  Add-Result 'GET timetable/me' $false $_.Exception.Message
}

if ($MyOfferingId) {
  $teacherToken = Get-Token 'teacher' 'teacher123'
  $hTeacher = @{ Authorization = ('Bearer ' + $teacherToken) }
  try {
    $uri = $BaseUrl + '/course-selection/teacher/offerings/' + $MyOfferingId + '/roster?page=1&page_size=50'
    $r = Invoke-RestMethod -Uri $uri -Headers $hTeacher
    Add-Result 'GET roster own' $true ('students=' + $r.data.students.Count)
  } catch {
    Add-Result 'GET roster own' $false $_.Exception.Message
  }
  if ($OtherOfferingId) {
    try {
      $uri = $BaseUrl + '/course-selection/teacher/offerings/' + $OtherOfferingId + '/roster'
      Invoke-RestMethod -Uri $uri -Headers $hTeacher | Out-Null
      Add-Result 'GET roster other 403' $false 'unexpected success'
    } catch {
      $code = $_.Exception.Response.StatusCode.value__
      Add-Result 'GET roster other 403' ($code -eq 403) ('HTTP ' + $code)
    }
  }
  try {
    $out = Join-Path $env:TEMP 'stss-roster-test.xlsx'
    $uri = $BaseUrl + '/course-selection/teacher/offerings/' + $MyOfferingId + '/roster/export?format=xlsx'
    Invoke-WebRequest -Uri $uri -Headers $hTeacher -OutFile $out
    Add-Result 'GET roster export' (Test-Path $out) $out
  } catch {
    Add-Result 'GET roster export' $false $_.Exception.Message
  }
} else {
  Add-Result 'GET roster skip' $true 'pass -MyOfferingId to test teacher APIs'
}

if ($AcademicUser -and $AcademicPass) {
  $t = Get-Token $AcademicUser $AcademicPass
  $hA = @{ Authorization = ('Bearer ' + $t) }
  try {
    $r = Invoke-RestMethod -Uri ($BaseUrl + '/course-selection/admin/periods') -Headers $hA
    Add-Result 'GET admin/periods' $true ('items=' + $r.data.items.Count)
  } catch {
    Add-Result 'GET admin/periods' $false $_.Exception.Message
  }
  try {
    Invoke-RestMethod -Uri ($BaseUrl + '/course-selection/admin/periods') -Headers $hStudent | Out-Null
    Add-Result 'student admin 403' $false 'unexpected success'
  } catch {
    $code = $_.Exception.Response.StatusCode.value__
    Add-Result 'student admin 403' ($code -eq 403) ('HTTP ' + $code)
  }

  if ($OtherOfferingId) {
    $studentLogin = Invoke-RestMethod -Uri ($BaseUrl + '/auth/login') -Method Post -Body (@{ username = 'student'; password = 'student123' } | ConvertTo-Json) -ContentType 'application/json'
    $studentUserId = $studentLogin.data.user.id
    if (-not $studentUserId) {
      $studentUserId = $studentLogin.data.userId
    }
    $manualBody = @{
      student_id         = $studentUserId
      course_offering_id = $OtherOfferingId
      reason             = 'C4C5 verify manual enroll'
      notify_student     = $false
    } | ConvertTo-Json
    try {
      $mr = Invoke-RestMethod -Uri ($BaseUrl + '/course-selection/admin/enrollments') -Method Post -Headers $hA -Body $manualBody -ContentType 'application/json'
      $enrollOk = $null -ne $mr.data.enrollment
      Add-Result 'POST admin/enrollments' $enrollOk 'manual enroll OK'
    }
    catch {
      $code = $_.Exception.Response.StatusCode.value__
      $dupOrRule = ($code -eq 409) -or ($code -eq 422)
      if ($dupOrRule) {
        Add-Result 'POST admin/enrollments' $true "HTTP $code duplicate or business rule"
      }
      else {
        Add-Result 'POST admin/enrollments' $false $_.Exception.Message
      }
    }
    try {
      $bad = @{ course_offering_id = $OtherOfferingId } | ConvertTo-Json
      Invoke-RestMethod -Uri ($BaseUrl + '/course-selection/admin/enrollments') -Method Post -Headers $hA -Body $bad -ContentType 'application/json' | Out-Null
      Add-Result 'manual enroll no reason' $false 'unexpected success'
    }
    catch {
      $code = $_.Exception.Response.StatusCode.value__
      $noReasonOk = ($code -eq 400)
      Add-Result 'manual enroll no reason' $noReasonOk "HTTP $code"
    }
  }
}
else {
  Add-Result 'academic skip' $true 'need ACADEMIC admin account (-AcademicUser -AcademicPass)'
}

$results | Format-Table -AutoSize
if (($results | Where-Object { -not $_.Pass }).Count -gt 0) { exit 1 }
