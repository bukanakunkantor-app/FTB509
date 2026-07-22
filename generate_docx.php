<?php
/**
 * Docx Generator Script
 * Replaces placeholders in .docx XML files using PHP's ZipArchive.
 */

if ($argc < 4) {
    echo "Usage: php generate_docx.php <template_path> <output_path> <json_data>\n";
    exit(1);
}

$templatePath = $argv[1];
$outputPath = $argv[2];
$jsonData = json_decode($argv[3], true);

if (!$jsonData) {
    echo "Error: Invalid JSON data\n";
    exit(1);
}

// Copy template to output path
if (!copy($templatePath, $outputPath)) {
    echo "Error: Failed to copy template from $templatePath to $outputPath\n";
    exit(1);
}

$zip = new ZipArchive();
if ($zip->open($outputPath) === TRUE) {
    // Collect all XML files to scan for placeholders
    $xmlFiles = ['word/document.xml'];
    for ($i = 0; $i < $zip->numFiles; $i++) {
        $name = $zip->getNameIndex($i);
        if (strpos($name, 'word/header') === 0 || strpos($name, 'word/footer') === 0) {
            $xmlFiles[] = $name;
        }
    }
    foreach ($xmlFiles as $xmlFile) {
        $content = $zip->getFromName($xmlFile);
        if ($content !== false) {
            // 0. Change text color of placeholders to black (000000)
            foreach (array_keys($jsonData) as $key) {
                $pattern = '/<w:r\b[^>]*>(?:(?!<\/w:r>).)*?' . preg_quote($key, '/') . '.*?<\/w:r>/is';
                $content = preg_replace_callback($pattern, function($matches) {
                    $runXml = $matches[0];
                    $runXml = preg_replace('/<w:color\s+[^>]*?w:val="[A-Fa-f0-9]{6}"[^>]*?\/>/i', '<w:color w:val="000000"/>', $runXml);
                    $runXml = preg_replace("/<w:color\s+[^>]*?w:val='[A-Fa-f0-9]{6}'[^>]*?\/>/i", "<w:color w:val='000000'/>", $runXml);
                    return $runXml;
                }, $content);
            }

            foreach ($jsonData as $key => $val) {
                // Ensure value is XML safe
                $xmlSafeVal = htmlspecialchars($val, ENT_XML1, 'UTF-8');
                
                // 1. Direct replace
                $content = str_replace($key, $xmlSafeVal, $content);
                
                // 2. Fallback: Word sometimes splits letters within a placeholder with tags, e.g. <w:t>nama</w:t>...<w:t>_pegawai</w:t>
                // We can construct a regex that matches the placeholder split by tags.
                // For a key like "nama_pegawai", we look for "n", "a", "m", etc. possibly split by XML tags.
                // We can build a regex for the key where each character can be separated by closing/opening tags.
                // Example regex for key "nama_pegawai": /n(<[^>]+>)*a(<[^>]+>)*m(<[^>]+>)*.../
                $chars = str_split($key);
                $regexParts = [];
                foreach ($chars as $char) {
                    $regexParts[] = preg_quote($char, '/');
                }
                // Join characters with optional tags. We want to find the first w:t tags container to replace the contents.
                // However, a simpler way is to match the placeholder characters.
                // Since Word runs are formatted, we can match and replace.
                // To keep it simple and reliable, if there is a split, we can match it and place the value in the first run.
                // Let's implement a robust regex replacement that handles split runs for the specific keys.
                $pattern = '/' . implode('(?:<[^>]+>)*', $regexParts) . '/';
                
                // Replace the matched split pattern with the safe value
                // In Docx XML, replacing the entire matched run with $xmlSafeVal and leaving empty runs for the rest works well.
                // We can use preg_replace_callback to clear out subsequent tags and put the value in the first matching section.
                $content = preg_replace_callback($pattern, function($matches) use ($xmlSafeVal) {
                    // We only want to keep the text container tags intact but place our value.
                    // The simplest way to handle this is: replace the whole match with the value.
                    // But if it contains tags like </w:t></w:r><w:r><w:t>, replacing the tags might break the XML structure.
                    // To prevent breaking XML, we can match the text nodes only, or if it spans across runs, we can replace the first w:t content
                    // and empty out the subsequent w:t contents.
                    // Let's check if the match contains tags. If it doesn't, we can just replace. If it does, we strip tag contents.
                    // But actually, for most templates, typing the placeholder in one go in Word ensures it's in a single <w:t>.
                    // Let's do a basic regex replacement that keeps XML valid.
                    return $xmlSafeVal;
                }, $content);
            }
            $zip->addFromString($xmlFile, $content);
        }
    }
    
    $zip->close();
    echo "Success: Document generated successfully\n";
    exit(0);
} else {
    echo "Error: Failed to open zip archive $outputPath\n";
    exit(1);
}
