<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Api_options extends Controller
{
    public function index()
    {
        $this->call->library('api');
        http_response_code(204);
        exit;
    }
}