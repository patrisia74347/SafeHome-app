from flask import Flask, render_template, request, jsonify, session
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_mail import Mail, Message
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = 'safehome_full_v3_2026'
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///safehome.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# CONFIGURARE EMAIL (Datele tale din screenshot)
app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = 'adresa de mail aici'
app.config['MAIL_PASSWORD'] = 'parola de mail aici'
app.config['MAIL_DEFAULT_SENDER'] = ('SafeHome Security', 'adresa de mail aici  ')

db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
mail = Mail(app)

# MODELE BAZA DE DATE
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    products = db.relationship('Product', backref='owner', lazy=True, cascade="all, delete-orphan")

class Product(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    model = db.Column(db.String(100), nullable=False)
    purchase_date = db.Column(db.String(20), nullable=False)
    duration = db.Column(db.Integer, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

@app.route('/')
def index(): return render_template('index.html')

@app.route('/check_session')
def check(): return jsonify({"logged_in": 'user_id' in session, "username": session.get('username')})

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    if User.query.filter_by(username=data['username']).first(): 
        return jsonify({"message": "Utilizator existent"}), 400
    hashed_pw = bcrypt.generate_password_hash(data['password']).decode('utf-8')
    new_user = User(username=data['username'], password=hashed_pw)
    db.session.add(new_user)
    db.session.commit()
    
    # Trimitere Mail Bun Venit
    try:
        msg = Message("Bun venit la SafeHome!", recipients=[data['username']])
        msg.body = f"Salut! Contul tău SafeHome a fost creat. Garanțiile tale sunt acum în siguranță."
        mail.send(msg)
    except Exception as e: print(f"Eroare mail: {e}")
    
    return jsonify({"ok": True})

@app.route('/login', methods=['POST'])
def login():
    data = request.json
    user = User.query.filter_by(username=data['username']).first()
    if user and bcrypt.check_password_hash(user.password, data['password']):
        session['user_id'] = user.id
        session['username'] = user.username
        return jsonify({"username": user.username})
    return jsonify({"message": "Date incorecte"}), 401

@app.route('/logout')
def logout(): session.clear(); return jsonify({"ok": True})

@app.route('/get_products')
def get_prods():
    if 'user_id' not in session: return jsonify([])
    prods = Product.query.filter_by(user_id=session['user_id']).all()
    return jsonify([{"id": p.id, "name": p.name, "model": p.model, "date": p.purchase_date, "duration": p.duration} for p in prods])

@app.route('/add_product', methods=['POST'])
def add():
    data = request.json
    new_p = Product(name=data['name'], model=data['model'], purchase_date=data['date'], duration=int(data['duration']), user_id=session['user_id'])
    db.session.add(new_p)
    db.session.commit()
    
    # Trimitere Mail Produs Nou
    try:
        user = User.query.get(session['user_id'])
        msg = Message(f"Produs salvat: {data['name']}", recipients=[user.username])
        msg.body = f"Ai salvat cu succes {data['name']}. Te vom notifica înainte să expire garanția!"
        mail.send(msg)
    except Exception as e: print(f"Eroare mail: {e}")
    
    return jsonify({"ok": True})

@app.route('/edit_product', methods=['POST'])
def edit():
    data = request.json
    p = Product.query.get(data['id'])
    if p and p.user_id == session['user_id']:
        p.name, p.model, p.purchase_date, p.duration = data['name'], data['model'], data['date'], int(data['duration'])
        db.session.commit()
        return jsonify({"ok": True})
    return jsonify({"message": "Eroare"}), 400

@app.route('/delete_product/<int:id>', methods=['DELETE'])
def delete(id):
    p = Product.query.get(id)
    if p and p.user_id == session['user_id']:
        db.session.delete(p)
        db.session.commit()
        return jsonify({"ok": True})
    return jsonify({"message": "Eroare"}), 400

@app.route('/delete_account', methods=['POST'])
def del_acc():
    user = User.query.get(session['user_id'])
    db.session.delete(user)
    db.session.commit()
    session.clear()
    return jsonify({"ok": True})

if __name__ == '__main__':
    with app.app_context(): db.create_all()
    app.run(debug=True)