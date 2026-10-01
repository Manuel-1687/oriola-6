<?php
defined('PREVENT_DIRECT_ACCESS') OR exit('No direct script access allowed');

class Products extends Controller
{
    private function api()
    {
        return $this->call->library('api');
    }

    private function database()
    {
        return $this->call->database();
    }

    private function authorize()
    {
        return $this->api()->require_jwt();
    }

    private function product_input(array $input, bool $partial = false)
    {
        $fields = ['product_name', 'description', 'price', 'quantity'];
        $data = array_intersect_key($input, array_flip($fields));

        foreach (['product_name', 'description'] as $field) {
            if (isset($data[$field])) {
                $data[$field] = htmlspecialchars_decode($data[$field], ENT_QUOTES);
            }
        }

        if ((!$partial || array_key_exists('product_name', $data)) &&
            (!isset($data['product_name']) || $data['product_name'] === '' || strlen($data['product_name']) > 100)) {
            $this->api()->respond_error('Product name is required and must be 100 characters or fewer.', 422);
        }
        if (isset($data['description']) && strlen($data['description']) > 10000) {
            $this->api()->respond_error('Description is too long.', 422);
        }
        if ((!$partial || array_key_exists('price', $data)) &&
            (!isset($data['price']) || !is_numeric($data['price']) || (float) $data['price'] < 0)) {
            $this->api()->respond_error('Price must be a non-negative number.', 422);
        }
        if ((!$partial || array_key_exists('quantity', $data)) &&
            (!isset($data['quantity']) || filter_var($data['quantity'], FILTER_VALIDATE_INT) === false || (int) $data['quantity'] < 0)) {
            $this->api()->respond_error('Quantity must be a non-negative integer.', 422);
        }

        if (isset($data['price'])) {
            $data['price'] = number_format((float) $data['price'], 2, '.', '');
        }
        if (isset($data['quantity'])) {
            $data['quantity'] = (int) $data['quantity'];
        }
        return $data;
    }

    public function index()
    {
        $this->authorize();
        $products = $this->database()->raw(
            'SELECT id, product_name, description, price, quantity, created_at FROM products ORDER BY created_at DESC, id DESC'
        )->fetchAll();
        $this->api()->respond(['data' => $products]);
    }

    public function show($id)
    {
        $this->authorize();
        $product = $this->database()->raw(
            'SELECT id, product_name, description, price, quantity, created_at FROM products WHERE id = ? LIMIT 1',
            [(int) $id]
        )->fetch();

        if (!$product) {
            $this->api()->respond_error('Product not found.', 404);
        }
        $this->api()->respond(['data' => $product]);
    }

    public function store()
    {
        $api = $this->api();
        $this->authorize();
        $api->require_method('POST');
        $data = $this->product_input($api->body());

        $this->database()->raw(
            'INSERT INTO products (product_name, description, price, quantity) VALUES (?, ?, ?, ?)',
            [$data['product_name'], $data['description'] ?? '', $data['price'], $data['quantity']]
        );
        $product = $this->database()->raw(
            'SELECT id, product_name, description, price, quantity, created_at FROM products WHERE id = LAST_INSERT_ID()'
        )->fetch();
        $api->respond(['message' => 'Product created.', 'data' => $product], 201);
    }

    public function update($id)
    {
        $api = $this->api();
        $this->authorize();
        if (!in_array($_SERVER['REQUEST_METHOD'], ['PUT', 'PATCH'], true)) {
            $api->respond_error('Method Not Allowed.', 405);
        }

        $data = $this->product_input($api->body(), $_SERVER['REQUEST_METHOD'] === 'PATCH');
        if (!$data) {
            $api->respond_error('Provide at least one product field to update.', 422);
        }

        $existing = $this->database()->raw('SELECT id FROM products WHERE id = ? LIMIT 1', [(int) $id])->fetch();
        if (!$existing) {
            $api->respond_error('Product not found.', 404);
        }

        $sets = [];
        $values = [];
        foreach ($data as $field => $value) {
            $sets[] = "`{$field}` = ?";
            $values[] = $value;
        }
        $values[] = (int) $id;
        $this->database()->raw('UPDATE products SET ' . implode(', ', $sets) . ' WHERE id = ?', $values);
        $product = $this->database()->raw(
            'SELECT id, product_name, description, price, quantity, created_at FROM products WHERE id = ? LIMIT 1',
            [(int) $id]
        )->fetch();
        $api->respond(['message' => 'Product updated.', 'data' => $product]);
    }

    public function delete($id)
    {
        $api = $this->api();
        $this->authorize();
        $api->require_method('DELETE');
        $deleted = $this->database()->raw('DELETE FROM products WHERE id = ?', [(int) $id]);

        if ($deleted->rowCount() === 0) {
            $api->respond_error('Product not found.', 404);
        }
        $api->respond(['message' => 'Product deleted.']);
    }
}