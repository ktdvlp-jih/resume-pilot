# UTF-8 통일
chcp 65001 | Out-Null
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$env:JAVA_TOOL_OPTIONS = "-Dfile.encoding=UTF-8 -Dstdout.encoding=UTF-8 -Dstderr.encoding=UTF-8"
$env:PYTHONIOENCODING = "utf-8"

# .env.local → 세션 환경변수. 사용: . .\scripts\load-env-local.ps1
$envFile = Join-Path $PSScriptRoot "..\.env.local"
Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
        $name, $value = $line.Split("=", 2)
        [System.Environment]::SetEnvironmentVariable($name.Trim(), $value.Trim(), "Process")
    }
}
Write-Host ".env.local 로드 완료" -ForegroundColor Green
