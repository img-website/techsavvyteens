# Dev-only: split index.html into one file per section so each renders at the
# top of the viewport and can actually be looked at. Not part of the site.
Set-Location "D:\html\techsavvyteens"
$c = [System.IO.File]::ReadAllText("$PWD\index.html")
$head = [regex]::Match($c, '(?s)<head>.*?</head>').Value
$sections = [regex]::Matches($c, '(?s)<section[^>]*>.*?(?=<section|</main>)')
$i = 0
foreach ($s in $sections) {
    $body = $s.Value
    $h2raw = [regex]::Match($body, '<h[12][^>]*>(.*?)</h[12]>').Groups[1].Value
    $h2 = [regex]::Replace($h2raw, '<[^>]+>', '')
    $h2 = [regex]::Replace($h2, '\s+', ' ').Trim()

    $fixedHead = [regex]::Replace($head, '(href|src)="assets/', '$1="../assets/')
    $fixedBody = [regex]::Replace($body, '(href|src)="assets/', '$1="../assets/')
    # reveal everything up front so a screenshot isn't a half-played animation
    $fixedBody = [regex]::Replace($fixedBody, 'data-reveal(?![-a-z])', 'data-reveal data-revealed')

    $page = '<!DOCTYPE html><html lang="en" class="js">' + $fixedHead +
            '<body class="bg-surface font-sans text-ink antialiased"><main>' +
            $fixedBody + '</main></body></html>'

    $name = "s{0:D2}.html" -f $i
    [System.IO.File]::WriteAllText("$PWD\_look\$name", $page, (New-Object System.Text.UTF8Encoding $false))
    $label = if ($h2) { $h2.Substring(0, [Math]::Min(34, $h2.Length)) } else { 'hero' }
    Write-Output ("  {0}  {1}" -f $name, $label)
    $i++
}
Write-Output "$i sections"
