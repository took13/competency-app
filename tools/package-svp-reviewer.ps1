param([Parameter(Mandatory=$true)][string]$BaselineZip,[Parameter(Mandatory=$true)][string]$CandidateJson,[Parameter(Mandatory=$true)][string]$OutputZip)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$candidate=Get-Content -LiteralPath $CandidateJson -Raw | ConvertFrom-Json -AsHashtable
$inputZip=[IO.Compression.ZipFile]::OpenRead((Resolve-Path -LiteralPath $BaselineZip))
try {
 $entries=@{}
 foreach($entry in $inputZip.Entries){$reader=[IO.StreamReader]::new($entry.Open());try{$entries[$entry.FullName]=$reader.ReadToEnd()}finally{$reader.Dispose()}}
}finally{$inputZip.Dispose()}
$manifest=$entries['manifest.json'] | ConvertFrom-Json -AsHashtable
$oldIds=@($manifest.resources.Keys | Where-Object {$manifest.resources[$_].type -eq 'Microsoft.Flow/flows'})
if($oldIds.Count -ne 1){throw 'Expected exactly one baseline flow'}
$oldId=$oldIds[0];$newId=$candidate.name
if($newId -eq $oldId){throw 'Candidate must have a separate identity'}
if($candidate.properties.displayName -ne 'Competency_SVP_Assigned_Reviewer_API_v1'){throw 'Wrong candidate'}
$resource=$manifest.resources[$oldId];$manifest.resources.Remove($oldId)
$resource.suggestedCreationType='New';$resource.creationType='New';$resource.details.displayName=$candidate.properties.displayName
$apiMap=$entries["Microsoft.Flow/flows/$oldId/apisMap.json"] | ConvertFrom-Json -AsHashtable
$connectionMap=$entries["Microsoft.Flow/flows/$oldId/connectionsMap.json"] | ConvertFrom-Json -AsHashtable
$keep=@($apiMap.Values)+@($connectionMap.Values)
$resource.dependsOn=$keep;$manifest.resources[$newId]=$resource
foreach($key in @($manifest.resources.Keys)){if($key -ne $newId -and $key -notin $keep){$manifest.resources.Remove($key)}}
$manifest.details.displayName=$candidate.properties.displayName
$manifest.details.description='Assigned SVP reviewer. NEW flow only. Approval required before import/enable; no Manager replacement.'
$manifest.details.createdTime=[DateTime]::UtcNow.ToString('o')
$payloads=@{
 'manifest.json'=($manifest | ConvertTo-Json -Depth 100 -Compress)
 'Microsoft.Flow/flows/manifest.json'=(@{packageSchemaVersion='1.0';flowAssets=@{assetPaths=@($newId)}} | ConvertTo-Json -Depth 10 -Compress)
 "Microsoft.Flow/flows/$newId/definition.json"=($candidate | ConvertTo-Json -Depth 100 -Compress)
 "Microsoft.Flow/flows/$newId/apisMap.json"=($apiMap | ConvertTo-Json -Compress)
 "Microsoft.Flow/flows/$newId/connectionsMap.json"=($connectionMap | ConvertTo-Json -Compress)
}
$target=[IO.Path]::GetFullPath($OutputZip)
if(Test-Path -LiteralPath $target){throw 'Output already exists; choose a fresh filename'}
$output=[IO.Compression.ZipFile]::Open($target,[IO.Compression.ZipArchiveMode]::Create)
try{foreach($name in $payloads.Keys){$entry=$output.CreateEntry($name);$writer=[IO.StreamWriter]::new($entry.Open(),[Text.UTF8Encoding]::new($false));try{$writer.Write($payloads[$name])}finally{$writer.Dispose()}}}finally{$output.Dispose()}
Write-Output 'Prepared NEW standalone import package; not imported or enabled.'
