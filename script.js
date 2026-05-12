let loggedUser = null;
let currentView = 'grid';
let isLoginMode = true;

window.onload = async () => {
    const res = await fetch('/check_session');
    const data = await res.json();
    if (data.logged_in) doLogin(data.username);
    else renderAuthArea();
};

function renderAuthArea() {
    const area = document.getElementById('authArea');
    area.innerHTML = loggedUser ? `<div class="user-badge fw-bold" onclick="openAccount()"><i class="fas fa-user-circle me-2"></i>Cont</div>` : `<button class="btn btn-warning fw-bold rounded-pill" onclick="toggleLogin(true)">Intră în Seif</button>`;
}

function toggleLogin(show) { document.getElementById('loginOverlay').classList.toggle('d-none', !show); }
function toggleAuthMode() {
    isLoginMode = !isLoginMode;
    document.getElementById('authTitle').innerText = isLoginMode ? "Autentificare" : "Creează Cont";
    document.getElementById('authSubmitBtn').innerText = isLoginMode ? "Intră" : "Înregistrare";
}

document.getElementById('authForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const user = document.getElementById('emailInput').value;
    const pass = document.getElementById('passwordInput').value;
    const res = await fetch(isLoginMode ? '/login' : '/register', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({username: user, password: pass})
    });
    const data = await res.json();
    if (res.ok) {
        if (isLoginMode) { doLogin(data.username); toggleLogin(false); }
        else { alert("Cont creat!"); toggleAuthMode(); }
    } else alert(data.message);
});

function doLogin(u) { loggedUser = u; document.getElementById('heroSection').classList.add('d-none'); document.getElementById('mainDashboard').classList.remove('d-none'); renderAuthArea(); fetchAndRender(); }

async function fetchAndRender() {
    const res = await fetch('/get_products');
    const data = await res.json();
    renderProducts(data);
}

function renderProducts(db) {
    const list = document.getElementById('productList');
    const search = document.getElementById('searchInput').value.toLowerCase();
    let filtered = db.filter(p => p.name.toLowerCase().includes(search) || p.model.toLowerCase().includes(search));

    filtered.forEach(p => {
        const exp = new Date(p.date); exp.setMonth(exp.getMonth() + parseInt(p.duration));
        const diff = Math.ceil((exp - new Date()) / 86400000);
        p.daysLeft = diff;
        if (diff <= 0) { p.prio = 1; p.color = 'bg-danger'; p.txt = 'Expirat'; }
        else if (diff <= 30) { p.prio = 2; p.color = 'bg-warning text-dark'; p.txt = 'Expiră curând'; }
        else { p.prio = 3; p.color = 'bg-success'; p.txt = 'Activ'; }
    });

    filtered.sort((a, b) => a.prio - b.prio);
    list.innerHTML = '';
    filtered.forEach(p => {
        const icon = p.name.toLowerCase().includes('tel') ? 'fa-mobile-alt' : (p.name.toLowerCase().includes('lap') ? 'fa-laptop' : 'fa-toolbox');
        const percent = Math.max(0, Math.min(100, (p.daysLeft / (p.duration * 30)) * 100));
        list.insertAdjacentHTML('beforeend', `
            <div class="col">
                <div class="card h-100 product-card p-3 border-0">
                    <div class="d-flex justify-content-between mb-3"><span class="badge ${p.color} rounded-pill">${p.txt}</span><small>${p.daysLeft > 0 ? p.daysLeft : 0} zile</small></div>
                    <h5 class="fw-bold mb-0">${p.name}</h5><p class="text-muted small">${p.model}</p>
                    <div class="warranty-progress-container"><div class="warranty-progress-bar" style="width: ${p.prio==1 ? 100 : percent}%; background: ${p.prio==1 ? '#ef4444' : (p.prio==2 ? '#ffc107' : '#22c55e')}"></div></div>
                    <div class="d-flex justify-content-between">
                        <button class="btn btn-dark btn-sm rounded-pill" onclick="window.open('https://www.google.com/search?q=${p.model}+manual+pdf')">Manual</button>
                        <div class="d-flex gap-2">
                            <button class="btn btn-outline-secondary btn-sm rounded-pill" onclick="prepareEdit(${p.id},'${p.name}','${p.model}','${p.date}',${p.duration})"><i class="fas fa-edit"></i></button>
                            <button class="btn btn-outline-danger btn-sm rounded-pill" onclick="deleteProd(${p.id})"><i class="fas fa-trash"></i></button>
                        </div>
                    </div>
                </div>
            </div>`);
    });
}

function prepareAdd() { document.getElementById('productForm').reset(); document.getElementById('editId').value = ''; }
function prepareEdit(id, n, m, d, dur) {
    document.getElementById('editId').value = id;
    document.getElementById('pName').value = n; document.getElementById('pModel').value = m;
    document.getElementById('pDate').value = d; document.getElementById('pDuration').value = dur;
    new bootstrap.Modal(document.getElementById('productModal')).show();
}

document.getElementById('productForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editId').value;
    const pData = { name: document.getElementById('pName').value, model: document.getElementById('pModel').value, date: document.getElementById('pDate').value, duration: document.getElementById('pDuration').value };
    await fetch(id ? '/edit_product' : '/add_product', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(id ? {...pData, id} : pData) });
    bootstrap.Modal.getInstance(document.getElementById('productModal')).hide(); fetchAndRender();
});

async function deleteProd(id) { if(confirm("Ștergi?")) { await fetch(`/delete_product/${id}`, {method: 'DELETE'}); fetchAndRender(); } }
async function doLogout() { await fetch('/logout'); location.reload(); }
function openAccount() { document.getElementById('userEmailDisplay').innerText = loggedUser; new bootstrap.Modal(document.getElementById('accountModal')).show(); }
function changeView(v) { currentView = v; fetchAndRender(); }