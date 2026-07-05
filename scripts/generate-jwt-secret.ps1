# Generate JWT_SECRET on Windows (openssl not required)
$bytes = New-Object byte[] 48
[System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$secret = [Convert]::ToBase64String($bytes)
Write-Host "JWT_SECRET=$secret" -ForegroundColor Green
Write-Host ""
Write-Host "Copy the line above into .env (local) or server .env" -ForegroundColor Cyan
