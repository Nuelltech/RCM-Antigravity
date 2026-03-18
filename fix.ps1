$path = "e:\Nuelltech\Restaurante Cost Manager\RCM\Gemini\antigravity\app\frontend-internal\src\app\scrapers\page.tsx"
$content = [IO.File]::ReadAllText($path)
$content = $content.Replace('\`', '`').Replace('\$', '$')
[IO.File]::WriteAllText($path, $content)
Write-Host "Fixed backslashes using PowerShell!"
