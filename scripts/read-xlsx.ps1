param([string]$Path, [string]$OutJson)

Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = [System.IO.Compression.ZipFile]::OpenRead($Path)

$sst = @()
$ssEntry = $archive.Entries | Where-Object { $_.FullName -eq 'xl/sharedStrings.xml' }
if ($ssEntry) {
    $stream = $ssEntry.Open()
    $reader = New-Object System.IO.StreamReader($stream)
    [xml]$xml = $reader.ReadToEnd()
    $reader.Close()
    $stream.Close()
    foreach ($si in $xml.sst.si) {
        if ($null -ne $si.t) {
            $sst += $si.t
        } elseif ($null -ne $si.r) {
            $parts = ($si.r | ForEach-Object { if ($_.t) { $_.t } else { '' } }) -join ''
            $sst += $parts
        } else {
            $sst += ''
        }
    }
}

$sheetEntry = $archive.Entries | Where-Object { $_.FullName -like 'xl/worksheets/sheet*.xml' } | Select-Object -First 1
$stream2 = $sheetEntry.Open()
$reader2 = New-Object System.IO.StreamReader($stream2)
[xml]$sheetXml = $reader2.ReadToEnd()
$reader2.Close()
$stream2.Close()
$archive.Dispose()

$rows = $sheetXml.worksheet.sheetData.row

function ColIndex($colStr) {
    $num = 0
    for ($i = 0; $i -lt $colStr.Length; $i++) {
        $num = $num * 26 + ([int][char]$colStr[$i] - 64)
    }
    return $num - 1
}

# Parse header
$headers = @()
$maxCol = 0
foreach ($c in $rows[0].c) {
    $colLetters = $c.r -replace '\d+',''
    $colIdx = ColIndex $colLetters
    if ($colIdx -gt $maxCol) { $maxCol = $colIdx }
    $v = if ($c.v) { $c.v } else { '' }
    if ($c.t -eq 's' -and $v -ne '') {
        $v = $sst[[int]$v]
    }
    while ($headers.Count -le $colIdx) { $headers += '' }
    $headers[$colIdx] = $v.Trim()
}

Write-Host "Found $($headers.Count) headers: $($headers -join ', ')"

$records = @()
for ($i = 1; $i -lt $rows.Count; $i++) {
    $r = $rows[$i]
    $rowObj = [ordered]@{}
    $hasData = $false
    
    # Initialize all headers
    for ($h = 0; $h -lt $headers.Count; $h++) {
        $headerName = $headers[$h]
        if ($headerName -ne '') {
            $rowObj[$headerName] = ''
        }
    }
    
    foreach ($c in $r.c) {
        $colLetters = $c.r -replace '\d+',''
        $colIdx = ColIndex $colLetters
        $headerName = if ($colIdx -lt $headers.Count) { $headers[$colIdx] } else { '' }
        if ($headerName -eq '') { continue }
        
        $v = if ($c.v) { $c.v } else { '' }
        if ($c.t -eq 's' -and $v -ne '') {
            $v = $sst[[int]$v]
        }
        $rowObj[$headerName] = $v.Trim()
        if ($v.Trim() -ne '') { $hasData = $true }
    }
    
    # Check if this row is meaningful (has name or tipo)
    if ($hasData -and ($rowObj['Nome'] -or $rowObj['Tipo'])) {
        $records += [PSCustomObject]$rowObj
    }
}

Write-Host "Parsed $($records.Count) non-empty records."

if ($OutJson) {
    $records | ConvertTo-Json -Depth 5 | Set-Content -Path $OutJson -Encoding UTF8
    Write-Host "Saved JSON to $OutJson"
}
