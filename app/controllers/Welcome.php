<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Welcome extends Controller {
	public function index() {
		$frontend = ROOT_DIR . 'public' . DIRECTORY_SEPARATOR . 'index.html';
		if (is_file($frontend)) {
			header('Content-Type: text/html; charset=UTF-8');
			readfile($frontend);
			return;
		}

		$this->call->view('welcome_page');
	}
}
?>