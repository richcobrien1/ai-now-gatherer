<#
Copies the template post text to the clipboard and opens the channel Posts page in the default browser.
Usage: run-from-repo-root: pwsh scripts\open-post-and-copy.ps1
#>
$template = Get-Content -Raw -Path "app\public\posts\post-template-lAIERNZphMc.txt"
Set-Clipboard -Value $template
Start-Process "https://www.youtube.com/channel/UCmwOvS8rhbbDYojNrar4g4g/posts"
Write-Output "Post template copied to clipboard. The Posts page should open in your browser. Paste into the Community composer and publish."
