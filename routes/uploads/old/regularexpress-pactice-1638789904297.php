<?php

$inputstrVal= '<strong>asdasjdh</strong>';
$matches = [];


preg_match_all("/<.+?>/",  $inputstrVal, $matches);

foreach($matches as $m) {
  foreach($m as $x) {
    echo htmlspecialchars($x, ENT_QUOTES) . '<br>';
  }
}

?>