# Post-deploy smoke (PowerShell) — TC-02 HTTP + TC-04 API
param(
  [string]$Base = "https://suite-pic-heaven-sacrifice.trycloudflare.com"
)

$stamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
$email = "smoke-$stamp@resumepilot.test"
$password = "password123"
$rows = @()

function Add-Row($name, $ok, $detail) {
  $script:rows += [PSCustomObject]@{ Check = $name; OK = $ok; Detail = $detail }
}

Write-Host "== HTTP smoke ($Base) ==" -ForegroundColor Cyan
foreach ($path in @("/", "/admin/", "/swagger-ui.html", "/actuator/health", "/api-docs")) {
  try {
    $r = Invoke-WebRequest "$Base$path" -UseBasicParsing -TimeoutSec 20
    Add-Row "HTTP $path" ($r.StatusCode -eq 200) "HTTP $($r.StatusCode)"
  } catch {
    $code = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { "ERR" }
    Add-Row "HTTP $path" $false "$code"
  }
}

Write-Host "== API smoke ==" -ForegroundColor Cyan
try {
  Invoke-RestMethod "$Base/api/v1/users/me" -Method Get -TimeoutSec 15 | Out-Null
  Add-Row "API GET /users/me (no auth)" $false "expected 401"
} catch {
  $code = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 0 }
  Add-Row "API GET /users/me (no auth)" ($code -eq 401) "HTTP $code"
}

try {
  $body = @{ email = $email; password = $password; name = "Smoke $stamp" } | ConvertTo-Json
  $signup = Invoke-RestMethod "$Base/api/v1/auth/signup" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 20
  $token = $signup.data.accessToken
  Add-Row "API POST /auth/signup" ($signup.success -and $token) "success=$($signup.success)"
} catch {
  Add-Row "API POST /auth/signup" $false $_.Exception.Message
  $token = $null
}

try {
  $body = @{ email = $email; password = $password } | ConvertTo-Json
  $login = Invoke-RestMethod "$Base/api/v1/auth/login" -Method Post -Body $body -ContentType "application/json" -TimeoutSec 20
  if ($login.data.accessToken) { $token = $login.data.accessToken }
  Add-Row "API POST /auth/login" ($login.success -and $login.data.accessToken) "success=$($login.success)"
} catch {
  Add-Row "API POST /auth/login" $false $_.Exception.Message
}

if ($token) {
  $headers = @{ Authorization = "Bearer $token" }
  foreach ($ep in @(
    @{ Name = "API GET /users/me (auth)"; Path = "/api/v1/users/me" },
    @{ Name = "API GET /experiences"; Path = "/api/v1/experiences" },
    @{ Name = "API GET /job-postings"; Path = "/api/v1/job-postings" },
    @{ Name = "API GET /resumes"; Path = "/api/v1/resumes" }
  )) {
    try {
      $res = Invoke-RestMethod "$Base$($ep.Path)" -Method Get -Headers $headers -TimeoutSec 15
      Add-Row $ep.Name $res.success "OK"
    } catch {
      $code = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { "ERR" }
      Add-Row $ep.Name $false "HTTP $code"
    }
  }
}

$rows | Format-Table -AutoSize
$fail = @($rows | Where-Object { -not $_.OK }).Count
Write-Host "--- PASS: $(@($rows | Where-Object { $_.OK }).Count) / $($rows.Count)  FAIL: $fail" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })
if ($fail -gt 0) { exit 1 }
