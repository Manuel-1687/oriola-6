<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Auth extends Controller
{
    private function api()
    {
        return $this->call->library('api');
    }

    private function database()
    {
        return $this->call->database();
    }

    private function issue_token(array $user)
    {
        return $this->api()->encode_jwt([
            'sub' => (int) $user['id'],
            'role' => $user['role'] ?? 'user',
        ]);
    }

    public function register()
    {
        $api = $this->api();
        $api->require_method('POST');
        $input = $api->body();

        $username = htmlspecialchars_decode(trim($input['username'] ?? ''), ENT_QUOTES);
        $email = filter_var(htmlspecialchars_decode(trim($input['email'] ?? ''), ENT_QUOTES), FILTER_VALIDATE_EMAIL);
        $password = $input['password'] ?? '';

        if ($username === '' || strlen($username) > 100 || !$email || strlen($password) < 8) {
            $api->respond_error('Enter a username, valid email, and password of at least 8 characters.', 422);
        }

        $db = $this->database();
        $existing = $db->raw('SELECT id FROM users WHERE username = ? OR email = ? LIMIT 1', [$username, $email])->fetch();
        if ($existing) {
            $api->respond_error('That username or email is already registered.', 409);
        }

        $db->raw(
            'INSERT INTO users (username, email, password, role, is_active) VALUES (?, ?, ?, ?, 1)',
            [$username, $email, password_hash($password, PASSWORD_DEFAULT), 'user']
        );
        $user = [
            'id' => (int) $db->raw('SELECT LAST_INSERT_ID() AS id')->fetch()['id'],
            'username' => $username,
            'email' => $email,
            'role' => 'user',
        ];

        $api->respond(['message' => 'Account created.', 'token' => $this->issue_token($user), 'user' => $user], 201);
    }

    public function login()
    {
        $api = $this->api();
        $api->require_method('POST');
        $input = $api->body();
        $identity = trim($input['email'] ?? '');
        $password = $input['password'] ?? '';

        if ($identity === '' || $password === '') {
            $api->respond_error('Email and password are required.', 422);
        }

        $user = $this->database()->raw(
            'SELECT id, username, email, password, role FROM users WHERE (email = ? OR username = ?) AND is_active = 1 LIMIT 1',
            [$identity, $identity]
        )->fetch();

        if (!$user || !password_verify($password, $user['password'])) {
            $api->respond_error('Invalid email or password.', 401);
        }

        unset($user['password']);
        $user['id'] = (int) $user['id'];
        $api->respond(['message' => 'Login successful.', 'token' => $this->issue_token($user), 'user' => $user]);
    }

    public function me()
    {
        $api = $this->api();
        $payload = $api->require_jwt();
        $user = $this->database()->raw(
            'SELECT id, username, email, role FROM users WHERE id = ? AND is_active = 1 LIMIT 1',
            [(int) $payload['sub']]
        )->fetch();

        if (!$user) {
            $api->respond_error('User not found.', 404);
        }

        $user['id'] = (int) $user['id'];
        $api->respond(['user' => $user]);
    }

    public function logout()
    {
        $api = $this->api();
        $api->require_jwt();
        $api->respond(['message' => 'Logged out. Remove the access token from the client.']);
    }
}