import { useEffect, useState } from 'react';
import {
  ArrowDownUp,
  Boxes,
  Check,
  ChevronDown,
  CircleAlert,
  LogOut,
  PackagePlus,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';

const configuredApiUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? window.location.origin : 'http://localhost:3000');
const API_URL = (configuredApiUrl.startsWith('http') ? configuredApiUrl : `https://${configuredApiUrl}`).replace(/\/$/, '');
const TOKEN_KEY = 'stockroom_access_token';
const emptyProduct = { product_name: '', description: '', price: '', quantity: '' };

async function request(path, { token, ...options } = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const payload = response.status === 204 ? {} : await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) localStorage.removeItem(TOKEN_KEY);
    throw new Error(payload.error || payload.message || `API error ${response.status}. Check the database connection, CA certificate, and schema.`);
  }
  return payload;
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(value));
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem(TOKEN_KEY)));
  const [error, setError] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ username: '', email: '', password: '' });
  const [authBusy, setAuthBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('newest');
  const [productForm, setProductForm] = useState(emptyProduct);
  const [editing, setEditing] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  async function loadProducts(activeToken = token) {
    const payload = await request('/api/products', { token: activeToken });
    setProducts(payload.data || []);
  }

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    let active = true;
    Promise.all([
      request('/api/auth/me', { token }),
      request('/api/products', { token }),
    ]).then(([profile, inventory]) => {
      if (!active) return;
      setUser(profile.user);
      setProducts(inventory.data || []);
      setError('');
    }).catch((cause) => {
      if (!active) return;
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
      setError(cause.message);
    }).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [token]);

  async function handleAuth(event) {
    event.preventDefault();
    setAuthBusy(true);
    setError('');
    try {
      const endpoint = authMode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload = await request(endpoint, {
        method: 'POST',
        body: JSON.stringify(authForm),
      });
      localStorage.setItem(TOKEN_KEY, payload.token);
      setUser(payload.user);
      setToken(payload.token);
      setLoading(true);
      setAuthForm({ username: '', email: '', password: '' });
    } catch (cause) {
      setError(cause.message);
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleLogout() {
    try {
      await request('/api/auth/logout', { method: 'POST', token });
    } catch {
      // The client still clears its local credential if the API is unreachable.
    }
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setProducts([]);
    setError('');
  }

  function openCreate() {
    setEditing(null);
    setProductForm(emptyProduct);
    setError('');
    setModalOpen(true);
  }

  function openEdit(product) {
    setEditing(product);
    setProductForm({
      product_name: product.product_name,
      description: product.description || '',
      price: product.price,
      quantity: product.quantity,
    });
    setError('');
    setModalOpen(true);
  }

  async function saveProduct(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    const isEditing = Boolean(editing);
    try {
      await request(isEditing ? `/api/products/${editing.id}` : '/api/products', {
        method: isEditing ? 'PUT' : 'POST',
        token,
        body: JSON.stringify({ ...productForm, price: Number(productForm.price), quantity: Number(productForm.quantity) }),
      });
      await loadProducts();
      setModalOpen(false);
      setProductForm(emptyProduct);
      setEditing(null);
    } catch (cause) {
      setError(cause.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(product) {
    if (!window.confirm(`Delete “${product.product_name}”? This cannot be undone.`)) return;
    setDeletingId(product.id);
    setError('');
    try {
      await request(`/api/products/${product.id}`, { method: 'DELETE', token });
      setProducts((current) => current.filter((item) => item.id !== product.id));
    } catch (cause) {
      setError(cause.message);
    } finally {
      setDeletingId(null);
    }
  }

  const visibleProducts = products
    .filter((product) => `${product.product_name} ${product.description || ''}`.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => sort === 'name'
      ? a.product_name.localeCompare(b.product_name)
      : sort === 'stock'
        ? Number(a.quantity) - Number(b.quantity)
        : Number(b.id) - Number(a.id));
  const totalUnits = products.reduce((sum, product) => sum + Number(product.quantity), 0);
  const stockValue = products.reduce((sum, product) => sum + Number(product.price) * Number(product.quantity), 0);
  const lowStock = products.filter((product) => Number(product.quantity) < 10).length;

  if (loading) {
    return <main className="loading-screen"><span className="loader" /><p>Opening your stockroom...</p></main>;
  }

  if (!token || !user) {
    return (
      <main className="auth-layout">
        <section className="auth-story">
          <div className="brand brand-light"><span className="brand-mark"><Boxes size={19} /></span> stockroom<span className="brand-period">.</span></div>
          <div className="story-copy">
            <p className="eyebrow">PRODUCT OPERATIONS / 06</p>
            <h1>Know what<br />you have.</h1>
            <p className="story-note">A calmer way to keep your products, quantities, and value in view.</p>
          </div>
          <div className="story-footer"><span>INVENTORY, IN GOOD ORDER</span><span>01 — 04</span></div>
          <div className="story-grid" aria-hidden="true" />
        </section>
        <section className="auth-panel">
          <div className="auth-mobile-brand brand"><span className="brand-mark"><Boxes size={19} /></span> stockroom<span className="brand-period">.</span></div>
          <div className="auth-box">
            <div className="auth-icon"><ShieldCheck size={22} /></div>
            <p className="eyebrow">YOUR INVENTORY DESK</p>
            <h2>{authMode === 'login' ? 'Welcome back.' : 'Create your account.'}</h2>
            <p className="auth-subtitle">{authMode === 'login' ? 'Sign in to pick up where you left off.' : 'Set up a secure account to manage your stock.'}</p>
            {error && <div className="notice notice-error"><CircleAlert size={17} />{error}</div>}
            <form className="auth-form" onSubmit={handleAuth}>
              {authMode === 'register' && <label>Username<input required maxLength="100" autoComplete="username" value={authForm.username} onChange={(event) => setAuthForm({ ...authForm, username: event.target.value })} placeholder="Your name" /></label>}
              <label>Email address<input required type="email" autoComplete="email" value={authForm.email} onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })} placeholder="you@example.com" /></label>
              <label>Password<input required type="password" minLength="8" autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} placeholder="At least 8 characters" /></label>
              <button className="button button-primary auth-submit" disabled={authBusy} type="submit">{authBusy ? 'Please wait...' : authMode === 'login' ? 'Sign in' : 'Create account'}<span aria-hidden="true">↗</span></button>
            </form>
            <p className="auth-switch">{authMode === 'login' ? 'New to Stockroom?' : 'Already have an account?'} <button onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setError(''); }} type="button">{authMode === 'login' ? 'Create account' : 'Sign in'}</button></p>
          </div>
          <p className="auth-legal">Secure access · LavaLust API</p>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#top"><span className="brand-mark"><Boxes size={19} /></span> stockroom<span className="brand-period">.</span></a>
        <div className="workspace-label">WORKSPACE</div>
        <button className="nav-item nav-item-active"><Boxes size={17} /><span>Products</span><span className="nav-count">{products.length}</span></button>
        <div className="sidebar-bottom"><div className="sidebar-divider" /><div className="user-card"><div className="avatar">{(user.username || user.email).slice(0, 1).toUpperCase()}</div><div className="user-meta"><strong>{user.username || user.email}</strong><span>{user.email}</span></div><button className="icon-button logout-button" title="Log out" aria-label="Log out" onClick={handleLogout}><LogOut size={17} /></button></div></div>
      </aside>

      <section className="main-area" id="top">
        <header className="topbar"><span>Workspace <span className="crumb-divider">/</span> Products</span><div className="topbar-right"><span className="live-dot" /> API connected <span className="topbar-separator" /><span>{new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' }).format(new Date())}</span></div></header>
        <div className="content-wrap">
          <div className="page-heading"><div><p className="eyebrow">INVENTORY OVERVIEW</p><h1>Products <span className="heading-count">{String(products.length).padStart(2, '0')}</span></h1><p className="page-intro">The full picture of what is on your shelves.</p></div><button className="button button-primary add-button" onClick={openCreate}><Plus size={17} /> Add product</button></div>

          {error && <div className="notice notice-error page-notice"><CircleAlert size={17} />{error}<button className="notice-dismiss" onClick={() => setError('')} aria-label="Dismiss"><X size={16} /></button></div>}

          <section className="metric-grid" aria-label="Inventory summary">
            <article className="metric"><div className="metric-top"><span>PRODUCTS</span><span className="metric-symbol"><Boxes size={16} /></span></div><strong>{products.length.toLocaleString()}</strong><p>Unique items in your catalog</p></article>
            <article className="metric"><div className="metric-top"><span>UNITS IN STOCK</span><span className="metric-symbol metric-green"><PackagePlus size={16} /></span></div><strong>{totalUnits.toLocaleString()}</strong><p>Across all listed products</p></article>
            <article className="metric"><div className="metric-top"><span>STOCK VALUE</span><span className="metric-symbol metric-coral">₱</span></div><strong>{formatCurrency(stockValue)}</strong><p>Based on current quantities</p></article>
            <article className="metric"><div className="metric-top"><span>LOW STOCK</span><span className="metric-symbol metric-amber"><CircleAlert size={16} /></span></div><strong>{String(lowStock).padStart(2, '0')}</strong><p>Products under 10 units</p></article>
          </section>

          <section className="inventory-section">
            <div className="section-heading"><div><h2>All products</h2><p>Manage details and keep stock levels current.</p></div><span className="records-label">{visibleProducts.length} RECORD{visibleProducts.length === 1 ? '' : 'S'}</span></div>
            <div className="table-toolbar"><label className="search-box"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products..." /><kbd>⌘ K</kbd></label><label className="sort-control"><ArrowDownUp size={15} /><select aria-label="Sort products" value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Recently added</option><option value="name">Name A to Z</option><option value="stock">Stock quantity</option></select><ChevronDown size={14} /></label></div>
            <div className="table-scroll"><table><thead><tr><th>PRODUCT</th><th>UNIT PRICE</th><th>QUANTITY</th><th>STOCK STATUS</th><th>ADDED</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>
              {visibleProducts.map((product) => <tr key={product.id}>
                <td><div className="product-cell"><div className="product-thumb">{product.product_name.slice(0, 1).toUpperCase()}</div><div><strong>{product.product_name}</strong><span>{product.description || 'No description'}</span></div></div></td>
                <td className="price-cell">{formatCurrency(product.price)}</td>
                <td><span className="quantity-cell">{Number(product.quantity).toLocaleString()} <small>units</small></span></td>
                <td><span className={`stock-badge ${Number(product.quantity) < 10 ? 'stock-low' : 'stock-good'}`}><span />{Number(product.quantity) < 10 ? 'Low stock' : 'In stock'}</span></td>
                <td className="date-cell">{product.created_at ? new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium' }).format(new Date(product.created_at.replace(' ', 'T'))) : '—'}</td>
                <td><div className="row-actions"><button className="icon-button" title="Edit product" aria-label={`Edit ${product.product_name}`} onClick={() => openEdit(product)}><Pencil size={16} /></button><button className="icon-button danger-button" title="Delete product" aria-label={`Delete ${product.product_name}`} disabled={deletingId === product.id} onClick={() => deleteProduct(product)}><Trash2 size={16} /></button></div></td>
              </tr>)}
            </tbody></table></div>
            {visibleProducts.length === 0 && <div className="empty-state"><div className="empty-icon"><Boxes size={22} /></div><h3>{search ? 'No matching products' : 'Your inventory starts here'}</h3><p>{search ? 'Try another name or clear the search.' : 'Add your first product to start tracking stock.'}</p>{!search && <button className="button button-secondary" onClick={openCreate}><Plus size={16} /> Add first product</button>}</div>}
            <footer className="table-footer"><span>Showing <strong>{visibleProducts.length}</strong> of <strong>{products.length}</strong> products</span><span className="table-footer-right"><Check size={14} /> Changes sync automatically</span></footer>
          </section>
          <footer className="page-footer"><span>STOCKROOM / PRODUCT MANAGEMENT</span><span>BUILT FOR CLEARER INVENTORY</span></footer>
        </div>
      </section>

      {modalOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setModalOpen(false)}><section className="product-modal" role="dialog" aria-modal="true" aria-labelledby="product-modal-title"><header className="modal-header"><div><p className="eyebrow">PRODUCT DETAILS</p><h2 id="product-modal-title">{editing ? 'Edit product' : 'Add a product'}</h2></div><button className="icon-button modal-close" onClick={() => setModalOpen(false)} aria-label="Close"><X size={19} /></button></header><form className="product-form" onSubmit={saveProduct}><label>Product name<input autoFocus required maxLength="100" value={productForm.product_name} onChange={(event) => setProductForm({ ...productForm, product_name: event.target.value })} placeholder="e.g. Canvas tote bag" /></label><label>Description <span className="optional-label">OPTIONAL</span><textarea rows="3" value={productForm.description} onChange={(event) => setProductForm({ ...productForm, description: event.target.value })} placeholder="A short description of this product" /></label><div className="form-row"><label>Unit price<input required min="0" step="0.01" type="number" value={productForm.price} onChange={(event) => setProductForm({ ...productForm, price: event.target.value })} placeholder="0.00" /></label><label>Quantity<input required min="0" step="1" type="number" value={productForm.quantity} onChange={(event) => setProductForm({ ...productForm, quantity: event.target.value })} placeholder="0" /></label></div>{error && <div className="notice notice-error"><CircleAlert size={17} />{error}</div>}<footer className="modal-actions"><button className="button button-quiet" type="button" onClick={() => { setModalOpen(false); setError(''); }}>Cancel</button><button className="button button-primary" disabled={saving} type="submit">{saving ? 'Saving...' : editing ? 'Save changes' : 'Add product'}</button></footer></form></section></div>}
    </main>
  );
}

export default App;