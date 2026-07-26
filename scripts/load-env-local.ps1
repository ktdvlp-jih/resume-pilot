# .env.local → 세션 환경변수.
#   Windows PowerShell / Mac·Linux pwsh:  . ./scripts/load-env-local.ps1
# UTF-8 (Windows 콘솔만)
if ($IsWindows -or $env:OS -eq "Windows_NT") {
    try { chcp 65001 | Out-Null } catch { }
}
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$env:JAVA_TOOL_OPTIONS = "-Dfile.encoding=UTF-8 -Dstdout.encoding=UTF-8 -Dstderr.encoding=UTF-8"
$env:PYTHONIOENCODING = "utf-8"

$envFile = Join-Path $PSScriptRoot "..\.env.local"
Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
        $name, $value = $line.Split("=", 2)
        [System.Environment]::SetEnvironmentVariable($name.Trim(), $value.Trim(), "Process")
    }
}
Write-Host ".env.local 로드 완료" -ForegroundColor Green
