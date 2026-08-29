import { execSync } from "node:child_process";
import fs from "node:fs";

const phpScript = `<?php
$_SERVER['REQUEST_METHOD'] = 'POST';
$_SERVER['REQUEST_URI'] = '/api/admin/sitemap/save';
$_SERVER['HTTP_HOST'] = 'taqigroup.com';

ob_start();
require 'build_php/api/index.php';
$output = ob_get_clean();

echo $output . "\\n";
`;

fs.writeFileSync("scripts/temp_sitemap_test.php", phpScript);
try {
  const res = execSync("php scripts/temp_sitemap_test.php", { cwd: "e:/Hawiat", encoding: "utf8" });
  console.log(res);
} finally {
  fs.unlinkSync("scripts/temp_sitemap_test.php");
}
