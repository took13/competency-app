param([Parameter(Mandatory=$true)][string]$BaselineZip,[Parameter(Mandatory=$true)][string]$CandidateJson,[Parameter(Mandatory=$true)][string]$OutputZip)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$expected='d829f46f-7419-4639-b365-061551c26435'
$candidate=Get-Content -LiteralPath $CandidateJson -Raw|ConvertFrom-Json -AsHashtable
if($candidate.name -ne $expected -or $candidate.properties.displayName -ne 'Competency_Official_TEST_Assignment_API_v1'){throw 'Only the isolated TEST flow may be updated'}
$candidate.properties.connectionReferences.Remove('shared_office365')
$z=[IO.Compression.ZipFile]::OpenRead((Resolve-Path -LiteralPath $BaselineZip));$entries=@{}
try{foreach($e in $z.Entries){$r=[IO.StreamReader]::new($e.Open());try{$entries[$e.FullName]=$r.ReadToEnd()}finally{$r.Dispose()}}}finally{$z.Dispose()}
$manifest=$entries['manifest.json']|ConvertFrom-Json -AsHashtable
$flows=@($manifest.resources.Keys|Where-Object {$manifest.resources[$_].type -eq 'Microsoft.Flow/flows'})
if($flows.Count -ne 1){throw 'Expected one exported flow asset'}
$asset=$flows[0]
$baseline=$entries["Microsoft.Flow/flows/$asset/definition.json"]|ConvertFrom-Json -AsHashtable
if($baseline.name -ne $expected -or $baseline.properties.displayName -ne $candidate.properties.displayName){throw 'Baseline must be exported from the exact isolated TEST flow'}
$manifest.resources[$asset].suggestedCreationType='Update'
$manifest.resources[$asset].creationType='Update'
$manifest.details.displayName='Official TEST ADHOC isolation restriction'
$entries['manifest.json']=$manifest|ConvertTo-Json -Depth 100 -Compress
$entries["Microsoft.Flow/flows/$asset/definition.json"]=$candidate|ConvertTo-Json -Depth 100 -Compress
if(Test-Path -LiteralPath $OutputZip){throw 'Choose a new output filename; preserve previous packages'}
$output=[IO.Compression.ZipFile]::Open((Join-Path (Get-Location) $OutputZip),[IO.Compression.ZipArchiveMode]::Create)
try{foreach($name in $entries.Keys){$e=$output.CreateEntry($name);$w=[IO.StreamWriter]::new($e.Open());try{$w.Write($entries[$name])}finally{$w.Dispose()}}}finally{$output.Dispose()}
$candidate|ConvertTo-Json -Depth 100|Set-Content -LiteralPath $CandidateJson -Encoding utf8
Write-Output 'Prepared Update-only package for exact isolated TEST flow; original Assignment untouched.'
